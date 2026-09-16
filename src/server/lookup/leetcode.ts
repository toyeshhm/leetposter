import { z } from "zod";
import { GameError } from "@/game/errors";
import type { Problem } from "@/game/types";
import { log } from "@/server/log";
import { assess } from "@/server/parse/leetcode";
import type { ParsedProblem } from "@/server/parse/types";
import { acRateFrom, estimateRating } from "@/server/rating/estimate";
import { lookupZerotrac } from "@/server/rating/zerotrac";
import { htmlToText, splitContent } from "./html";

/** What a lookup turns into: the parser's shape plus the problem's LeetCode number. */
export interface LeetCodeLookup extends ParsedProblem {
  number: string;
}

/** LeetCode's own (undocumented) GraphQL endpoint; the same one its problem pages call. Unauthenticated reads work as of 2026-09-13. */
const ENDPOINT = "https://leetcode.com/graphql";
const TIMEOUT_MS = 15_000;
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const SEARCH = `query s($f:QuestionListFilterInput){questionList(categorySlug:"", limit:5, skip:0, filters:$f){data{questionFrontendId title titleSlug}}}`;
const DETAIL = `query q($slug:String!){question(titleSlug:$slug){questionFrontendId title titleSlug difficulty stats content hints topicTags{name}}}`;
const PROBLEM_URL = /leetcode\.com\/problems\/([a-z0-9-]+)/i;

const hit = z.object({ questionFrontendId: z.string(), title: z.string(), titleSlug: z.string() });
const searchReply = z.object({ data: z.object({ questionList: z.object({ data: z.array(hit) }) }) });
const detailReply = z.object({
  data: z.object({
    // `question` is null for an unknown slug; `content` is null when the problem sits behind the paywall.
    question: hit
      .extend({ difficulty: z.string(), stats: z.string(), content: z.string().nullable(), hints: z.array(z.string()), topicTags: z.array(z.object({ name: z.string() })) })
      .nullable(),
  }),
});

/** One GraphQL call. No answer, a non-200, a Cloudflare challenge page or a body of the wrong shape: "upstream", logged. */
async function gql<T>(endpoint: string, referer: string, query: string, variables: Record<string, unknown>, shape: z.ZodType<T>): Promise<T> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", referer, "user-agent": USER_AGENT },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`${String(res.status)} ${res.statusText}: ${(await res.text()).slice(0, 200)}`);
    return shape.parse(await res.json());
  } catch (error: unknown) {
    log.error("leetcode.upstream", { endpoint, error });
    throw new GameError("upstream", "LeetCode did not answer. Paste the page instead.");
  }
}

/** The slug to fetch: straight from a leetcode.com/problems/<slug> URL, else the best of the search hits. */
async function findSlug(query: string, endpoint: string): Promise<string> {
  const fromUrl = PROBLEM_URL.exec(query)?.[1];
  if (fromUrl !== undefined) return fromUrl;
  const hits = (await gql(endpoint, "https://leetcode.com/problemset/", SEARCH, { f: { searchKeywords: query } }, searchReply)).data.questionList.data;
  const wanted = query.toLowerCase();
  const digits = /^\d+$/.test(query);
  const exact = (h: { questionFrontendId: string; title: string }): boolean => (digits ? h.questionFrontendId === query : h.title.toLowerCase() === wanted);
  // The search is fuzzy and never empty ("zzz" finds "The Skyline Problem"), so a loose hit must still carry every word typed.
  const words = wanted.split(/\s+/);
  const pick = hits.find(exact) ?? hits.find((h) => words.every((w) => h.title.toLowerCase().includes(w)));
  if (pick === undefined) throw new GameError("not-found", `LeetCode has no problem called ${query}.`);
  return pick.titleSlug;
}

/** Fetch a problem by number, title or URL. Only ever throws GameError ("not-found" / "upstream"). `endpoint` is injectable for the failure tests. */
export async function lookupLeetCode(query: string, endpoint = ENDPOINT): Promise<LeetCodeLookup> {
  const q = query.trim();
  const slug = await findSlug(q, endpoint);
  const question = (await gql(endpoint, `https://leetcode.com/problems/${slug}/`, DETAIL, { slug }, detailReply)).data.question;
  if (question === null) throw new GameError("not-found", `LeetCode has no problem called ${q}.`);
  if (question.content === null) throw new GameError("not-found", `LeetCode keeps ${question.title} behind its paywall. Paste the page instead.`);
  const { statement, constraints } = splitContent(htmlToText(question.content));
  const tags = question.topicTags.map((t) => t.name);
  // zerotrac rated the contest problems themselves; everything older or off-contest falls to the heuristic.
  const rating =
    (await lookupZerotrac(question.titleSlug)) ??
    estimateRating({ difficulty: question.difficulty, acRate: acRateFrom(question.stats), tags, constraints });
  const problem: Problem = {
    title: question.title,
    url: `https://leetcode.com/problems/${question.titleSlug}/`,
    statement,
    tags,
    hints: question.hints.map((h) => htmlToText(h)),
    constraints,
    rating,
  };
  return { problem, ...assess(problem), source: "leetcode", number: question.questionFrontendId };
}

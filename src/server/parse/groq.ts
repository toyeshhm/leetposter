import { z } from "zod";
import { GameError } from "@/game/errors";
import type { Problem } from "@/game/types";
import { log } from "@/server/log";
import { assess, slugUrl, trimPage } from "./leetcode";
import { completion, modelProblem } from "./schema";
import type { ParsedProblem } from "./types";

/** Checked against GET /openai/v1/models on 2026-09-13: no Llama 3.3 70B is served any more; this is the strongest text model on offer. */
const MODEL = "openai/gpt-oss-120b";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 20_000;

const SYSTEM_PROMPT = `You receive the full text of a LeetCode problem page copied from the browser (select all, copy), including menus, stats, discussion and editor noise.
Return ONLY a JSON object with exactly these six keys:
"title" (string: the problem title without its leading number),
"url" (string: https://leetcode.com/problems/<slug>/),
"statement" (string: the problem statement paragraphs separated by blank lines, then every "Example k:" block verbatim with its Input/Output/Explanation lines, then any Follow-up paragraph; without the constraints),
"tags" (array of strings: the topic tags listed under the Topics section after the acceptance stats, in order; NOT level chips like Junior, Mid Level, Senior, Easy, Medium, Hard),
"hints" (array of strings: the text under each "Hint k" header, in order),
"constraints" (string: the lines under "Constraints:", one per line).
Copying flattened superscripts: "104" means 10^4, "109" means 10^9, "2 * 105" means 2 * 10^5. Restore them as 10^k in the constraints.
Never invent hints or tags that are not in the text. When a section is absent, use "" or []. Copy text verbatim; do not paraphrase.`;

const HINTS_PROMPT = `You receive a coding problem: its statement, its constraints and its topic tags. It has no hints of its own.
Write two to four hints for it, in order, worded the way LeetCode words its own: one or two sentences each, the first a gentle nudge, the last close to the approach.
Never write code, never give the answer to an example, and never name the whole algorithm in the first hint.
Return ONLY a JSON object {"hints": [string, ...]}.`;
const MAX_HINTS = 4;
const hintsReply = z.object({ hints: z.array(z.string()) });

export function groqKey(): string | null {
  const key = process.env.GROQ_API_KEY;
  return key === undefined || key === "" ? null : key;
}

/** The JSON the model put in a chat-completion body; a malformed envelope or content that is not JSON is an "invalid" GameError. */
function contentJson(body: unknown): unknown {
  const envelope = completion.safeParse(body);
  if (!envelope.success) throw new GameError("invalid", "The model answered in an unexpected shape.");
  const content = envelope.data.choices[0].message.content;
  try {
    return JSON.parse(content);
  } catch (error: unknown) {
    log.error("groq.not_json", { content, error });
    throw new GameError("invalid", "The model did not answer with JSON.");
  }
}

/** Validate a chat-completion body and read the problem out of it; malformed output is an "invalid" GameError. */
export function readCompletion(body: unknown): ParsedProblem {
  const raw = contentJson(body);
  const result = modelProblem.safeParse(raw);
  if (!result.success) {
    log.error("groq.bad_shape", { content: raw });
    throw new GameError("invalid", "The model left out some of the six fields.");
  }
  const fields = result.data;
  const problem = {
    ...fields,
    title: fields.title.trim(),
    url: URL.canParse(fields.url) ? fields.url : slugUrl(fields.title.trim()),
    tags: fields.tags.map((t) => t.trim()).filter((t) => t !== ""),
    hints: fields.hints.map((h) => h.trim()).filter((h) => h !== ""),
  };
  return { problem, ...assess(problem), source: "llm" };
}

/** The hints out of a chat-completion body, trimmed, empties dropped, at most four; none at all is an "invalid" GameError. */
export function readHints(body: unknown): string[] {
  const result = hintsReply.safeParse(contentJson(body));
  const hints = result.success ? result.data.hints.map((h) => h.trim()).filter((h) => h !== "") : [];
  if (hints.length === 0) {
    log.error("groq.no_hints", { body });
    throw new GameError("invalid", "The model wrote no hints.");
  }
  return hints.slice(0, MAX_HINTS);
}

/** One chat completion as JSON mode. Server-only: needs GROQ_API_KEY. */
async function chat(system: string, user: string): Promise<unknown> {
  const key = groqKey();
  if (key === null) throw new Error("GROQ_API_KEY is not set; the model cannot be asked.");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq answered ${String(res.status)}: ${await res.text()}`);
  return res.json();
}

/** Ask Groq to split the paste. */
export async function parseWithGroq(text: string): Promise<ParsedProblem> {
  // ponytail: the free tier allows 8000 tokens a minute, so only the problem's own lines go over the wire.
  return readCompletion(await chat(SYSTEM_PROMPT, trimPage(text)));
}

/** Ask Groq to write hints for a problem that came without any; the statement, constraints and topics are all it reads. */
export async function writeHints(problem: Problem): Promise<string[]> {
  return readHints(await chat(HINTS_PROMPT, `Statement:\n${problem.statement}\n\nConstraints:\n${problem.constraints}\n\nTopics: ${problem.tags.join(", ")}`));
}

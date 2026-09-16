import { log } from "@/server/log";

/** zerotrac's list: the only public per-problem rating for LeetCode's contest problems, on the same scale the game uses. */
const RATINGS_URL = "https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/ratings.txt";
const TTL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 10_000;

/** The list indexed both ways a caller can name a problem. */
export interface ZerotracTable {
  bySlug: Map<string, number>;
  byId: Map<string, number>;
}

/**
 * Tab-separated rows: Rating, ID, Title, Title ZH, Title Slug, Contest Slug, Problem Index.
 * The header row and any short or blank line are skipped rather than trusted.
 */
export function parseZerotrac(text: string): ZerotracTable {
  const table: ZerotracTable = { bySlug: new Map(), byId: new Map() };
  for (const line of text.split("\n")) {
    const [rating, id, , , slug] = line.split("\t");
    if (rating === undefined || id === undefined || slug === undefined) continue;
    const value = Number(rating);
    if (!Number.isFinite(value)) continue;
    const rounded = Math.round(value);
    table.byId.set(id, rounded);
    table.bySlug.set(slug.toLowerCase(), rounded);
  }
  return table;
}

let table: Promise<ZerotracTable | null> | null = null;
let fetchedAt = 0;
let dead = false;

async function fetchTable(url: string): Promise<ZerotracTable | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`${String(res.status)} ${res.statusText}`);
    return parseZerotrac(await res.text());
  } catch (error: unknown) {
    log.error("zerotrac.unreachable", { url, error });
    dead = true;
    return null;
  }
}

/** One fetch per process, kept for a day. A failure is final: this process falls back to the heuristic for good rather than hammering GitHub on every lookup. */
function load(url: string): Promise<ZerotracTable | null> {
  if (dead) return Promise.resolve(null);
  if (table === null || Date.now() - fetchedAt >= TTL_MS) {
    fetchedAt = Date.now();
    table = fetchTable(url);
  }
  return table;
}

/** The rating for a title slug or a frontend id; null when the list has no row for it, or could not be read. Never throws. `url` is injectable for the failure test. */
export async function lookupZerotrac(slugOrId: string, url = RATINGS_URL): Promise<number | null> {
  const found = await load(url);
  if (found === null) return null;
  const key = slugOrId.trim().toLowerCase();
  return found.byId.get(key) ?? found.bySlug.get(key) ?? null;
}

import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";
import type { RunOutcome } from "@/client/pyRunner";
import { GameError } from "@/game/errors";
import { log } from "@/server/log";
import { JUDGE0_LANGUAGE_IDS, type Judged } from "./languages";

/**
 * Judge0 CE's own public instance: free, keyless, throttled per IP at a rate it does not publish, and
 * under no promise to stay up. Enough for a hall of friends; JUDGE0_URL points the hall at a
 * self-hosted or paid instance when it stops being enough.
 * ponytail: no key header, because the public instance takes none. Add one beside JUDGE0_URL the day the hall moves to RapidAPI or a private box.
 */
export const PUBLIC_JUDGE0 = "https://ce.judge0.com";
/** The same ten seconds the browser runners allow, as CPU time; the wall clock gets room for a slow box. */
const CPU_SECONDS = 10;
const WALL_SECONDS = 20;
const TIMEOUT_MS = 15_000;
const POLL_MS = 500;
/** Compile, queue and a full wall-clock run fit in this many polls with room to spare. */
const POLLS = 80;
/** Judge0 statuses: 1 In Queue, 2 Processing, 3 Accepted, 5 Time Limit Exceeded, 6 Compilation Error, 7 to 12 runtime errors. */
const PROCESSING = 2;
const TIME_LIMIT_EXCEEDED = 5;
const COMPILATION_ERROR = 6;

const created = z.object({ token: z.string() });
const judged = z.object({
  status: z.object({ id: z.number().int() }),
  time: z.string().nullable(),
  stdout: z.string().nullable(),
  stderr: z.string().nullable(),
  compile_output: z.string().nullable(),
  message: z.string().nullable(),
});

function judgeUrl(): string {
  const url = process.env.JUDGE0_URL;
  return url === undefined || url === "" ? PUBLIC_JUDGE0 : url;
}

const encode = (text: string): string => Buffer.from(text, "utf8").toString("base64");
const decode = (encoded: string | null): string => (encoded === null ? "" : Buffer.from(encoded, "base64").toString("utf8"));

/** One call to the judge. No answer, a non-200 or a body of the wrong shape: "upstream", logged. */
async function ask<T>(url: string, init: RequestInit, shape: z.ZodType<T>): Promise<T> {
  try {
    const res = await fetch(url, { ...init, headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`${String(res.status)} ${res.statusText}: ${(await res.text()).slice(0, 200)}`);
    return shape.parse(await res.json());
  } catch (error: unknown) {
    log.error("judge0.upstream", { url, error });
    throw new GameError("upstream", "The judge did not answer. Try again in a moment.");
  }
}

/**
 * Compile and run `code` on the judge with `stdin`, and answer in the browser runners' own shape, so
 * the Run panel cannot tell them apart. A compile error, an uncaught exception and a crash are all
 * text on stderr (the compiler's lines, then the program's, then the judge's one-line reason). The
 * compiler's output counts only when it failed: javac prints Notes on a clean build, and the Judge in
 * the Hall reads any stderr as a runtime error. Only a
 * judge that cannot be reached or does not finish throws, and only ever GameError "upstream".
 * Submit, then poll: `wait=true` would save the loop, but an instance may switch it off (the public
 * one reports enable_wait_result false), and the token flow works on every Judge0 there is.
 * `endpoint` and `polls` are injectable for the failure tests.
 */
export async function runOnJudge(language: Judged, code: string, stdin: string, endpoint = judgeUrl(), polls = POLLS): Promise<RunOutcome> {
  const submission = { language_id: JUDGE0_LANGUAGE_IDS[language], source_code: encode(code), stdin: encode(stdin), cpu_time_limit: CPU_SECONDS, wall_time_limit: WALL_SECONDS };
  const { token } = await ask(`${endpoint}/submissions?base64_encoded=true`, { method: "POST", body: JSON.stringify(submission) }, created);
  for (let poll = 0; poll < polls; poll++) {
    await sleep(POLL_MS);
    const result = await ask(`${endpoint}/submissions/${token}?base64_encoded=true&fields=status,time,stdout,stderr,compile_output,message`, { method: "GET" }, judged);
    if (result.status.id > PROCESSING) {
      const timedOut = result.status.id === TIME_LIMIT_EXCEEDED;
      const compiler = result.status.id === COMPILATION_ERROR ? result.compile_output : null;
      const said = [compiler, result.stderr, result.message].map(decode).filter((line) => line !== "");
      return { stdout: decode(result.stdout), stderr: timedOut ? "" : said.join("\n"), ms: Math.round(Number(result.time ?? "0") * 1000), timedOut };
    }
  }
  throw new GameError("upstream", "The judge is taking too long. Try again in a moment.");
}

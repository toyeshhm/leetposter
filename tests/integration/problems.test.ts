import { readdirSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { GET as detailGet } from "@/app/api/problems/[id]/route";
import { GET as testsGet } from "@/app/api/problems/[id]/tests/route";
import { GET as indexGet } from "@/app/api/problems/route";
import type { Credentials } from "@/client/api";
import type { Problem, RoomState } from "@/game/types";
import { BANK } from "@/problems";
import type { AccountUser } from "@/server/auth";
import { actHandler, createRoomHandler, joinHandler } from "@/server/handlers";
import { problemAfterHall, PROBLEM_K, rateProblem } from "@/server/problemRating";
import { problemDetail, problemIndex, summary, type ProblemDetail, type ProblemSummary, type ProblemTests } from "@/server/problems";
import { supabase } from "@/server/supabase";

const TOKEN = "f".repeat(32);
const codes: string[] = [];
const userIds: string[] = [];
const run = Date.now().toString(36);
let seat = 0;

/** Two real bank problems, picked off the ends of the ladder so the band tests have something to sort. */
const easiest = [...BANK].sort((a, b) => a.rating - b.rating)[0];
const hardest = [...BANK].sort((a, b) => b.rating - a.rating)[0];
if (easiest === undefined || hardest === undefined) throw new Error("the bank is empty");

afterAll(async () => {
  const { error } = await supabase.from("rooms").delete().in("code", codes);
  if (error !== null) throw new Error(error.message);
  const { error: statsError } = await supabase.from("problem_stats").delete().in("problem_id", [easiest.id, hardest.id]);
  if (statsError !== null) throw new Error(statsError.message);
  for (const id of userIds) {
    const { error: userError } = await supabase.auth.admin.deleteUser(id);
    if (userError !== null) throw new Error(userError.message);
  }
});

/** A real, confirmed Supabase Auth user with a profile row: a player who joined signed in. */
async function newUser(): Promise<AccountUser> {
  const username = `p${run}${String((seat += 1))}`.slice(0, 20);
  const created = await supabase.auth.admin.createUser({ email: `${username}@example.test`, password: `pw-${username}`, email_confirm: true });
  if (created.error !== null) throw new Error(created.error.message);
  const id = created.data.user.id;
  userIds.push(id);
  const profile = await supabase.from("profiles").insert({ id, username });
  if (profile.error !== null) throw new Error(profile.error.message);
  return { id, username };
}

function params(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}
async function json<T>(res: Response, status = 200): Promise<T> {
  const body: unknown = await res.json();
  expect(res.status, JSON.stringify(body)).toBe(status);
  return body as T;
}
async function fail(res: Response, status: number, code: string): Promise<void> {
  const body = await json<{ code: string; message: string }>(res, status);
  expect(body.code).toBe(code);
}
function bankProblemFor(id: string, rating: number): Problem {
  return { title: "A hall problem", url: "https://example.test/x", statement: "Solve it.", tags: [], hints: [], constraints: "", bankId: id, rating };
}
/** A hall sitting at a bank problem. Under four players the solo host holds every seat, the Herald's included. */
async function hallOn(bankId: string, rating: number, players = 1, signedInJoiners = 0): Promise<Credentials[]> {
  const host = await createRoomHandler("Ada", null);
  codes.push(host.code);
  const crew = [host];
  for (let i = 1; i < players; i++) crew.push(await joinHandler(host.code, `P${String(i)}`, i <= signedInJoiners ? await newUser() : null));
  await actHandler(host.code, host.token, { type: "setProblem", problem: bankProblemFor(bankId, rating) });
  await actHandler(host.code, host.token, { type: "setSettings", settings: { readMs: 0 } });
  await actHandler(host.code, host.token, { type: "start" });
  return crew;
}
function askTests(id: string, code: string, token: string): Promise<Response> {
  const req = new Request(`http://x/api/problems/${id}/tests?code=${code}`, { headers: { authorization: `Bearer ${token}` } });
  return testsGet(req, params(id));
}
async function stateOf(code: string): Promise<RoomState> {
  const { data, error } = await supabase.from("rooms").select("state").eq("code", code).single();
  if (error !== null) throw new Error(error.message);
  return (data as { state: RoomState }).state;
}

describe("the bank index", () => {
  it("lists every problem file on disk, hardest last, and spoils nothing", () => {
    const all = problemIndex({});
    // Against the directory, never against BANK: bank/index.ts is generated, and comparing the
    // index to itself is how 64 authored problems sat unreachable without a test noticing.
    const onDisk = readdirSync("src/problems/bank").filter((f) => f.endsWith(".json"));
    expect(all).toHaveLength(onDisk.length);
    expect(new Set(all.map((p) => `${p.id}.json`))).toEqual(new Set(onDisk));
    expect(all.map((p) => p.rating)).toEqual([...all.map((p) => p.rating)].sort((a, b) => a - b));
    // A summary is the card in the list: never the statement, the samples, the tests or the solutions.
    expect(Object.keys(all[0] ?? {}).sort()).toEqual(["cluster", "difficulty", "id", "rating", "tags", "title"]);
    expect(summary(easiest)).toEqual({ id: easiest.id, title: easiest.title, rating: easiest.rating, tags: easiest.tags, difficulty: easiest.difficulty, cluster: easiest.cluster });
  });

  it("bands are closed below and open above, so the lobby's bands tile the ladder", () => {
    const rating = easiest.rating;
    expect(problemIndex({ min: rating }).every((p) => p.rating >= rating)).toBe(true);
    expect(problemIndex({ max: rating }).some((p) => p.id === easiest.id)).toBe(false);
    expect(problemIndex({ min: rating, max: rating + 1 }).some((p) => p.id === easiest.id)).toBe(true);
  });

  it("filters by tag", () => {
    const tag = easiest.tags[0];
    if (tag === undefined) throw new Error("the easiest problem carries no tag");
    const tagged = problemIndex({ tag });
    expect(tagged.length).toBeGreaterThan(0);
    expect(tagged.every((p) => p.tags.includes(tag))).toBe(true);
  });

  it("answers the route, and refuses a band outside the ladder or a tag the bank does not use", async () => {
    const { problems } = await json<{ problems: ProblemSummary[] }>(await indexGet(new Request("http://x/api/problems")));
    expect(problems).toHaveLength(readdirSync("src/problems/bank").filter((f) => f.endsWith(".json")).length);
    const banded = await json<{ problems: ProblemSummary[] }>(await indexGet(new Request(`http://x/api/problems?min=800&max=${String(easiest.rating + 1)}`)));
    expect(banded.problems.every((p) => p.rating <= easiest.rating)).toBe(true);
    await fail(await indexGet(new Request("http://x/api/problems?min=10")), 400, "invalid");
    await fail(await indexGet(new Request("http://x/api/problems?tag=knitting")), 400, "invalid");
  });
});

describe("one problem", () => {
  it("reads as the crew reads it, and keeps the answers back", async () => {
    const detail = await json<ProblemDetail>(await detailGet(new Request("http://x"), params(easiest.id)));
    expect(detail.id).toBe(easiest.id);
    expect(detail.statement).toBe(easiest.statement);
    expect(detail.hints).toEqual(easiest.hints);
    const keys = Object.keys(detail);
    for (const secret of ["samples", "tests", "solution", "brute"]) expect(keys).not.toContain(secret);
    expect(problemDetail(easiest.id).title).toBe(easiest.title);
  });

  it("answers 404 for an id the bank does not hold and 400 for one that is not an id at all", async () => {
    await fail(await detailGet(new Request("http://x"), params("no-such-problem")), 404, "not-found");
    await fail(await detailGet(new Request("http://x"), params("Not An Id")), 400, "invalid");
    expect(() => problemDetail("no-such-problem")).toThrow();
  });
});

describe("the tests, for the Herald alone", () => {
  it("hands the Herald the samples and the hall's hidden tests, read from the tests file", async () => {
    const [host] = await hallOn(easiest.id, easiest.rating);
    if (host === undefined) throw new Error("host");
    const body = await json<ProblemTests>(await askTests(easiest.id, host.code, host.token));
    expect(body.id).toBe(easiest.id);
    expect(body.timeLimitMs).toBe(easiest.timeLimitMs);
    expect(body.samples).toEqual(easiest.samples);
    // The schema's floor, and the cap that keeps the payload off the Herald's phone.
    expect(body.tests.length).toBeGreaterThanOrEqual(8);
    for (const t of body.tests) expect(t.input.length + t.output.length).toBeLessThanOrEqual(1_000_000);
  });

  it("is one unauthorized answer for everyone else, so a prober learns nothing", async () => {
    const [host, guest] = await hallOn(easiest.id, easiest.rating, 5);
    if (host === undefined || guest === undefined) throw new Error("two players");
    const state = await stateOf(host.code);
    const notHerald = state.players.find((p) => !p.seats.includes("runner"));
    if (notHerald === undefined) throw new Error("a five-player hall has a seat that is not the Herald's");

    await fail(await askTests(easiest.id, host.code, TOKEN), 401, "unauthorized");
    await fail(await askTests(easiest.id, "ZZZZZ", host.token), 401, "unauthorized");
    await fail(await askTests(easiest.id, host.code, notHerald.token), 401, "unauthorized");
    // A hall playing something else may not read this problem's tests either.
    await fail(await askTests(hardest.id, host.code, host.token), 401, "unauthorized");
  });

  it("refuses an id that is not an id, and 404s one the bank does not hold", async () => {
    const [host] = await hallOn(easiest.id, easiest.rating);
    if (host === undefined) throw new Error("host");
    await fail(await askTests("Not An Id", host.code, host.token), 400, "invalid");
    await fail(await askTests("no-such-problem", host.code, host.token), 404, "not-found");
  });

  it("treats a missing hall code and a missing Authorization header as no credentials at all", async () => {
    const bare = new Request(`http://x/api/problems/${easiest.id}/tests`);
    await fail(await testsGet(bare, params(easiest.id)), 401, "unauthorized");
    const noHeader = new Request(`http://x/api/problems/${easiest.id}/tests?code=ZZZZZ`);
    await fail(await testsGet(noHeader, params(easiest.id)), 401, "unauthorized");
  });
});

describe("a problem's own rating", () => {
  it("scores zero when the crew solve it and one when they do not", () => {
    // Even match: the problem gives up half of K on a solve and takes half on a hold.
    expect(rateProblem(1500, 1500, true)).toBe(1500 - PROBLEM_K / 2);
    expect(rateProblem(1500, 1500, false)).toBe(1500 + PROBLEM_K / 2);
    // A crew far above it barely moves it when they solve it, and shakes it when they fail.
    expect(rateProblem(1000, 2500, true)).toBe(1000);
    expect(rateProblem(1000, 2500, false)).toBe(1000 + PROBLEM_K);
  });

  it("seeds from the authored rating on the first hall, then counts attempts and solves", async () => {
    const [host] = await hallOn(easiest.id, easiest.rating);
    if (host === undefined) throw new Error("host");
    await actHandler(host.code, host.token, { type: "submit", verdict: "accepted" });
    const solved = await stateOf(host.code);
    expect(solved.outcome?.reason).toBe("accepted");

    await problemAfterHall(solved);
    const first = await stats(easiest.id);
    // A solo guest crew sits at the default rating, so the solve pulls the problem down from where it was authored.
    expect(first.rating).toBe(rateProblem(easiest.rating, 1200, true));
    expect(first).toMatchObject({ attempts: 1, solves: 1 });

    await problemAfterHall(solved);
    const second = await stats(easiest.id);
    expect(second).toMatchObject({ attempts: 2, solves: 2 });
    expect(second.rating).toBe(rateProblem(first.rating, 1200, true));
  });

  it("rates against the crew's own ratings, and a hall the problem holds counts as an attempt but not a solve", async () => {
    // Six seats: a guest host, four signed in, a guest tail. Only one of them is the Changeling, so
    // whichever seat it falls on the crew still holds both a guest and an account — the two sides of
    // the lookup are covered every run, not four runs in five.
    const [host] = await hallOn(hardest.id, hardest.rating, 6, 4);
    if (host === undefined) throw new Error("host");
    const played = await stateOf(host.code);
    const crew = played.players.filter((p) => !p.isImposter);
    expect(crew.some((p) => p.userId !== null)).toBe(true);
    expect(crew.some((p) => p.userId === null)).toBe(true);

    const held: RoomState = { ...played, outcome: { winner: "imposter", reason: "final-vote" } };
    await problemAfterHall(held);
    const after = await stats(hardest.id);
    // Nobody has been rated yet, so every seat still weighs the default and the problem gains on a hold.
    expect(after.rating).toBe(rateProblem(hardest.rating, 1200, false));
    expect(after).toMatchObject({ attempts: 1, solves: 0 });
  });

  it("is nothing at all for a hall that was not on a bank problem, or on one the bank has retired", async () => {
    const [host] = await hallOn(easiest.id, easiest.rating);
    if (host === undefined) throw new Error("host");
    const played = await stateOf(host.code);
    const set = played.problem;
    if (set === null) throw new Error("the hall sat at a problem");

    await expect(problemAfterHall({ ...played, problem: null })).resolves.toBeUndefined();
    await expect(problemAfterHall({ ...played, problem: { ...set, bankId: undefined } })).resolves.toBeUndefined();
    await expect(problemAfterHall({ ...played, problem: { ...set, bankId: "gone-from-the-bank" } })).resolves.toBeUndefined();
  });
});

async function stats(id: string): Promise<{ rating: number; attempts: number; solves: number }> {
  const { data, error } = await supabase.from("problem_stats").select("rating, attempts, solves").eq("problem_id", id).single();
  if (error !== null) throw new Error(error.message);
  return data;
}

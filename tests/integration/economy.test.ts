import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it, vi } from "vitest";
import { GET as loadoutGet, POST as loadoutPost } from "@/app/api/account/loadout/route";
import { POST as passClaimPost } from "@/app/api/pass/claim/route";
import { GET as passGet } from "@/app/api/pass/route";
import { POST as questsClaimPost } from "@/app/api/quests/claim/route";
import { GET as questsGet } from "@/app/api/quests/route";
import { POST as buyPost } from "@/app/api/store/buy/route";
import { GET as storeGet } from "@/app/api/store/route";
import type { Loadout, PassPage, QuestsPage, StorePage } from "@/client/api";
import { CATALOG, itemById } from "@/economy/catalog";
import { questsFor, type Quest } from "@/economy/quests";
import { SEASONS, seasonFor, xpForTier, type Season } from "@/economy/seasons";
import { GameError } from "@/game/errors";
import { DEFAULT_SETTINGS, type EquippedLook, type RoomState } from "@/game/types";
import type { GameResultRow } from "@/server/achievements";
import { economyAfterHall, xpForHall } from "@/server/economy/hall";
import { DEFAULT_LOADOUT, grantItem, inventoryOf, loadoutOf, setLoadout } from "@/server/economy/inventory";
import { seedSeasons, syncCatalog } from "@/server/economy/items";
import { equippedLook } from "@/server/economy/look";
import { claimTier, grantXp, passPage } from "@/server/economy/pass";
import { advanceQuests, satisfies } from "@/server/economy/quests";
import { buy } from "@/server/economy/store";
import { ensureWallet, grantCandles } from "@/server/economy/wallet";
import { loadResults, recordResults } from "@/server/results";
import { supabase } from "@/server/supabase";
import { PROBLEM, T_BUILD, act, building, holder, imposter, lobby } from "../unit/fixtures";

/**
 * The economy against the real local Supabase: real auth users, real rows, the real route handlers.
 * Nothing here is faked; where a failure has to be provoked (the shelf losing an item under a buyer)
 * the database itself is put into that state.
 */

const run = Date.now().toString(36);
// Signing in on the server client would make every later query run as that user; a throwaway client keeps the secret key in charge.
const signIn = createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_KEY ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
const userIds: string[] = [];

/** A date inside the first seeded season, so the pass and the quest board are both fixed and known. */
const WHEN = new Date("2026-10-05T12:00:00.000Z");

/** The season WHEN falls in: the tests pin to its tiers and its rewards. */
function seeded(id: string): Season {
  const season = SEASONS.find((s) => s.id === id);
  if (season === undefined) throw new Error(`no season ${id} in SEASONS`);
  return season;
}

const SEASON = seeded("2026-10");
/** A day inside that season whose daily board holds Call the Table, so a frozen hall has a quest to move. */
const TRIBUNAL_DAY = new Date("2026-10-17T12:00:00.000Z");
/** Priced, sold in the store, and never handed out by the pass or an achievement. */
const FOR_SALE = "emote-snuff";

interface Account {
  id: string;
  username: string;
  token: string;
}

afterAll(async () => {
  for (const id of userIds) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error !== null) throw new Error(error.message);
  }
});

/** A real, confirmed Supabase Auth user with a profile row, signed in: what a browser would hold. */
async function newUser(tag: string): Promise<Account> {
  const email = `economy-${run}-${tag}@example.test`;
  const password = `pw-${run}-${tag}`;
  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error !== null) throw new Error(created.error.message);
  const id = created.data.user.id;
  userIds.push(id);
  const username = `e${run}${tag}`.slice(0, 20);
  const profile = await supabase.from("profiles").insert({ id, username });
  if (profile.error !== null) throw new Error(profile.error.message);
  const signed = await signIn.auth.signInWithPassword({ email, password });
  if (signed.error !== null) throw new Error(signed.error.message);
  return { id, username, token: signed.data.session.access_token };
}

function request(handler: (req: Request) => Promise<Response>, token: string | null, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = token === null ? {} : { authorization: `Bearer ${token}` };
  const init: RequestInit = body === undefined ? { method: "GET", headers } : { method: "POST", headers, body: JSON.stringify(body) };
  return handler(new Request("http://x/api/economy", init));
}

async function json<T>(res: Response, status = 200): Promise<T> {
  const body: unknown = await res.json();
  expect(res.status, JSON.stringify(body)).toBe(status);
  return body as T;
}

/** A GameError with this code and a message that reads like the spec says it should. */
async function failsWith(work: Promise<unknown>, code: string, message: RegExp): Promise<void> {
  const error = await work.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(GameError);
  expect((error as GameError).code).toBe(code);
  expect((error as GameError).message).toMatch(message);
}

/** Give one player an account, as taking a seat while signed in does. */
function signedIn(state: RoomState, playerId: string, account: Account): RoomState {
  return { ...state, players: state.players.map((p) => (p.id === playerId ? { ...p, userId: account.id, username: account.username } : p)) };
}

/** A hall played to the reveal: the crew win on an accepted submission, the tagger's one card true. */
function playedHall(code: string, tagger: Account, mask: Account): RoomState {
  let s = building();
  for (let seed = 2; imposter(s).seats.includes("tagger") || imposter(s).seats.includes("oracle"); seed++) s = building(5, seed);
  const taggerSeat = holder(s, "tagger");
  const oracleSeat = holder(s, "oracle");
  const runnerSeat = holder(s, "runner");
  s = { ...signedIn(signedIn(s, taggerSeat.id, tagger), imposter(s).id, mask), code };
  s = act(s, taggerSeat.id, T_BUILD + 1, { type: "declareTags", tags: [...PROBLEM.tags] });
  s = act(s, oracleSeat.id, T_BUILD + 2, { type: "revealHint", index: 0, text: "Nothing like the true hint." });
  s = act(s, runnerSeat.id, T_BUILD + 3, { type: "submit", verdict: "accepted" });
  expect(s.phase).toBe("reveal");
  return s;
}

/** One recorded hall as game_results keeps it, with whatever a test needs to be different about it. */
function resultRow(userId: string, over: Partial<GameResultRow> = {}): GameResultRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    user_id: userId,
    code: "QQQQQ",
    played_at: WHEN.toISOString(),
    seats: ["oracle"],
    was_imposter: false,
    won: true,
    reason: "accepted",
    cards_played: 2,
    cards_altered: 0,
    ejected: false,
    players: 5,
    ...over,
  };
}

/** Today's six, each with the period key it is counted under. */
function board(now: Date): { quest: Quest; period: string }[] {
  const { daily, weekly, period } = questsFor(now);
  return [...daily.map((quest) => ({ quest, period: period.daily })), ...weekly.map((quest) => ({ quest, period: period.weekly }))];
}

async function progressRows(userId: string): Promise<Map<string, { progress: number; claimed: boolean }>> {
  const { data, error } = await supabase.from("quest_progress").select("quest_id, period, progress, claimed").eq("user_id", userId);
  if (error !== null) throw new Error(error.message);
  return new Map(data.map((row) => [`${row.quest_id}@${row.period}`, { progress: row.progress, claimed: row.claimed }]));
}

describe("the catalog and the seasons in Postgres", () => {
  it("mirrors every item and season, and does the work once per process", async () => {
    await syncCatalog();
    await seedSeasons();
    // The second call is the memoised no-op: the tables are already the mirror.
    await syncCatalog();
    await seedSeasons();
    const items = await supabase.from("items").select("id, kind, price_candles, season_id, tier");
    expect(items.error).toBeNull();
    expect(items.data?.length).toBe(CATALOG.length);
    const sold = items.data?.find((row) => row.id === FOR_SALE);
    expect(sold).toMatchObject({ kind: "emote", price_candles: itemById(FOR_SALE).price, season_id: null, tier: null });
    const passItem = items.data?.find((row) => row.id === "avatar-warden");
    expect(passItem).toMatchObject({ price_candles: null, season_id: SEASON.id, tier: 30 });
    const seasons = await supabase.from("seasons").select("id, tiers");
    expect(seasons.error).toBeNull();
    expect(seasons.data?.map((row) => row.id)).toEqual(expect.arrayContaining(SEASONS.map((season) => season.id)));
  });
});

describe("wallet, inventory and loadout", () => {
  it("opens an empty wallet, owns the defaults, and wears them", async () => {
    const user = await newUser("wal");
    expect(await ensureWallet(user.id)).toEqual({ candles: 0, xp: 0 });
    // Asking twice keeps the row that is already there rather than emptying it.
    expect(await grantCandles(user.id, 40)).toBe(40);
    expect(await ensureWallet(user.id)).toEqual({ candles: 40, xp: 0 });
    expect(await inventoryOf(user.id)).toEqual(["avatar-plain-hood", "theme-ember", "caret-bone"]);
    expect(await loadoutOf(user.id)).toEqual(DEFAULT_LOADOUT);
    expect(await equippedLook(null)).toBeNull();
    // Nothing equipped yet: no row, so the seat carries no look.
    expect(await equippedLook(user)).toBeNull();

    const shelf = await json<StorePage>(await request(storeGet, user.token));
    expect(shelf).toEqual({ candles: 40, owned: ["avatar-plain-hood", "theme-ember", "caret-bone"], loadout: DEFAULT_LOADOUT });
    const guest = await json<StorePage>(await request(storeGet, null));
    expect(guest).toEqual({ candles: null, owned: [], loadout: null });
    expect(await json<Loadout>(await request(loadoutGet, user.token))).toEqual(DEFAULT_LOADOUT);
  });

  it("equips what is owned and fits the slot, and refuses the rest", async () => {
    const user = await newUser("fit");
    await failsWith(setLoadout(user.id, "avatar", "avatar-nothing-like-it"), "invalid", /goes in the avatar slot/);
    await failsWith(setLoadout(user.id, "title", "avatar-plain-hood"), "invalid", /goes in the title slot/);
    await failsWith(setLoadout(user.id, "title", "title-the-trusted"), "invalid", /do not own the Trusted/);

    await grantItem(user.id, "title-the-trusted", "grant");
    // Twice is once: the second grant is the same row.
    await grantItem(user.id, "title-the-trusted", "grant");
    expect((await inventoryOf(user.id)).filter((id) => id === "title-the-trusted")).toHaveLength(1);
    const worn = await setLoadout(user.id, "title", "title-the-trusted");
    expect(worn).toEqual({ ...DEFAULT_LOADOUT, title: "title-the-trusted" });
    expect(await equippedLook(user)).toEqual<EquippedLook>({ avatar: null, frame: null, title: "title-the-trusted", badge: null });
    // The row now exists with five empty slots; reading it still fills in the defaults.
    expect(await loadoutOf(user.id)).toEqual({ ...DEFAULT_LOADOUT, title: "title-the-trusted" });

    const cleared = await json<Loadout>(await request(loadoutPost, user.token, { slot: "title", itemId: null }));
    expect(cleared).toEqual(DEFAULT_LOADOUT);
    const equipped = await json<Loadout>(await request(loadoutPost, user.token, { slot: "title", itemId: "title-the-trusted" }));
    expect(equipped.title).toBe("title-the-trusted");
    await expect(json<{ code: string }>(await request(loadoutPost, user.token, { slot: "cloak", itemId: null }), 400)).resolves.toMatchObject({ code: "invalid" });
    await expect(json<{ code: string }>(await request(loadoutGet, null), 401)).resolves.toMatchObject({ code: "unauthorized" });
  });
});

describe("the store", () => {
  it("sells for candles, once, and only what is for sale", async () => {
    const user = await newUser("buy");
    const price = itemById(FOR_SALE).price ?? 0;
    expect(price).toBeGreaterThan(0);

    await failsWith(buy(user, "nothing-on-the-shelf"), "invalid", /Nothing on the shelf is called that/);
    await failsWith(buy(user, "avatar-warden"), "invalid", /not for sale; it is earned/);
    await failsWith(buy(user, "avatar-plain-hood"), "invalid", /already have Plain Hood/);
    await failsWith(buy(user, FOR_SALE), "invalid", new RegExp(`costs ${String(price)} candles; you have 0`));

    await grantCandles(user.id, price + 10);
    const after = await json<StorePage>(await request(buyPost, user.token, { itemId: FOR_SALE }));
    expect(after.candles).toBe(10);
    expect(after.owned).toContain(FOR_SALE);
    const twice = await json<{ message: string }>(await request(buyPost, user.token, { itemId: FOR_SALE }), 400);
    expect(twice.message).toContain("already have");
    await expect(json<{ code: string }>(await request(buyPost, null, { itemId: FOR_SALE }), 401)).resolves.toMatchObject({ code: "unauthorized" });
  });

  it("puts the candles back when the shelf cannot hand the item over", async () => {
    const user = await newUser("ref");
    const item = itemById(FOR_SALE);
    await grantCandles(user.id, 1000);
    // The real failure: the items row goes away under the buyer, so the inventory row is refused by its foreign key.
    const removed = await supabase.from("items").delete().eq("id", FOR_SALE);
    expect(removed.error).toBeNull();
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await failsWith(buy(user, FOR_SALE), "invalid", /not on the shelf\. Your candles are back/);
    expect(errors).toHaveBeenCalledTimes(1);
    errors.mockRestore();
    expect(await ensureWallet(user.id)).toEqual({ candles: 1000, xp: 0 });
    const restored = await supabase
      .from("items")
      .upsert({ id: item.id, kind: item.kind, name: item.name, description: item.description, rarity: item.rarity, price_candles: item.price }, { onConflict: "id" });
    expect(restored.error).toBeNull();
  });
});

describe("the pass", () => {
  it("pays XP into the wallet always and into the running season when there is one", async () => {
    const user = await newUser("xp");
    await grantXp(user.id, 50, WHEN);
    expect(await ensureWallet(user.id)).toEqual({ candles: 0, xp: 50 });
    expect(await passPage(user, WHEN)).toEqual({ seasonId: SEASON.id, xp: 50, paid: false, claimed: [], candles: 0 });
    // Between seasons the wallet still counts it; there is no track to put it on.
    const between = new Date("2026-09-14T12:00:00.000Z");
    await grantXp(user.id, 7, between);
    expect(await ensureWallet(user.id)).toEqual({ candles: 0, xp: 57 });
    expect(await passPage(user, WHEN)).toMatchObject({ xp: 50 });
    expect(await passPage(user, between)).toEqual({ seasonId: null, xp: 0, paid: false, claimed: [], candles: 0 });
    // The route runs on the clock of the day it is called.
    const live = await json<PassPage>(await request(passGet, user.token));
    expect(live.seasonId).toBe(seasonFor(new Date())?.id ?? null);
    await expect(json<{ code: string }>(await request(passGet, null), 401)).resolves.toMatchObject({ code: "unauthorized" });
  });

  it("claims a tier once, and the paid track only once the pass is bought", async () => {
    const user = await newUser("tier");
    const between = new Date("2026-09-14T12:00:00.000Z");
    await failsWith(claimTier(user, 1, between), "invalid", /No season is running/);
    await failsWith(claimTier(user, 31, WHEN), "invalid", /season has 30 tiers/);
    await failsWith(claimTier(user, 1, WHEN), "invalid", /Tier 1 opens at 120 XP/);

    await grantXp(user.id, xpForTier(2), WHEN);
    const free = SEASON.tiers[0]?.free;
    expect(free).toEqual({ item: "badge-season-long-night" });
    const claimed = await claimTier(user, 1, WHEN);
    expect(claimed).toMatchObject({ claimed: [1], candles: 0 });
    expect(await inventoryOf(user.id)).toContain("badge-season-long-night");
    await failsWith(claimTier(user, 1, WHEN), "invalid", /taken that one already/);

    // The webhook is what sets this in production; here the row is put in the same state directly.
    const paid = await supabase.from("pass_progress").update({ paid: true }).eq("user_id", user.id).eq("season_id", SEASON.id);
    expect(paid.error).toBeNull();
    expect(SEASON.tiers[1]).toMatchObject({ free: { candles: 20 }, paid: { candles: 50 } });
    const both = await claimTier(user, 2, WHEN);
    expect(both).toMatchObject({ claimed: [1, 2], paid: true, candles: 70 });

    await expect(json<{ code: string }>(await request(passClaimPost, user.token, { tier: "one" }), 400)).resolves.toMatchObject({ code: "invalid" });
    const live = await request(passClaimPost, user.token, { tier: 1 });
    // On a day inside a season this is a second claim; between seasons there is nothing to claim. Either way it is a 400.
    await expect(json<{ code: string }>(live, 400)).resolves.toMatchObject({ code: "invalid" });
  });
});

describe("the quest board", () => {
  it("shows the six, pays a finished quest once, and counts halls towards the rest", async () => {
    const user = await newUser("qst");
    const today = board(new Date());
    const page = await json<QuestsPage>(await request(questsGet, user.token));
    expect(page.daily.map((q) => q.id)).toEqual(today.slice(0, 3).map((e) => e.quest.id));
    expect(page.weekly.map((q) => q.id)).toEqual(today.slice(3).map((e) => e.quest.id));
    expect(page.daily.every((q) => q.progress === 0 && !q.claimed)).toBe(true);

    const [first, second] = today;
    if (first === undefined || second === undefined) throw new Error("the board is always six");
    const unknownQuest = await json<{ message: string }>(await request(questsClaimPost, user.token, { questId: "no-such-quest" }), 400);
    expect(unknownQuest.message).toContain("not on the board");
    const unfinished = await json<{ message: string }>(await request(questsClaimPost, user.token, { questId: second.quest.id }), 400);
    expect(unfinished.message).toContain(`wants ${String(second.quest.goal)}`);

    // The counter is what the after-hall hook writes; setting it here is the same row in the same state.
    const filled = await supabase.from("quest_progress").insert({ user_id: user.id, quest_id: first.quest.id, period: first.period, progress: first.quest.goal });
    expect(filled.error).toBeNull();
    const paid = await json<QuestsPage>(await request(questsClaimPost, user.token, { questId: first.quest.id }));
    expect(paid.candles).toBe(first.quest.candles);
    expect(paid.daily.concat(paid.weekly).find((q) => q.id === first.quest.id)).toMatchObject({ progress: first.quest.goal, claimed: true });
    expect(await ensureWallet(user.id)).toEqual({ candles: first.quest.candles, xp: first.quest.xp });
    const again = await json<{ message: string }>(await request(questsClaimPost, user.token, { questId: first.quest.id }), 400);
    expect(again.message).toContain("taken that one already");
    await expect(json<{ code: string }>(await request(questsGet, null), 401)).resolves.toMatchObject({ code: "unauthorized" });
  });

  it("moves every rule the hall satisfies on by one, and leaves a hall nobody sat empty", async () => {
    const user = await newUser("adv");
    const row = resultRow(user.id);
    const state: RoomState = { ...lobby(5), code: "QQQQQ", problem: PROBLEM };
    const fixed = board(WHEN);
    const matching = fixed.filter((entry) => satisfies(entry.quest.rule, row, { problem: PROBLEM, tribunal: false }));
    expect(matching.length).toBeGreaterThan(0);

    await advanceQuests(state, [row], WHEN);
    const once = await progressRows(user.id);
    expect([...once.keys()].sort()).toEqual(matching.map((e) => `${e.quest.id}@${e.period}`).sort());
    expect([...once.values()].every((v) => v.progress === 1)).toBe(true);
    // A second hall counts on top of the first rather than starting it again.
    await advanceQuests(state, [row], WHEN);
    expect([...(await progressRows(user.id)).values()].every((v) => v.progress === 2)).toBe(true);
    // A hall with nobody to pay leaves the board alone.
    await advanceQuests(state, [], WHEN);
    expect([...(await progressRows(user.id)).values()].every((v) => v.progress === 2)).toBe(true);
  });

  it("reads the tribunal off the hall rather than off anyone's row", async () => {
    const user = await newUser("tri");
    const entry = board(TRIBUNAL_DAY).find(({ quest }) => quest.rule.kind === "tribunal-called");
    if (entry === undefined) throw new Error("Call the Table is on the board on 2026-10-17");
    const key = `${entry.quest.id}@${entry.period}`;
    const row = resultRow(user.id, { code: "TRIBU" });
    const quiet: RoomState = { ...building(), code: "TRIBU" };
    // A real freeze, called through the reducer: the vote round is the one the game itself writes.
    const frozen = act(quiet, "p0", T_BUILD + DEFAULT_SETTINGS.freezeOpensAfterMs, { type: "callFreeze" });
    expect(frozen.votes.map((round) => round.kind)).toEqual(["freeze"]);

    // Nobody called the table, so the quest the row alone cannot satisfy stays off the board.
    await advanceQuests(quiet, [row], TRIBUNAL_DAY);
    expect((await progressRows(user.id)).get(key)).toBeUndefined();
    await advanceQuests(frozen, [row], TRIBUNAL_DAY);
    expect((await progressRows(user.id)).get(key)).toMatchObject({ progress: 1, claimed: false });
  });
});

describe("the after-hall hook", () => {
  it("pays XP, moves the quest board on and hands out the badges the hall earned", async () => {
    const tagger = await newUser("hal");
    const mask = await newUser("msk");
    const code = `E${run.toUpperCase()}`.slice(0, 5);
    const state = playedHall(code, tagger, mask);
    await recordResults(state);

    const rows = await loadResults(tagger.id);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    if (row === undefined) throw new Error("the hall was recorded");
    expect(row).toMatchObject({ won: true, reason: "accepted", cards_played: 1, cards_altered: 0 });
    expect(xpForHall(row)).toBe(100);
    expect(await ensureWallet(tagger.id)).toMatchObject({ xp: 100 });
    // The Changeling lost but sat the hall and saw it accepted.
    expect(await ensureWallet(mask.id)).toMatchObject({ xp: 60 });
    expect(await inventoryOf(tagger.id)).toContain("badge-first-candle");
    expect(await inventoryOf(mask.id)).toContain("badge-first-candle");

    const today = board(new Date());
    const hall = { problem: state.problem, tribunal: false };
    const counted = await progressRows(tagger.id);
    for (const entry of today) {
      const at = counted.get(`${entry.quest.id}@${entry.period}`)?.progress ?? 0;
      expect(at, entry.quest.id).toBe(satisfies(entry.quest.rule, row, hall) ? 1 : 0);
    }

    // A second hall for the same pair: the XP is paid again and the counters move on.
    const again = playedHall(`${code.slice(0, 4)}2`, tagger, mask);
    await recordResults(again);
    expect(await ensureWallet(tagger.id)).toMatchObject({ xp: 200 });
    const twice = await progressRows(tagger.id);
    for (const entry of today) {
      const at = twice.get(`${entry.quest.id}@${entry.period}`)?.progress ?? 0;
      expect(at, entry.quest.id).toBe(satisfies(entry.quest.rule, row, hall) ? 2 : 0);
    }

    // A table of guests leaves nothing behind at all.
    await economyAfterHall({ ...lobby(4), code: "GUEST" });
    const { count } = await supabase.from("quest_progress").select("user_id", { count: "exact", head: true }).eq("user_id", tagger.id);
    expect(count).toBe(twice.size);
  });
});

import { z } from "zod";
import { GameError } from "@/game/errors";
import { supabase, unwrap } from "@/server/supabase";

/** Usernames as the profiles table constrains them. Routes parse the body and the path segment with this. */
export const username = z.string().regex(/^[a-z0-9_]{3,20}$/, "3 to 20 lowercase letters, digits or underscores");
export const usernameBody = z.object({ username });

export interface FriendsList {
  friends: { username: string; since: string }[];
  incoming: { username: string; at: string }[];
  outgoing: { username: string; at: string }[];
}

export interface FriendHall {
  username: string;
  code: string;
  playedAt: string;
  seats: string[];
  wasImposter: boolean;
  won: boolean;
  reason: string;
}

/** What every /api/friends route answers with: the lists plus the friends' recent halls. */
export interface FriendsPage extends FriendsList {
  recent: FriendHall[];
}

async function profileId(name: string): Promise<string> {
  const row = unwrap(`profile ${name}`, await supabase.from("profiles").select("id").eq("username", name).maybeSingle());
  if (row === null) throw new GameError("not-found", `No one at the table goes by ${name}.`);
  return row.id;
}

/** Both directions of one pair, for the filters below. */
function pair(a: string, b: string): string {
  return `and(requester.eq.${a},addressee.eq.${b}),and(requester.eq.${b},addressee.eq.${a})`;
}

const FRIENDSHIP = "requester, addressee, status, created_at, from:profiles!friendships_requester_fkey(username), to:profiles!friendships_addressee_fkey(username)";

export async function listFriends(userId: string): Promise<FriendsList> {
  const rows = unwrap(
    `friendships ${userId}`,
    await supabase.from("friendships").select(FRIENDSHIP).or(`requester.eq.${userId},addressee.eq.${userId}`).order("created_at", { ascending: false }),
  );
  const list: FriendsList = { friends: [], incoming: [], outgoing: [] };
  for (const row of rows) {
    const mine = row.requester === userId;
    const other = mine ? row.to.username : row.from.username;
    if (row.status === "accepted") list.friends.push({ username: other, since: row.created_at });
    else if (mine) list.outgoing.push({ username: other, at: row.created_at });
    else list.incoming.push({ username: other, at: row.created_at });
  }
  return list;
}

/**
 * Ask `name` to be friends. Idempotent while the request is pending or once accepted; when `name`
 * already asked you, this accepts instead.
 */
export async function requestFriend(userId: string, name: string): Promise<void> {
  const other = await profileId(name);
  if (other === userId) throw new GameError("invalid", "You already keep your own company.");
  const existing = unwrap(`friendship ${userId} ${other}`, await supabase.from("friendships").select("requester").or(pair(userId, other)).maybeSingle());
  if (existing === null) {
    unwrap(`request ${userId} -> ${other}`, await supabase.from("friendships").insert({ requester: userId, addressee: other, status: "pending" }));
  } else if (existing.requester === other) {
    await acceptFriend(userId, name);
  }
}

/** Accept the pending request from `name`. 404 when there is none; accepting twice is harmless. */
export async function acceptFriend(userId: string, name: string): Promise<void> {
  const other = await profileId(name);
  const rows = unwrap(
    `accept ${other} -> ${userId}`,
    await supabase.from("friendships").update({ status: "accepted" }).eq("requester", other).eq("addressee", userId).select("requester"),
  );
  if (rows.length === 0) throw new GameError("not-found", `${name} has not asked to be your friend.`);
}

/** Drop the friendship or the request, whichever direction it runs. Declining is removing. */
export async function removeFriend(userId: string, name: string): Promise<void> {
  const other = await profileId(name);
  unwrap(`remove ${userId} ${other}`, await supabase.from("friendships").delete().or(pair(userId, other)));
}

/** The last 20 recorded halls of accepted friends, newest first. Empty until a friend finishes a hall while signed in. */
export async function recentHallsWithFriends(userId: string): Promise<FriendHall[]> {
  const accepted = unwrap(
    `friends ${userId}`,
    await supabase.from("friendships").select("requester, addressee").eq("status", "accepted").or(`requester.eq.${userId},addressee.eq.${userId}`),
  );
  const ids = accepted.map((row) => (row.requester === userId ? row.addressee : row.requester));
  const rows = unwrap(
    `recent halls ${userId}`,
    await supabase
      .from("game_results")
      .select("code, played_at, seats, was_imposter, won, reason, profiles!game_results_user_id_fkey(username)")
      .in("user_id", ids)
      .order("played_at", { ascending: false })
      .limit(20),
  );
  return rows.map((row) => ({
    username: row.profiles.username,
    code: row.code,
    playedAt: row.played_at,
    seats: row.seats,
    wasImposter: row.was_imposter,
    won: row.won,
    reason: row.reason,
  }));
}

export async function friendsPage(userId: string): Promise<FriendsPage> {
  const [list, recent] = await Promise.all([listFriends(userId), recentHallsWithFriends(userId)]);
  return { ...list, recent };
}

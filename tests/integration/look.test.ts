import { afterAll, describe, expect, it } from "vitest";
import { personalize } from "@/game/view";
import { syncCatalog } from "@/server/economy/items";
import { equippedLook } from "@/server/economy/look";
import { createRoomHandler } from "@/server/handlers";
import { loadRoom } from "@/server/store";
import { supabase } from "@/server/supabase";

/* What a player wears is read from `loadouts` when the seat is taken and carried in the room state, so the view stays pure. */

const run = Date.now().toString(36);
const userIds: string[] = [];

afterAll(async () => {
  for (const id of userIds) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error !== null) throw new Error(error.message);
  }
});

/** A confirmed auth user with a profile row. No loadout row until one is written. */
async function newUser(tag: string): Promise<{ id: string; username: string }> {
  const created = await supabase.auth.admin.createUser({ email: `look-${run}-${tag}@example.test`, password: `pw-${run}-${tag}`, email_confirm: true });
  if (created.error !== null) throw new Error(created.error.message);
  const id = created.data.user.id;
  userIds.push(id);
  const username = `l${run}${tag}`.slice(0, 20);
  const profile = await supabase.from("profiles").insert({ id, username });
  if (profile.error !== null) throw new Error(profile.error.message);
  return { id, username };
}

describe("equippedLook", () => {
  it("is nothing for a guest and for an account that has equipped nothing", async () => {
    expect(await equippedLook(null)).toBeNull();
    const bare = await newUser("bare");
    expect(await equippedLook(bare)).toBeNull();
  });

  it("is the equipped row, and the host's hall carries it into the view", async () => {
    // `loadouts` points at `items`, so the catalog has to be in the table before anything can be worn.
    await syncCatalog();
    const dressed = await newUser("worn");
    const wearing = { user_id: dressed.id, avatar: "avatar-plain-hood", frame: "frame-rope", title: "title-off-by-one", badge: "badge-first-candle" };
    const { error } = await supabase.from("loadouts").insert(wearing);
    if (error !== null) throw new Error(error.message);

    expect(await equippedLook(dressed)).toEqual({ avatar: "avatar-plain-hood", frame: "frame-rope", title: "title-off-by-one", badge: "badge-first-candle" });

    const creds = await createRoomHandler("Ada", dressed);
    const saved = await loadRoom(creds.code);
    if (saved === null) throw new Error("the hall was not saved");
    const view = personalize(saved.state, creds.playerId, Date.now());
    expect(view.players[0]?.look).toEqual({ avatar: "avatar-plain-hood", frame: "frame-rope", title: "title-off-by-one", badge: "badge-first-candle" });
  });
});

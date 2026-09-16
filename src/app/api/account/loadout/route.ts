import { z } from "zod";
import { LOADOUT_SLOTS } from "@/client/api";
import { requireUser } from "@/server/auth";
import { loadoutOf, setLoadout } from "@/server/economy/inventory";
import { readBody, respond } from "@/server/handlers";

const body = z.object({ slot: z.enum(LOADOUT_SLOTS), itemId: z.string().nullable() });

/** GET (bearer) -> Loadout: one equipped item per slot, the default where nothing was chosen. */
export function GET(req: Request): Promise<Response> {
  return respond(async () => loadoutOf((await requireUser(req)).id));
}

/** POST {slot, itemId} (bearer) -> Loadout. `itemId` null clears the slot back to the default. */
export function POST(req: Request): Promise<Response> {
  return respond(async () => {
    const user = await requireUser(req);
    const { slot, itemId } = await readBody(req, body);
    return setLoadout(user.id, slot, itemId);
  });
}

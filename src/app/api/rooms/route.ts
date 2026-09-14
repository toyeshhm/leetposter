import { optionalUser } from "@/server/auth";
import { createRoomHandler, displayName, readBody, respond } from "@/server/handlers";
import { nameBody } from "@/server/validate";

/** POST {name?} (optional bearer: the account's access token) -> {code, playerId, token} */
export function POST(req: Request): Promise<Response> {
  return respond(async () => {
    const account = await optionalUser(req);
    const body = await readBody(req, nameBody);
    return createRoomHandler(displayName(body.name, account), account);
  });
}

import { createRoomHandler, readBody, respond } from "@/server/handlers";
import { nameBody } from "@/server/validate";

/** POST {name} -> {code, playerId, token} */
export function POST(req: Request): Promise<Response> {
  return respond(async () => createRoomHandler((await readBody(req, nameBody)).name));
}

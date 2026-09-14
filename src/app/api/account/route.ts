import { z } from "zod";
import { GameError } from "@/game/errors";
import { bearerToken, loadAccount, verifyToken } from "@/server/auth";
import { readBody, respond } from "@/server/handlers";
import { createProfile, username } from "@/server/profiles";

const createBody = z.object({ username });

function tokenOrThrow(req: Request): string {
  const token = bearerToken(req);
  if (token === null) throw new GameError("unauthorized", "Sign in first.");
  return token;
}

/** POST {username} with a fresh sign-up's access token -> {id, username}. Creates the profile row. */
export function POST(req: Request): Promise<Response> {
  return respond(async () => {
    const { id } = await verifyToken(tokenOrThrow(req));
    const body = await readBody(req, createBody);
    await createProfile(id, body.username);
    return { id, username: body.username };
  });
}

/** GET (bearer) -> {id, username, email} */
export function GET(req: Request): Promise<Response> {
  return respond(() => loadAccount(tokenOrThrow(req)));
}

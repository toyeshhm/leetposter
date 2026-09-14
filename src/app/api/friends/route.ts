import { requireUser } from "@/server/auth";
import { friendsPage, requestFriend, usernameBody } from "@/server/friends";
import { readBody, respond } from "@/server/handlers";

/** GET (bearer) -> FriendsPage */
export function GET(req: Request): Promise<Response> {
  return respond(async () => friendsPage((await requireUser(req)).id));
}

/** POST {username} (bearer) -> FriendsPage, after asking that person to be friends. */
export function POST(req: Request): Promise<Response> {
  return respond(async () => {
    const user = await requireUser(req);
    await requestFriend(user.id, (await readBody(req, usernameBody)).username);
    return friendsPage(user.id);
  });
}

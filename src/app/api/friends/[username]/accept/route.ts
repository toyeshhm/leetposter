import { requireUser } from "@/server/auth";
import { acceptFriend, friendsPage, username } from "@/server/friends";
import { respond } from "@/server/handlers";
import { parse } from "@/server/validate";

/** POST (bearer) -> FriendsPage, after accepting [username]'s request. */
export function POST(req: Request, ctx: { params: Promise<{ username: string }> }): Promise<Response> {
  return respond(async () => {
    const user = await requireUser(req);
    await acceptFriend(user.id, parse(username, (await ctx.params).username));
    return friendsPage(user.id);
  });
}

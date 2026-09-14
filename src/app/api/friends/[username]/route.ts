import { requireUser } from "@/server/auth";
import { friendsPage, removeFriend, username } from "@/server/friends";
import { respond } from "@/server/handlers";
import { parse } from "@/server/validate";

/** DELETE (bearer) -> FriendsPage, after removing [username] as a friend or declining their request. */
export function DELETE(req: Request, ctx: { params: Promise<{ username: string }> }): Promise<Response> {
  return respond(async () => {
    const user = await requireUser(req);
    await removeFriend(user.id, parse(username, (await ctx.params).username));
    return friendsPage(user.id);
  });
}

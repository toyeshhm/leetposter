import { z } from "zod";
import { optionalUser } from "@/server/auth";
import { respond } from "@/server/handlers";
import { BOARDS, leaderboard } from "@/server/ratings";
import { parse } from "@/server/validate";

const query = z.object({ board: z.enum(BOARDS) });

/** GET ?board=overall|crew|changeling|solves|changeling-wins (optional bearer) -> LeaderboardPage. Guests get me and ratings null, never 401. */
export function GET(req: Request): Promise<Response> {
  return respond(async () => {
    const { board } = parse(query, Object.fromEntries(new URL(req.url).searchParams));
    return leaderboard(board, await optionalUser(req));
  });
}

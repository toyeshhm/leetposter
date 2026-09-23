import { GameError } from "@/game/errors";
import { respond } from "@/server/handlers";
import { supabase, unwrap } from "@/server/supabase";

/**
 * GET (Vercel Cron, daily) -> 200 {ok}. One real query so the free-tier Supabase project never reaches
 * the 7-day inactivity pause. Vercel sends `Authorization: Bearer $CRON_SECRET`; anything else is a 401.
 */
export function GET(req: Request): Promise<Response> {
  return respond(async () => {
    const secret = process.env.CRON_SECRET;
    if (secret === undefined || secret === "" || req.headers.get("authorization") !== `Bearer ${secret}`) {
      throw new GameError("unauthorized", "Only the scheduler rings this bell.");
    }
    unwrap("keepalive", await supabase.from("rooms").select("code", { head: true, count: "exact" }));
    return { ok: true };
  });
}

import { respond } from "@/server/handlers";
import { listHalls } from "@/server/store";

/** GET -> {halls}: listed halls that moved in the last fifteen minutes. No token. */
export function GET(): Promise<Response> {
  return respond(async () => ({ halls: await listHalls() }));
}

import { respond } from "@/server/handlers";
import { problemIndex, problemQuery } from "@/server/problems";
import { parse } from "@/server/validate";

/** GET [?min&max&tag] -> {problems}: the bank index. No token; an index spoils nothing. */
export function GET(req: Request): Promise<Response> {
  const query = new URL(req.url).searchParams;
  return respond(() => Promise.resolve({ problems: problemIndex(parse(problemQuery, Object.fromEntries(query))) }));
}

import { afterEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/cron/keepalive/route";

const URL = "http://localhost/api/cron/keepalive";
const before = process.env.CRON_SECRET;

function call(authorization?: string): Promise<Response> {
  return GET(new Request(URL, { headers: authorization === undefined ? {} : { authorization } }));
}

afterEach(() => {
  if (before === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = before;
});

describe("GET /api/cron/keepalive", () => {
  it("refuses everyone while no secret is configured, even a caller who guesses 'Bearer '", async () => {
    delete process.env.CRON_SECRET;
    expect((await call("Bearer undefined")).status).toBe(401);
    process.env.CRON_SECRET = "";
    expect((await call("Bearer ")).status).toBe(401);
  });

  it("refuses a missing or wrong bearer", async () => {
    process.env.CRON_SECRET = "s3cret";
    expect((await call()).status).toBe(401);
    expect((await call("Bearer nope")).status).toBe(401);
  });

  it("queries the real database for the scheduler", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await call("Bearer s3cret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

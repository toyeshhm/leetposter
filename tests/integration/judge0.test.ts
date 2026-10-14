import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/rooms/[code]/run/route";
import type { Credentials } from "@/client/api";
import type { RunOutcome } from "@/client/pyRunner";
import { GameError } from "@/game/errors";
import { createRoomHandler } from "@/server/handlers";
import { runOnJudge } from "@/server/judge/judge0";

/** Every test here compiles and runs on the real judge (ce.judge0.com unless JUDGE0_URL says otherwise). */
const NETWORK = { timeout: 60_000 };

const javaMain = (body: string): string => `import java.util.*;\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        ${body}\n    }\n}\n`;

/** POST to the hall's run route as `token`, with the route's own params. */
function run(code: string, token: string, body: unknown): Promise<Response> {
  const req = new Request(`http://test/api/rooms/${code}/run`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  return POST(req, { params: Promise.resolve({ code }) });
}

async function failsUpstream(work: Promise<unknown>, message: RegExp): Promise<void> {
  const error = await work.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(GameError);
  expect((error as GameError).code).toBe("upstream");
  expect((error as GameError).message).toMatch(message);
}

describe("runOnJudge", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("compiles and runs Java 17 with the input as stdin", NETWORK, async () => {
    const outcome = await runOnJudge("java", javaMain('Scanner in = new Scanner(System.in); var sum = in.nextInt() + in.nextInt(); System.out.println("sum=" + sum);'), "2 40\n");
    expect(outcome.stdout).toBe("sum=42\n");
    expect(outcome.stderr).toBe("");
    expect(outcome.timedOut).toBe(false);
    expect(outcome.ms).toBeGreaterThan(0);
  });

  it("keeps a compiler warning out of stderr when the program compiled and ran", NETWORK, async () => {
    // new StreamTokenizer(InputStream) is deprecated: javac prints a Note, and the run is still clean.
    const outcome = await runOnJudge("java", `import java.io.*;\n${javaMain("StreamTokenizer in = new StreamTokenizer(System.in); in.nextToken(); System.out.println((int) in.nval * 2);")}`, "21");
    expect(outcome).toMatchObject({ stdout: "42\n", stderr: "", timedOut: false });
  });

  it("hands a compile error back as the compiler wrote it", NETWORK, async () => {
    const outcome = await runOnJudge("java", javaMain("int x = ;"), "");
    expect(outcome.stdout).toBe("");
    expect(outcome.stderr).toContain("Main.java:4: error: illegal start of expression");
    expect(outcome.timedOut).toBe(false);
    expect(outcome.ms).toBe(0);
  });

  it("hands an uncaught exception back with what was printed before it", NETWORK, async () => {
    const outcome = await runOnJudge("java", javaMain('System.out.println("before"); int[] a = new int[1]; System.out.println(a[5]);'), "");
    expect(outcome.stdout).toBe("before\n");
    expect(outcome.stderr).toContain("java.lang.ArrayIndexOutOfBoundsException");
    expect(outcome.stderr).toContain("Exited with error status 1");
    expect(outcome.timedOut).toBe(false);
  });

  it("cuts a loop off at the time limit", NETWORK, async () => {
    const outcome = await runOnJudge("java", javaMain("while (true) {}"), "");
    expect(outcome).toMatchObject({ stdout: "", stderr: "", timedOut: true });
  });

  it("runs C++, Go and Rust on the same judge", { timeout: 120_000 }, async () => {
    const programs = [
      ["cpp", '#include <iostream>\nint main() { int a, b; std::cin >> a >> b; std::cout << a + b << "\\n"; }\n'],
      ["go", 'package main\nimport "fmt"\nfunc main() { var a, b int; fmt.Scan(&a, &b); fmt.Println(a + b) }\n'],
      ["rust", 'use std::io::Read;\nfn main() { let mut s = String::new(); std::io::stdin().read_to_string(&mut s).unwrap(); let n: i32 = s.split_whitespace().map(|x| x.parse::<i32>().unwrap()).sum(); println!("{}", n); }\n'],
    ] as const;
    // One at a time: the public judge throttles per IP, and three compiles at once is how a test run trips it.
    for (const [language, source] of programs) {
      expect((await runOnJudge(language, source, "2 40")).stdout, language).toBe("42\n");
    }
  });

  it("says upstream when the judge is still working after the last poll", NETWORK, async () => {
    await failsUpstream(runOnJudge("java", javaMain("Thread.sleep(4000);"), "", undefined, 1), /taking too long/);
  });

  it("says upstream when the judge cannot be reached or answers something else", NETWORK, async () => {
    vi.stubEnv("JUDGE0_URL", "http://127.0.0.1:1");
    await failsUpstream(runOnJudge("java", javaMain(""), ""), /did not answer/);
    await failsUpstream(runOnJudge("java", javaMain(""), "", "https://ce.judge0.com/nope"), /did not answer/);
  });
});

describe("POST /api/rooms/[code]/run", () => {
  let seat: Credentials;
  beforeAll(async () => {
    seat = await createRoomHandler("Ada", null);
  });

  it("runs a judged language for a seat in the hall and answers the outcome", NETWORK, async () => {
    const res = await run(seat.code, seat.token, { language: "java", code: javaMain('System.out.println("hall");'), stdin: "" });
    expect(res.status).toBe(200);
    expect(((await res.json()) as RunOutcome).stdout).toBe("hall\n");
  });

  it("is no relay: a token that holds no seat in the hall is refused before anything reaches the judge", async () => {
    const res = await run(seat.code, "0".repeat(32), { language: "java", code: javaMain(""), stdin: "" });
    expect(res.status).toBe(401);
  });

  it("rejects a language the judge does not take, and a body out of bounds, with 400", async () => {
    const bodies = [{ language: "python", code: "print(1)", stdin: "" }, { language: "java", code: "", stdin: "" }, { language: "java", code: "x", stdin: "x".repeat(1_000_001) }];
    const answers = await Promise.all(bodies.map((body) => run(seat.code, seat.token, body)));
    for (const res of answers) expect(res.status).toBe(400);
    expect(await Promise.all(answers.map(async (res) => ((await res.json()) as { code: string }).code))).toEqual(["invalid", "invalid", "invalid"]);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/run/route";
import type { RunOutcome } from "@/client/pyRunner";
import { GameError } from "@/game/errors";
import { runOnJudge } from "@/server/judge/judge0";

/** Every test here compiles and runs on the real judge (ce.judge0.com unless JUDGE0_URL says otherwise). */
const NETWORK = { timeout: 60_000 };

const javaMain = (body: string): string => `import java.util.*;\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        ${body}\n    }\n}\n`;

function post(body: unknown): Request {
  return new Request("http://test/api/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
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

  it("runs C++, Go and Rust on the same judge", NETWORK, async () => {
    const outcomes = await Promise.all([
      runOnJudge("cpp", '#include <iostream>\nint main() { int a, b; std::cin >> a >> b; std::cout << a + b << "\\n"; }\n', "2 40"),
      runOnJudge("go", 'package main\nimport "fmt"\nfunc main() { var a, b int; fmt.Scan(&a, &b); fmt.Println(a + b) }\n', "2 40"),
      runOnJudge("rust", 'use std::io::Read;\nfn main() { let mut s = String::new(); std::io::stdin().read_to_string(&mut s).unwrap(); let n: i32 = s.split_whitespace().map(|x| x.parse::<i32>().unwrap()).sum(); println!("{}", n); }\n', "2 40"),
    ]);
    expect(outcomes.map((o) => o.stdout)).toEqual(["42\n", "42\n", "42\n"]);
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

describe("POST /api/run", () => {
  it("runs a judged language and answers the outcome", NETWORK, async () => {
    const res = await POST(post({ language: "java", code: javaMain('System.out.println("hall");'), stdin: "" }));
    expect(res.status).toBe(200);
    expect(((await res.json()) as RunOutcome).stdout).toBe("hall\n");
  });

  it("rejects a language the judge does not take, and a body out of bounds, with 400", async () => {
    for (const body of [{ language: "python", code: "print(1)", stdin: "" }, { language: "java", code: "", stdin: "" }, { language: "java", code: "x", stdin: "x".repeat(1_000_001) }]) {
      const res = await POST(post(body));
      expect(res.status).toBe(400);
      expect(((await res.json()) as { code: string }).code).toBe("invalid");
    }
  });
});

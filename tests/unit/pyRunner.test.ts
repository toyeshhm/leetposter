import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { PY_PRELUDE, parseWorkerMessage, runnable } from "@/client/pyRunner";

/** The prelude as Pyodide runs it, through the real python3 on this machine: __run(code, stdin) -> [stdout, stderr]. */
function runPrelude(code: string, stdin: string): [string, string] {
  const script = `${PY_PRELUDE}\nimport sys\nprint(__run(sys.argv[1], sys.argv[2]))`;
  const parsed: unknown = JSON.parse(execFileSync("python3", ["-c", script, code, stdin], { encoding: "utf8" }));
  if (!Array.isArray(parsed) || parsed.length !== 2 || typeof parsed[0] !== "string" || typeof parsed[1] !== "string") throw new Error(`not a pair: ${JSON.stringify(parsed)}`);
  return [parsed[0], parsed[1]];
}

describe("PY_PRELUDE", () => {
  it("feeds stdin, captures stdout, and restores the real streams (the caller's print still lands on stdout)", () => {
    expect(runPrelude("a, b = map(int, input().split())\nprint(a + b)", "2 3\n")).toEqual(["5\n", ""]);
  });

  it("captures a traceback on stderr without the prelude's own frame, and keeps what was printed before it", () => {
    const [out, err] = runPrelude("print('before')\nx = 1 / 0", "");
    expect(out).toBe("before\n");
    expect(err).toContain("ZeroDivisionError");
    expect(err).toContain('File "main.py", line 2');
    expect(err).not.toContain("exec(compile");
  });

  it("reports a syntax error and an empty stdin as errors, and sys.exit as a clean end", () => {
    expect(runPrelude("print(", "")[1]).toContain("SyntaxError");
    expect(runPrelude("input()", "")[1]).toContain("EOFError");
    expect(runPrelude("import sys\nprint('bye')\nsys.exit(3)", "")).toEqual(["bye\n", ""]);
  });
});

describe("parseWorkerMessage", () => {
  it("accepts the three message kinds and rejects anything else", () => {
    expect(parseWorkerMessage({ kind: "loaded" })).toEqual({ kind: "loaded" });
    expect(parseWorkerMessage({ kind: "result", stdout: "5\n", stderr: "", ms: 12 })).toEqual({ kind: "result", stdout: "5\n", stderr: "", ms: 12 });
    expect(parseWorkerMessage({ kind: "fail", message: "no wasm" })).toEqual({ kind: "fail", message: "no wasm" });
    expect(() => parseWorkerMessage({ kind: "result", stdout: 5 })).toThrow();
    expect(() => parseWorkerMessage("loaded")).toThrow();
  });
});

describe("runnable", () => {
  it("is Python and JavaScript, nothing else", () => {
    expect(runnable("python")).toBe(true);
    expect(runnable("javascript")).toBe(true);
    expect(runnable("cpp")).toBe(false);
    expect(runnable("")).toBe(false);
  });
});

import { z } from "zod";

/** The version the Pyodide quickstart pins today (Python 3.14). Loaded from the CDN on the first Run, never bundled. */
export const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";
export const RUN_TIMEOUT_MS = 10_000;

/** What the hall can run in the browser. Everything else needs a judge. */
export const RUNNABLE = ["python", "javascript"] as const;
export type Runnable = (typeof RUNNABLE)[number];

export function runnable(language: string): language is Runnable {
  return RUNNABLE.some((l) => l === language);
}

export interface RunRequest {
  code: string;
  stdin: string;
}

/** Posted once the runtime is up and the code is about to start; the 10 s clock starts here, not at the download. */
export interface LoadedMessage {
  kind: "loaded";
}
export interface ResultMessage {
  kind: "result";
  stdout: string;
  stderr: string;
  ms: number;
}
/** The runtime could not be fetched or set up; the worker is thrown away. */
export interface FailMessage {
  kind: "fail";
  message: string;
}
export type WorkerMessage = LoadedMessage | ResultMessage | FailMessage;

const workerMessage: z.ZodType<WorkerMessage> = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("loaded") }),
  z.object({ kind: z.literal("result"), stdout: z.string(), stderr: z.string(), ms: z.number() }),
  z.object({ kind: z.literal("fail"), message: z.string() }),
]);

export function parseWorkerMessage(data: unknown): WorkerMessage {
  return workerMessage.parse(data);
}

export interface RunOutcome {
  stdout: string;
  stderr: string;
  ms: number;
  timedOut: boolean;
}

/**
 * The Python side. `__run(code, stdin)` feeds the string as stdin, runs the file as `__main__` with
 * stdout and stderr captured, and answers a JSON pair [stdout, stderr]. A traceback drops the frame
 * that belongs to this prelude; `sys.exit()` is not an error.
 */
export const PY_PRELUDE = `
import io, json, sys, traceback

def __run(code, stdin):
    keep = sys.stdin, sys.stdout, sys.stderr
    sys.stdin, sys.stdout, sys.stderr = io.StringIO(stdin), io.StringIO(), io.StringIO()
    try:
        exec(compile(code, "main.py", "exec"), {"__name__": "__main__"})
    except SystemExit:
        pass
    except BaseException as e:
        tb = e.__traceback__
        sys.stderr.write("".join(traceback.format_exception(type(e), e, None if tb is None else tb.tb_next)))
    out, err = sys.stdout.getvalue(), sys.stderr.getvalue()
    sys.stdin, sys.stdout, sys.stderr = keep
    return json.dumps([out, err])
`;

/* Worker bodies, as source: one Blob-URL module worker per language per page (Pyodide 314 no longer loads in a classic worker). Untyped by nature; the messages they post are parsed above. */
const PYTHON_WORKER = `
import { loadPyodide } from ${JSON.stringify(`${PYODIDE_URL}pyodide.mjs`)};
let py = null;
self.onmessage = async ({ data }) => {
  try {
    if (py === null) {
      py = await loadPyodide({ indexURL: ${JSON.stringify(PYODIDE_URL)} });
      py.runPython(${JSON.stringify(PY_PRELUDE)});
    }
    self.postMessage({ kind: "loaded" });
    const t0 = performance.now();
    const run = py.globals.get("__run");
    const [stdout, stderr] = JSON.parse(run(data.code, data.stdin));
    run.destroy();
    self.postMessage({ kind: "result", stdout, stderr, ms: Math.round(performance.now() - t0) });
  } catch (e) {
    self.postMessage({ kind: "fail", message: String(e) });
  }
};
`;

/* ponytail: stdin is readline() or require("fs").readFileSync(...); console.log/error and process.stdout.write are the output. No Node beyond that. */
const JAVASCRIPT_WORKER = `
self.onmessage = ({ data }) => {
  const lines = data.stdin.split("\\n");
  let out = "", err = "", i = 0;
  const readline = () => lines[i++] ?? "";
  const console = { log: (...a) => { out += a.map(String).join(" ") + "\\n"; }, error: (...a) => { err += a.map(String).join(" ") + "\\n"; } };
  const require = (m) => (m === "fs" ? { readFileSync: () => data.stdin } : {});
  const process = { stdout: { write: (s) => { out += String(s); } }, stdin: {} };
  self.postMessage({ kind: "loaded" });
  const t0 = performance.now();
  try {
    new Function("console", "readline", "require", "process", data.code)(console, readline, require, process);
  } catch (e) {
    err += (e instanceof Error && e.stack ? e.stack : String(e)) + "\\n";
  }
  self.postMessage({ kind: "result", stdout: out, stderr: err, ms: Math.round(performance.now() - t0) });
};
`;

const WORKER_SOURCE: Record<Runnable, string> = { python: PYTHON_WORKER, javascript: JAVASCRIPT_WORKER };

/* One live worker per language for the page: Pyodide stays loaded between runs. A worker is replaced only after a timeout or a failure. */
const workers = new Map<Runnable, Worker>();

function workerFor(language: Runnable): Worker {
  const live = workers.get(language);
  if (live !== undefined) return live;
  // ponytail: the blob URL is never revoked (a few KB per page); revoking it before the worker has fetched its script breaks some browsers.
  const worker = new Worker(URL.createObjectURL(new Blob([WORKER_SOURCE[language]], { type: "text/javascript" })), { type: "module" });
  workers.set(language, worker);
  return worker;
}

/**
 * Run `request.code` with `request.stdin` in this browser and resolve with what it printed. `onLoaded`
 * fires when the runtime is ready (after the first Python run's download); the run is cut off
 * RUN_TIMEOUT_MS after that, the worker terminated (a busy worker cannot be interrupted) and the
 * outcome marked `timedOut`. Rejects when the runtime cannot be set up.
 * ponytail: one run at a time per language; the panel disables its button while a run is out.
 */
export function runCode(language: Runnable, request: RunRequest, onLoaded: () => void): Promise<RunOutcome> {
  return new Promise((resolve, reject) => {
    const worker = workerFor(language);
    let timer: ReturnType<typeof setTimeout> | null = null;
    const done = (): void => {
      if (timer !== null) clearTimeout(timer);
      worker.onmessage = null;
      worker.onerror = null;
    };
    const drop = (): void => {
      worker.terminate();
      workers.delete(language);
    };
    worker.onmessage = (event: MessageEvent<unknown>) => {
      const message = parseWorkerMessage(event.data);
      switch (message.kind) {
        case "loaded":
          onLoaded();
          timer = setTimeout(() => {
            done();
            drop();
            resolve({ stdout: "", stderr: "", ms: RUN_TIMEOUT_MS, timedOut: true });
          }, RUN_TIMEOUT_MS);
          return;
        case "result":
          done();
          resolve({ stdout: message.stdout, stderr: message.stderr, ms: message.ms, timedOut: false });
          return;
        case "fail":
          done();
          drop();
          reject(new Error(message.message));
      }
    };
    worker.onerror = (event: ErrorEvent) => {
      done();
      drop();
      reject(new Error(event.message === "" ? "The runtime could not be loaded." : event.message));
    };
    worker.postMessage(request);
  });
}

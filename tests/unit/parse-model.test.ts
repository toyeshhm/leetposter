import { afterEach, describe, expect, it, vi } from "vitest";
import { GameError } from "@/game/errors";
import { groqKey, parseWithGroq, readCompletion } from "@/server/parse/groq";

const fields = { title: " Two Sum ", url: "https://leetcode.com/problems/two-sum/", statement: "s", examples: "e", tags: [" Array ", ""], hints: ["", "h"], constraints: "c" };
const envelope = (content: string): unknown => ({ choices: [{ message: { content } }] });

function invalid(body: unknown): string {
  let caught: unknown;
  try {
    readCompletion(body);
  } catch (error: unknown) {
    caught = error;
  }
  if (!(caught instanceof GameError)) throw new Error(`expected GameError, got ${String(caught)}`);
  expect(caught.code).toBe("invalid");
  return caught.message;
}

describe("readCompletion", () => {
  it("reads, trims and drops empty tags and hints", () => {
    const parsed = readCompletion(envelope(JSON.stringify(fields)));
    expect(parsed.source).toBe("llm");
    expect(parsed.confidence).toBe("high");
    expect(parsed.problem).toEqual({ ...fields, title: "Two Sum", tags: ["Array"], hints: ["h"] });
  });

  it("falls back to the slug url when the model's url does not parse", () => {
    const parsed = readCompletion(envelope(JSON.stringify({ ...fields, url: "not a url" })));
    expect(parsed.problem.url).toBe("https://leetcode.com/problems/two-sum/");
  });

  it("rejects an envelope without choices", () => {
    expect(invalid({ choices: [] })).toContain("unexpected shape");
    expect(invalid(null)).toContain("unexpected shape");
  });

  it("rejects content that is not JSON", () => {
    expect(invalid(envelope("{not json"))).toContain("not answer with JSON");
  });

  it("rejects JSON missing any of the seven fields", () => {
    expect(invalid(envelope(JSON.stringify({ title: "x" })))).toContain("seven fields");
    expect(invalid(envelope(JSON.stringify({ ...fields, hints: "not an array" })))).toContain("seven fields");
  });
});

describe("groqKey", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is null when the variable is unset or empty", async () => {
    vi.stubEnv("GROQ_API_KEY", undefined);
    expect(groqKey()).toBeNull();
    await expect(parseWithGroq("x")).rejects.toThrow("GROQ_API_KEY is not set");
    vi.stubEnv("GROQ_API_KEY", "");
    expect(groqKey()).toBeNull();
  });

  it("is the key otherwise", () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_test");
    expect(groqKey()).toBe("gsk_test");
  });
});

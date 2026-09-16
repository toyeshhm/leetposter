import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseZerotrac } from "@/server/rating/zerotrac";

/** Thirty real lines off zerotrac's list: the header, the rows around 1912, and the trailing newline. */
const excerpt = readFileSync("tests/fixtures/zerotrac-excerpt.txt", "utf8");
const table = parseZerotrac(excerpt);

describe("parseZerotrac", () => {
  it("indexes every row by frontend id and by slug, rounded to a whole rating", () => {
    expect(table.byId.size).toBe(29);
    expect(table.bySlug.size).toBe(29);
    expect(table.byId.get("1147")).toBe(1912);
    expect(table.bySlug.get("longest-chunked-palindrome-decomposition")).toBe(1912);
    expect(table.byId.get("1373")).toBe(1914);
  });

  it("keeps the header row and the blank last line out of the table", () => {
    expect(table.byId.has("ID")).toBe(false);
    expect(table.bySlug.has("title slug")).toBe(false);
    expect(table.bySlug.has("")).toBe(false);
  });

  it("has nothing to say about a problem the excerpt does not carry", () => {
    expect(table.bySlug.get("two-sum")).toBeUndefined();
  });
});

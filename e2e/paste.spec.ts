import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { NAMES, openHall } from "./helpers";

const twoSum = readFileSync("tests/fixtures/leetcode-two-sum.txt", "utf8");

test("the host types a problem number and the form fills itself from LeetCode", async ({ page }) => {
  await openHall(page, NAMES[0]);
  const problem = page.getByRole("group", { name: "The problem" });
  await problem.getByLabel("Problem").fill("1147");
  await problem.getByRole("button", { name: "Sort it out" }).click();
  await expect(problem.getByRole("status")).toHaveText("Fetched from LeetCode.", { timeout: 30_000 });

  await expect(problem.getByLabel("Title")).toHaveValue("Longest Chunked Palindrome Decomposition");
  await expect(problem.getByLabel("Link")).toHaveValue("https://leetcode.com/problems/longest-chunked-palindrome-decomposition/");
  await expect(problem.getByLabel("Statement")).toHaveValue(/subtext_1/);
  await expect(problem.getByLabel("Statement")).toHaveValue(/Example 3:/);
  await expect(problem.getByLabel("Statement")).not.toHaveValue(/Constraints:/);
  await expect(problem.getByLabel("Tags", { exact: true })).toHaveValue("Two Pointers, String, Dynamic Programming, Greedy, Rolling Hash, Hash Function");
  const hints = (await problem.getByLabel("Hints", { exact: true }).inputValue()).split("\n");
  expect(hints).toHaveLength(2);
  expect(hints[0]).toContain("rolling hash");
  await expect(problem.getByLabel("Constraints")).toHaveValue("1 <= text.length <= 1000\ntext consists only of lowercase English characters.");

  await problem.getByRole("button", { name: "Set the problem" }).click();
  await expect(problem.getByRole("status").last()).toHaveText("The problem is set. Panels are dealt when the reading begins.");
});

test("a problem LeetCode lists no hints for is still set from its number alone", async ({ page }) => {
  await openHall(page, NAMES[0]);
  const problem = page.getByRole("group", { name: "The problem" });
  await problem.getByLabel("Problem").fill("#42");
  await problem.getByRole("button", { name: "Sort it out" }).click();
  await expect(problem.getByRole("status")).toHaveText(/^Fetched from LeetCode\. No hints found, so the Oracle's panel is empty\./, { timeout: 30_000 });

  await expect(problem.getByLabel("Title")).toHaveValue("Trapping Rain Water");
  await expect(problem.getByLabel("Hints", { exact: true })).toHaveValue("");

  await problem.getByRole("button", { name: "Set the problem" }).click();
  await expect(problem.getByRole("status").last()).toHaveText("The problem is set. Panels are dealt when the reading begins.");
});

test("only a link in the Link field, or only a number in the Title field, sets the problem", async ({ page }) => {
  await openHall(page, NAMES[0]);
  const problem = page.getByRole("group", { name: "The problem" });
  await problem.getByLabel("Link").fill("https://leetcode.com/problems/trapping-rain-water/description/");
  await problem.getByRole("button", { name: "Set the problem" }).click();
  await expect(problem.getByRole("status")).toHaveText("The problem is set. Panels are dealt when the reading begins.", { timeout: 30_000 });
  await expect(problem.getByLabel("Title")).toHaveValue("Trapping Rain Water");
  await expect(problem.getByLabel("Link")).toHaveValue("https://leetcode.com/problems/trapping-rain-water/");
  await expect(problem.getByLabel("Statement")).toHaveValue(/elevation map/);

  for (const label of ["Link", "Statement", "Tags", "Hints", "Constraints"]) await problem.getByLabel(label, { exact: true }).fill("");
  await problem.getByLabel("Title").fill("1147");
  await problem.getByRole("button", { name: "Replace the problem" }).click();
  await expect(problem.getByLabel("Title")).toHaveValue("Longest Chunked Palindrome Decomposition", { timeout: 30_000 });
  await expect(problem.getByRole("status")).toHaveText("The problem is set. Panels are dealt when the reading begins.");
});

test("a title LeetCode does not know says so, and the form still asks for what is missing", async ({ page }) => {
  await openHall(page, NAMES[0]);
  const problem = page.getByRole("group", { name: "The problem" });
  await problem.getByLabel("Title").fill("zzzqqqxxx not a problem");
  await problem.getByRole("button", { name: "Set the problem" }).click();
  await expect(problem.getByRole("alert").filter({ hasText: "LeetCode has no problem called zzzqqqxxx not a problem." })).toBeVisible({ timeout: 30_000 });
  await expect(problem.getByText("Everyone reads the statement. Paste it.")).toBeVisible();
});

test("the host pastes a whole LeetCode page and the form fills itself", async ({ page }) => {
  await openHall(page, NAMES[0]);
  const problem = page.getByRole("group", { name: "The problem" });
  await problem.getByLabel("Problem").fill(twoSum);
  await problem.getByRole("button", { name: "Sort it out" }).click();
  await expect(problem.getByRole("status")).toHaveText("Sorted by the parser, checked against LeetCode.", { timeout: 30_000 });

  await expect(problem.getByLabel("Title")).toHaveValue("Two Sum");
  await expect(problem.getByLabel("Link")).toHaveValue("https://leetcode.com/problems/two-sum/");
  await expect(problem.getByLabel("Statement")).toHaveValue(/return indices of the two numbers/);
  await expect(problem.getByLabel("Statement")).toHaveValue(/Example 3:/);
  await expect(problem.getByLabel("Statement")).not.toHaveValue(/Constraints:/);
  await expect(problem.getByLabel("Tags", { exact: true })).toHaveValue("Array, Hash Table");
  const hints = (await problem.getByLabel("Hints", { exact: true }).inputValue()).split("\n");
  expect(hints).toHaveLength(3);
  expect(hints[2]).toContain("hash map");
  await expect(problem.getByLabel("Constraints")).toHaveValue(/2 <= nums.length <= 10\^4/);

  await problem.getByRole("button", { name: "Set the problem" }).click();
  await expect(problem.getByRole("status").last()).toHaveText("The problem is set. Panels are dealt when the reading begins.");
});

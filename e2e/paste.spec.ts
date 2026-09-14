import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { NAMES, openHall } from "./helpers";

const twoSum = readFileSync("tests/fixtures/leetcode-two-sum.txt", "utf8");

test("the host pastes a whole LeetCode page and the form fills itself", async ({ page }) => {
  await openHall(page, NAMES[0]);
  const problem = page.getByRole("group", { name: "The problem" });
  await problem.getByLabel("Paste the whole page").fill(twoSum);
  await problem.getByRole("button", { name: "Sort it out" }).click();
  await expect(problem.getByRole("status")).toHaveText("Sorted by the parser.");

  await expect(problem.getByLabel("Title")).toHaveValue("Two Sum");
  await expect(problem.getByLabel("Link")).toHaveValue("https://leetcode.com/problems/two-sum/");
  await expect(problem.getByLabel("Statement")).toHaveValue(/return indices of the two numbers/);
  await expect(problem.getByLabel("Examples")).toHaveValue(/Example 3:/);
  await expect(problem.getByLabel("Tags", { exact: true })).toHaveValue("Array, Hash Table");
  const hints = (await problem.getByLabel("Hints", { exact: true }).inputValue()).split("\n");
  expect(hints).toHaveLength(3);
  expect(hints[2]).toContain("hash map");
  await expect(problem.getByLabel("Constraints")).toHaveValue(/2 <= nums.length <= 10\^4/);

  await problem.getByRole("button", { name: "Set the problem" }).click();
  await expect(problem.getByRole("status").last()).toHaveText("The problem is set. Panels are dealt when the reading begins.");
});

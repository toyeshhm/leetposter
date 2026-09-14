import { expect, test, type Page } from "@playwright/test";
import { supabase } from "@/server/supabase";

const suffix = crypto.randomUUID().slice(0, 6);
const ADA = `e2e_ada_${suffix}`;
const BRIN = `e2e_brin_${suffix}`;

/** /account, the sign-up side of the form, through to the signed-in frame. */
async function signUp(page: Page, username: string): Promise<void> {
  await page.goto("/account");
  await page.getByRole("button", { name: "New here? Sign up" }).click();
  await page.getByLabel("Email").fill(`${username}@friends.test`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await page.getByLabel("Username").fill(username);
  await page.getByRole("button", { name: "Take the name" }).click();
  await expect(page.getByText(`Signed in as @${username}`)).toBeVisible();
}

test.afterAll(async () => {
  // Deleting the auth users cascades to profiles and friendships.
  const { data, error } = await supabase.from("profiles").select("id").in("username", [ADA, BRIN]);
  if (error !== null) throw new Error(error.message);
  for (const row of data) {
    const deleted = await supabase.auth.admin.deleteUser(row.id);
    if (deleted.error !== null) throw new Error(deleted.error.message);
  }
});

test("two players become friends by username", async ({ browser }) => {
  const ada = await (await browser.newContext()).newPage();
  const brin = await (await browser.newContext()).newPage();
  await signUp(ada, ADA);
  await signUp(brin, BRIN);

  await ada.goto("/friends");
  await ada.getByLabel("Their username").fill(BRIN);
  await ada.getByRole("button", { name: "Send the request" }).click();
  await expect(ada.getByText(`@${BRIN} has not answered yet.`)).toBeVisible();

  await brin.goto("/friends");
  await expect(brin.getByText(`@${ADA} asks to be your friend.`)).toBeVisible();
  await brin.getByRole("button", { name: "Accept" }).click();
  await expect(brin.getByRole("list", { name: "Your friends" })).toContainText(`@${ADA}`);

  await ada.reload();
  await expect(ada.getByRole("list", { name: "Your friends" })).toContainText(`@${BRIN}`);
  await expect(ada.getByText("has not answered yet")).toHaveCount(0);

  await ada.context().close();
  await brin.context().close();
});

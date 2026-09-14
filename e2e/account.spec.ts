import { expect, test } from "@playwright/test";
import { supabase } from "@/server/supabase";

const run = Date.now().toString(36);
const username = `e2e_${run}`;
const email = `e2e-${run}@example.test`;
const password = `pw-${run}-long-enough`;

test.afterAll(async () => {
  const { data, error } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  if (error !== null) throw new Error(error.message);
  if (data === null) return;
  const gone = await supabase.auth.admin.deleteUser(data.id);
  if (gone.error !== null) throw new Error(gone.error.message);
});

test("sign up, open a hall as the account, see the username at the table, sign out", async ({ page }) => {
  await page.goto("/account");
  const nav = page.getByRole("navigation", { name: "Account" });
  await expect(nav.getByRole("link", { name: "Sign in" })).toBeVisible();

  await page.getByRole("button", { name: "New here? Sign up" }).click();
  const form = page.getByRole("group", { name: "Sign up" });
  await form.getByLabel("Username").fill(username);
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password").fill(password);
  await form.getByRole("button", { name: "Sign up" }).click();

  await expect(nav.getByRole("link", { name: `@${username}` })).toBeVisible();
  await expect(page.getByRole("group", { name: "Your seat" })).toContainText(`@${username}`);

  // The landing prefills the name from the account and attaches the seat to it. Both buttons stay
  // disabled until the session is known, so a fast click never takes a guest seat: hold the profile
  // lookup, check the buttons, then let it through.
  let release = (): void => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/account", async (route) => {
    if (route.request().method() === "GET") await held;
    await route.continue();
  });
  await page.goto("/");
  const create = page.getByRole("group", { name: "Create a hall" });
  const open = create.getByRole("button", { name: "Open the hall" });
  await expect(open).toBeDisabled();
  await expect(page.getByRole("group", { name: "Join a hall" }).getByRole("button", { name: "Take a seat" })).toBeDisabled();
  release();
  await expect(create.getByLabel("Your name")).toHaveValue(username);
  await expect(open).toBeEnabled();
  await open.click();
  await page.waitForURL(/\/room\/[A-Z]{5}$/);
  await expect(page.getByRole("group", { name: "At the table" })).toContainText(`as @${username}`);

  await page.getByRole("link", { name: "Leave the hall" }).click();
  await page.getByRole("navigation", { name: "Account" }).getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("navigation", { name: "Account" }).getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(create.getByLabel("Your name")).toHaveValue("");
});

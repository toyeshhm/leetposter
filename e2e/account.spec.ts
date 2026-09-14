import { expect, test } from "@playwright/test";
import { supabase } from "@/server/supabase";

const run = Date.now().toString(36);
const username = `e2e_${run}`;
const email = `e2e-${run}@example.test`;
const password = `pw-${run}-long-enough`;
// The second test's user: a confirmed auth user with no profile row, as a sign-up left behind while email confirmation was on.
const oldName = `old_${run}`;
const oldEmail = `e2e-old-${run}@example.test`;
const userIds = new Set<string>();

test.afterAll(async () => {
  const { data, error } = await supabase.from("profiles").select("id").in("username", [username, oldName]);
  if (error !== null) throw new Error(error.message);
  for (const row of data) userIds.add(row.id);
  for (const id of userIds) {
    const gone = await supabase.auth.admin.deleteUser(id);
    if (gone.error !== null) throw new Error(gone.error.message);
  }
});

test("sign up, choose a name, open a hall as the account, see the username at the table, sign out", async ({ page }) => {
  await page.goto("/account");
  const nav = page.getByRole("navigation", { name: "Account" });
  await expect(nav.getByRole("link", { name: "Sign in" })).toBeVisible();

  await page.getByRole("button", { name: "New here? Sign up" }).click();
  const form = page.getByRole("group", { name: "Sign up" });
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password").fill(password);
  await form.getByRole("button", { name: "Sign up" }).click();

  // Sign-up lands on the name step; the nav says so too.
  const step = page.getByRole("group", { name: "Choose your name" });
  await expect(nav.getByRole("link", { name: "Choose your name" })).toBeVisible();
  await step.getByLabel("Username").fill(username);
  await step.getByRole("button", { name: "Take the name" }).click();

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

test("an auth user with no profile signs in, is sent to choose a name, and then plays as the account", async ({ page }) => {
  const created = await supabase.auth.admin.createUser({ email: oldEmail, password, email_confirm: true });
  if (created.error !== null) throw new Error(created.error.message);
  userIds.add(created.data.user.id);

  await page.goto("/account");
  const form = page.getByRole("group", { name: "Sign in" });
  await form.getByLabel("Email").fill(oldEmail);
  await form.getByLabel("Password").fill(password);
  await form.getByRole("button", { name: "Sign in" }).click();

  const nav = page.getByRole("navigation", { name: "Account" });
  const step = page.getByRole("group", { name: "Choose your name" });
  await expect(step).toBeVisible();
  await expect(nav.getByRole("link", { name: "Choose your name" })).toBeVisible();

  // Until the name is chosen the landing warns that a seat taken now is a guest's.
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("no name yet");
  await expect(page.getByRole("group", { name: "Create a hall" }).getByLabel("Your name")).toHaveValue("");

  await page.getByRole("status").getByRole("link", { name: "Choose your name" }).click();
  await page.waitForURL(/\/account$/);
  await step.getByLabel("Username").fill(username);
  await step.getByRole("button", { name: "Take the name" }).click();
  await expect(step.getByRole("alert")).toHaveText("That name is taken.");
  await step.getByLabel("Username").fill(oldName);
  await step.getByRole("button", { name: "Take the name" }).click();

  await expect(nav.getByRole("link", { name: `@${oldName}` })).toBeVisible();
  await expect(page.getByRole("group", { name: "Your seat" })).toContainText(`@${oldName}`);

  await page.goto("/");
  const create = page.getByRole("group", { name: "Create a hall" });
  await expect(create.getByLabel("Your name")).toHaveValue(oldName);
  await create.getByRole("button", { name: "Open the hall" }).click();
  await page.waitForURL(/\/room\/[A-Z]{5}$/);
  await expect(page.getByRole("group", { name: "At the table" })).toContainText(`as @${oldName}`);
});

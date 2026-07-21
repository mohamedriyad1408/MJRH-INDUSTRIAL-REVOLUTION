import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_AUTH_EMAIL;
const password = process.env.E2E_AUTH_PASSWORD;
const runAuthenticated = Boolean(email && password);

async function expectNoPageErrors(page: Page, run: () => Promise<void>) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await run();
  expect(errors, `Unexpected browser errors: ${errors.join(" | ")}`).toEqual([]);
}

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email!);
  await page.locator('input[type="password"]').fill(password!);
  await page.locator('button[type="submit"]').first().click();
  // Wait for the login screen to disappear or for a dashboard-like element to appear
  await expect(page.locator('input[type="password"]')).toHaveCount(0, { timeout: 25_000 });
}

test.describe("authenticated smoke tests", () => {
  test.skip(!runAuthenticated, "E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD are required for authenticated smoke tests");

  test("user can see app chrome", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await login(page);
      // Wait for any sidebar or header
      await expect(page.locator("header, nav, aside").first()).toBeVisible({ timeout: 15_000 });
    });
  });

  test("protected pages render", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await login(page);
      // Check for a few critical routes
      for (const path of ["/orders", "/customers", "/admin/tenants"]) {
        await page.goto(path);
        // Wait for page to load something other than a crash screen
        await expect(page.locator("body")).not.toContainText(/Missing VITE_SUPABASE|حدث خطأ/);
      }
    });
  });
});

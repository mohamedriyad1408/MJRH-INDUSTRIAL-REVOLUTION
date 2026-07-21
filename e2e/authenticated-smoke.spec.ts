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

test.describe("authenticated smoke tests", () => {
  test.skip(!runAuthenticated, "E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD are required for authenticated smoke tests");

  async function login(page: Page) {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(email!);
    await page.locator('input[type="password"]').fill(password!);
    await page.locator('button[type="submit"]').first().click();
    // Wait for the login screen to disappear
    await expect(page.locator('input[type="password"]')).toHaveCount(0, { timeout: 20_000 });
  }

  test("owner/staff can see app chrome", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await login(page);
      await expect(page.locator("header.app-topbar, nav, aside")).toBeVisible({ timeout: 15_000 });
      await expect(page.locator("body")).toContainText(/MJRH|Dry Tech/i);
    });
  });

  test("core protected pages render", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await login(page);
      // Test a few critical paths
      for (const path of ["/today", "/orders", "/customers"]) {
        await page.goto(path);
        await expect(page.locator("body")).not.toContainText(/Missing VITE_SUPABASE|حدث خطأ/);
      }
    });
  });
});

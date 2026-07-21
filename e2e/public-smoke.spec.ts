import { expect, test, type Page } from "@playwright/test";

async function expectNoPageErrors(page: Page, run: () => Promise<void>) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await run();
  expect(errors, `Unexpected browser errors: ${errors.join(" | ")}`).toEqual([]);
}

test.describe("public and auth-gated smoke tests", () => {
  test("login page renders", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await page.goto("/login");
      // Check for common elements in login page regardless of language
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });
  });

  test("protected app routes redirect", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await page.goto("/dashboard");
      await page.waitForURL(/\/login/);
    });
  });

  test("customer portal loads", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await page.goto("/customer-portal?tenant=dry-tech");
      // Look for any heading
      await expect(page.locator("h1, h2").first()).toBeVisible();
    });
  });
});

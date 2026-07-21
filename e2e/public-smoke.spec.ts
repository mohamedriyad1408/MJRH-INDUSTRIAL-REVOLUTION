import { expect, test, type Page } from "@playwright/test";

async function expectNoPageErrors(page: Page, run: () => Promise<void>) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await run();
  expect(errors, `Unexpected browser errors: ${errors.join(" | ")}`).toEqual([]);
}

test.describe("public and auth-gated smoke tests", () => {
  test("login page renders correctly", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await page.goto("/login");
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });
  });

  test("protected app routes redirect to login", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await page.goto("/dashboard");
      await page.waitForURL(/\/login/);
      await expect(page.locator('input[type="email"]')).toBeVisible();
    });
  });

  test("customer portal loads", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await page.goto("/customer-portal?tenant=dry-tech");
      // Verify something is rendered (e.g., a button or input)
      await expect(page.locator("button, input").first()).toBeVisible();
    });
  });

  test("tenant public entry page loads", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await page.goto("/dry-tech");
      // Check for presence of entry actions
      await expect(page.locator("button, a").first()).toBeVisible();
    });
  });
});

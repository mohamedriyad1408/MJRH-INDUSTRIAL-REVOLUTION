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
      // Heading contains either Arabic or English version
      await expect(page.locator("h1")).toContainText(/نظام إدارة المغسلة|Laundry Management System|دخول/);
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      // Button text
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
      // Use a known slug from the system
      await page.goto("/customer-portal?tenant=dry-tech");
      await expect(page.locator("h1, h2")).toContainText(/بوابة العميل|Customer Portal/);
    });
  });

  test("tenant public entry page loads", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await page.goto("/dry-tech");
      await expect(page.locator("h1")).toContainText(/Dry Tech/i);
      // Check for presence of entry buttons
      await expect(page.locator("button, a")).toContainText(/دخول|Login|Sign in/i);
    });
  });
});

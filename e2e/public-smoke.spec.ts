import { expect, test, type Page } from "@playwright/test";

async function expectNoPageErrors(page: Page, run: () => Promise<void>) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await run();
  expect(errors, `Unexpected browser errors: ${errors.join(" | ")}`).toEqual([]);
}

test.describe("public and auth-gated smoke tests", () => {
  test("login page renders without a black screen", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await page.goto("/login");
      await expect(page.getByRole("heading", { name: /منظومة تشغيل المشاريع|نظام إدارة المغسلة/ })).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.getByRole("button", { name: "دخول" })).toBeVisible();
    });
  });

  test("protected app routes redirect or render login for anonymous users", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await page.goto("/dashboard");
      await expect(page.getByText("ادخل بياناتك للمتابعة")).toBeVisible();
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test("customer portal loads and asks for phone", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await page.goto("/customer-portal?tenant=dry-tech");
      await expect(page.getByRole("heading", { name: "بوابة العميل" })).toBeVisible();
      await expect(page.getByPlaceholder("01xxxxxxxxx")).toBeVisible();
      await expect(page.getByRole("button", { name: "دخول" })).toBeVisible();
    });
  });

  test("tenant public entry page loads with customer and staff actions", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await page.goto("/dry-tech");
      await expect(page.getByRole("heading", { name: "Dry Tech" })).toBeVisible();
      await expect(page.getByRole("link", { name: /دخول العملاء/ })).toBeVisible();
      await expect(page.getByRole("link", { name: /تسجيل عميل جديد/ })).toBeVisible();
      await expect(page.getByRole("link", { name: /دخول الموظفين والمالك/ })).toBeVisible();
    });
  });
});

import { expect, test } from "@playwright/test";

test.describe("mobile layout regressions", () => {
  test("login remains usable on mobile viewport", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /نظام إدارة المغسلة/ })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeInViewport();
    await expect(page.getByRole("button", { name: "دخول" })).toBeInViewport();
  });

  test("customer portal mobile view has visible call to action", async ({ page }) => {
    await page.goto("/customer-portal?tenant=dry-tech");
    await expect(page.getByRole("heading", { name: "بوابة العميل" })).toBeVisible();
    await expect(page.getByRole("button", { name: "دخول" })).toBeVisible();
  });
});

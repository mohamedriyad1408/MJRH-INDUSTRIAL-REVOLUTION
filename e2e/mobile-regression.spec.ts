import { expect, test, type Page } from "@playwright/test";

async function expectNoPageErrors(page: Page, run: () => Promise<void>) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await run();
  expect(errors, `Unexpected browser errors: ${errors.join(" | ")}`).toEqual([]);
}

test.describe("mobile layout regressions", () => {
  test("login remains usable on mobile viewport", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await page.goto("/login");
      await expect(page.getByRole("heading", { name: /منظومة تشغيل المشاريع|نظام إدارة المغسلة/ })).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeInViewport();
      await expect(page.getByRole("button", { name: "دخول" })).toBeInViewport();
    });
  });

  test("customer portal mobile view has visible call to action", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await page.goto("/customer-portal?tenant=dry-tech");
      await expect(page.getByRole("heading", { name: "بوابة العميل" })).toBeVisible();
      await expect(page.getByRole("button", { name: "دخول" })).toBeVisible();
    });
  });

  // Regression guard for the mobile work dock + sidebar. Previously the dock
  // trigger was hardcoded with `fixed left-4` which placed it on the physical
  // left edge regardless of text direction, and the SheetContent inside was
  // forced to RTL even when the page language was LTR (English/French/etc).
  // We assert there is no horizontal overflow on the mobile viewport.
  test("mobile viewport never overflows horizontally", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "this regression guard runs only on the mobile viewport project");
    await expectNoPageErrors(page, async () => {
      await page.goto("/login");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(4);
      await expect(page.getByRole("button", { name: "دخول" })).toBeInViewport();
    });
  });
});

import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_AUTH_EMAIL;
const password = process.env.E2E_AUTH_PASSWORD;
const runAuthenticated = Boolean(email && password);

test.describe("authenticated smoke tests", () => {
  test.skip(!runAuthenticated, "E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD are required for authenticated smoke tests");

  async function login(page: Page) {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(email!);
    await page.locator('input[type="password"]').fill(password!);
    await page.getByRole("button", { name: "دخول" }).click();
    await expect(page.getByText("ادخل بياناتك للمتابعة")).toHaveCount(0, { timeout: 15_000 });
    expect(errors, `Unexpected browser errors: ${errors.join(" | ")}`).toEqual([]);
  }

  test("owner/staff can authenticate and see app chrome", async ({ page }) => {
    await login(page);
    await expect(page.locator("header.app-topbar")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/MJRH|Dry Tech|نظام تشغيل/).filter({ visible: true }).first()).toBeVisible({ timeout: 15_000 });
  });

  test("core protected pages render after login", async ({ page }) => {
    await login(page);
    for (const path of ["/today", "/daily-operations", "/system-health", "/orders", "/accounting"]) {
      await page.goto(path);
      await expect(page.locator("body")).not.toContainText("حدث خطأ غير متوقع");
      await expect(page.locator("body")).not.toContainText("Missing VITE_SUPABASE");
    }
  });
});

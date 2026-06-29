import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_AUTH_EMAIL;
const password = process.env.E2E_AUTH_PASSWORD;
const runAuthenticated = Boolean(email && password);

async function login(page: Page, language: "ar" | "fr") {
  await page.addInitScript((lang) => {
    window.localStorage.setItem("mjrh.language.v2", lang);
    window.localStorage.removeItem("mjrh.language");
  }, language);
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email!);
  await page.locator('input[type="password"]').fill(password!);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 });
}

test.describe("authenticated i18n smoke", () => {
  test.skip(!runAuthenticated, "E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD are required for authenticated i18n smoke tests");

  test("Arabic remains Arabic in protected pages and sidebar labels", async ({ page }) => {
    test.skip(test.info().project.name.includes("mobile"), "sidebar labels are validated on desktop layout");
    await login(page, "ar");
    await page.goto("/system-health");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("body")).toContainText("فحص النظام");
    await expect(page.locator("body")).toContainText("المالية والتشغيل");
    await expect(page.locator("body")).not.toContainText("System health");
    await expect(page.locator("body")).not.toContainText("Finance & operations");
  });

  test("French does not fall back to English navigation", async ({ page }) => {
    test.skip(test.info().project.name.includes("mobile"), "sidebar labels are validated on desktop layout");
    await login(page, "fr");
    await page.goto("/system-health");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("body")).toContainText("Santé système");
    await expect(page.locator("body")).toContainText("Finance & opérations");
    await expect(page.locator("body")).not.toContainText("System health");
  });
});

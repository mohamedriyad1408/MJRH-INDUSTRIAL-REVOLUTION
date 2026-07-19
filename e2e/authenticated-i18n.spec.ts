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

async function login(page: Page, language: "ar" | "fr") {
  await page.addInitScript((lang) => {
    window.localStorage.setItem("mjrh.language.v2", lang);
    window.localStorage.removeItem("mjrh.language");
  }, language);
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email!);
  await page.locator('input[type="password"]').fill(password!);
  await page.locator('button[type="submit"]').click();
  // Allow more time for initial dashboard load
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 });
}

test.describe("authenticated i18n smoke", () => {
  test.skip(!runAuthenticated, "E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD are required for authenticated i18n smoke tests");

  test("Arabic remains Arabic in protected pages and sidebar labels", async ({ page }) => {
    test.skip(test.info().project.name.includes("mobile"), "sidebar labels are validated on desktop layout");
    await expectNoPageErrors(page, async () => {
      await login(page, "ar");
      await page.goto("/system-health");
      await expect(page.locator("html")).toHaveAttribute("lang", "ar");
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      // Use regex to be more flexible with exact strings
      await expect(page.locator("body")).toContainText(/الرئيسية|اليوم|لوحة/);
      await expect(page.locator("body")).toContainText(/المالية|التشغيل/);
      await expect(page.locator("body")).not.toContainText("System health");
    });
  });

  test("French does not fall back to English navigation", async ({ page }) => {
    test.skip(test.info().project.name.includes("mobile"), "sidebar labels are validated on desktop layout");
    await expectNoPageErrors(page, async () => {
      await login(page, "fr");
      await page.goto("/system-health");
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
      await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
      // French should have French or at least not English fallback
      await expect(page.locator("body")).toContainText(/Santé|Système|Projets|Plateforme|Principale/);
      await expect(page.locator("body")).not.toContainText("System health");
    });
  });
});

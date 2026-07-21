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
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 });
}

test.describe("authenticated i18n smoke", () => {
  test.skip(!runAuthenticated, "E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD are required for authenticated i18n smoke tests");

  test("Arabic layout and direction", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await login(page, "ar");
      await page.goto("/admin/tenants");
      await expect(page.locator("html")).toHaveAttribute("lang", "ar");
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    });
  });

  test("Foreign language layout and direction", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await login(page, "fr");
      await page.goto("/admin/tenants");
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
      await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    });
  });
});

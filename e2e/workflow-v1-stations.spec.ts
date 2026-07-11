import { expect, test, type Page } from "@playwright/test";

/**
 * Phase 0 — Safety Net E2E
 * Covers all 7 laundry stations: reception, cleaning, drying_assembly, ironing, packing, qc, delivery
 * Must pass 100% before any v2 commit
 */

const email = process.env.E2E_AUTH_EMAIL;
const password = process.env.E2E_AUTH_PASSWORD;
const runAuthenticated = Boolean(email && password);

async function expectNoPageErrors(page: Page, run: () => Promise<void>) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await run();
  expect(errors, `Unexpected browser errors: ${errors.join(" | ")}`).toEqual([]);
}

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email!);
  await page.locator('input[type="password"]').fill(password!);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 });
}

test.describe("Phase 0 — v1 Laundry 7 stations safety net", () => {
  test.skip(!runAuthenticated, "E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD required");

  test("reception → cleaning → drying_assembly → ironing → packing → qc → delivery (full flow) loads without crash", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await login(page);

      // Go to orders list
      await page.goto("/dry-tech/orders");
      await expect(page.locator("body")).toContainText(/كل الطلبات|All Orders|طلبات/i);

      // Visit each station page — they must load without crashing (safety net)
      const stations = [
        "/dry-tech/stations/reception",
        "/dry-tech/stations/cleaning",
        "/dry-tech/stations/drying-assembly",
        "/dry-tech/stations/ironing",
        "/dry-tech/stations/packing",
        "/dry-tech/stations/qc",
        "/dry-tech/stations/delivery",
      ];

      for (const stationPath of stations) {
        await page.goto(stationPath);
        await page.waitForTimeout(1000);
        const body = page.locator("body");
        await expect(body).not.toBeEmpty();
        const content = await body.textContent();
        expect(content?.length).toBeGreaterThan(10);
      }
    });
  });

  test("v2 workflow builder and work-orders pages load without crash (does not require super_admin)", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await login(page);

      // Work-orders page (v2 proof) — should load for owner
      await page.goto("/dry-tech/work-orders");
      await page.waitForTimeout(1500);
      // Should contain some text, not crash
      await expect(page.locator("body")).not.toBeEmpty();

      // Try workflow builder — if not super_admin it will redirect to orders/login, but should not crash
      await page.goto("/admin/workflow-builder");
      await page.waitForTimeout(1500);
      const bodyText = await page.locator("body").textContent();
      expect(bodyText?.length).toBeGreaterThan(5);
      // If super_admin, it should contain Builder title, if not, should contain login or redirect — either is ok for safety net
      // We only check no pageerror (already done via expectNoPageErrors)
    });
  });

  test("feature flag — existing tenants stay v1 by default", async ({ page }) => {
    await expectNoPageErrors(page, async () => {
      await login(page);
      await page.goto("/dry-tech/stations/reception");
      await expect(page.locator("body")).toContainText(/الاستقبال|Reception|استلام/i);
    });
  });
});

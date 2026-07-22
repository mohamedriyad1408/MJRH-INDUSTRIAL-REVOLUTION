
import { expect, test } from "@playwright/test";

const routes = [
  "/dashboard",
  "/orders",
  "/online-queue",
  "/qc",
  "/delivery",
  "/staff",
  "/staff/attendance",
  "/inventory",
  "/reports",
  "/admin/tenants",
  "/admin/users"
];

test.describe("R-003: UI Audit", () => {
  routes.forEach(route => {
    test(`Route ${route} should not crash`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      
      // We go to landing first to ensure session is cleared or set if needed
      await page.goto(route);
      
      // Since most routes are protected, they should redirect to /login
      // or show some content if we were logged in.
      // But we just want to see if they crash.
      
      await page.waitForTimeout(2000);
      
      expect(errors, `Errors on ${route}: ${errors.join(" | ")}`).toEqual([]);
    });
  });
});

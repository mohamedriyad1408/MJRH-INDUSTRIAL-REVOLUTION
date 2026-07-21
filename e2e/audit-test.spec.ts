import { test, expect } from '@playwright/test';

const BASE_URL = 'https://mjrh.vercel.app';

test.describe('MJRH Functional Audit', () => {
  
  test.beforeEach(async ({ page }) => {
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`BROWSER ERROR: ${msg.text()}`);
    });

    // Listen for network failures
    page.on('requestfailed', request => {
      // console.log(`NETWORK FAILURE: ${request.url()} - ${request.failure()?.errorText}`);
    });

    // Listen for response status codes
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`HTTP ERROR ${response.status()}: ${response.url()}`);
      }
    });
  });

  test('Super Admin Audit', async ({ page }) => {
    console.log('--- STARTING Super Admin Audit ---');
    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[type="email"]', 'mohamedriyad1408@gmail.com');
    await page.fill('input[type="password"]', '142536Mjhrf');
    await page.click('button:has-text("دخول")');
    
    // In stable V2, super admin usually lands on /admin/tenants
    await page.waitForURL(/.*admin/); 
    console.log('✅ Super Admin Logged in successfully');

    await page.goto(`${BASE_URL}/admin/tenants`);
    await expect(page.locator('h1, h2, table, .grid').first()).toBeVisible();
    console.log('✅ Tenants list page loaded');

    await page.goto(`${BASE_URL}/admin/users`);
    await expect(page.locator('h1, h2, table, .grid').first()).toBeVisible();
    console.log('✅ Users list page loaded');

    await page.goto(`${BASE_URL}/admin/billing`);
    await expect(page.locator('h1, h2, table, .grid').first()).toBeVisible();
    console.log('✅ Billing page loaded');
    
    console.log('--- Super Admin Audit COMPLETED ---');
  });

  test('Dry-Tech Owner Audit', async ({ page }) => {
    console.log('--- STARTING Dry-Tech Owner Audit ---');
    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[type="email"]', 'abdelnaser@mjrh.com');
    await page.fill('input[type="password"]', '123234Naser');
    await page.click('button:has-text("دخول")');
    
    // Redirect might be to /today or /dashboard
    await page.waitForURL(/.*(dashboard|today|ops)/);
    console.log(`✅ Dry-Tech Owner Logged in successfully. Current URL: ${page.url()}`);

    // Check Dashboard/Home
    await expect(page.locator('.card, .bg-card, h1, h2').first()).toBeVisible();
    console.log('✅ Dashboard/Landing stats visible');

    // 2. Orders
    await page.goto(`${BASE_URL}/orders`);
    await expect(page.locator('table, .grid').first()).toBeVisible({ timeout: 15000 });
    console.log('✅ Orders page loaded');

    // 3. New Order
    await page.goto(`${BASE_URL}/orders/new`);
    await expect(page.locator('button, input').first()).toBeVisible();
    console.log('✅ New Order page loaded');

    // 4. Customers
    await page.goto(`${BASE_URL}/customers`);
    await expect(page.locator('table, .grid').first()).toBeVisible();
    console.log('✅ Customers page loaded');

    // 5. Staff
    await page.goto(`${BASE_URL}/staff`);
    await expect(page.locator('table, .grid').first()).toBeVisible();
    console.log('✅ Staff page loaded');

    // 6. Inventory
    await page.goto(`${BASE_URL}/inventory`);
    await expect(page.locator('table, .grid').first()).toBeVisible();
    console.log('✅ Inventory page loaded');

    // 7. Reports
    await page.goto(`${BASE_URL}/reports`);
    // Wait for either a table or a chart or a heading
    await expect(page.locator('canvas, .recharts-wrapper, table, h1, h2').first()).toBeVisible();
    console.log('✅ Reports page loaded');
    
    console.log('--- Dry-Tech Owner Audit COMPLETED ---');
  });
});

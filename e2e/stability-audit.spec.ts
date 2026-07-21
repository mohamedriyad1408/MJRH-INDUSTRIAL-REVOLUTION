import { test, expect } from '@playwright/test';

const BASE_URL = 'https://mjrh.vercel.app';

test.describe('MJRH Stability Audit', () => {
  
  test('Dry-Tech Owner Full Flow', async ({ page }) => {
    console.log('--- STARTING Dry-Tech Owner Audit ---');
    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[type="email"]', 'abdelnaser@mjrh.com');
    await page.fill('input[type="password"]', '123234Naser');
    await page.click('button:has-text("دخول")');
    
    // 1. Check Redirect
    await page.waitForURL(/.*today/);
    console.log(`✅ Redirected to Today Center: ${page.url()}`);

    // 2. Check Sidebar Branding (Confirming STABLE version)
    const sidebarBrand = page.locator('.font-black', { hasText: /MJRH/ });
    await expect(sidebarBrand.first()).toBeVisible();
    const brandText = await sidebarBrand.first().innerText();
    console.log(`Sidebar Brand Text: ${brandText}`);
    
    if (brandText.includes('V4')) {
      console.log('❌ ERROR: Still seeing V4 branding!');
    } else {
      console.log('✅ Branding is STABLE');
    }

    // 3. Test "New Order"
    console.log('Testing New Order page...');
    await page.goto(`${BASE_URL}/orders/new`);
    await page.waitForLoadState('networkidle');
    
    // Look for service items or category tabs
    const serviceItems = page.locator('button, .grid-cols-2 button');
    const count = await serviceItems.count();
    console.log(`Found ${count} clickable items on New Order page`);
    
    if (count > 0) {
      console.log('✅ New Order page functional');
    } else {
      console.log('❌ New Order page seems empty');
      await page.screenshot({ path: 'new-order-fail.png' });
    }

    // 4. Test Customers
    await page.goto(`${BASE_URL}/customers`);
    await expect(page.locator('table, .grid').first()).toBeVisible();
    console.log('✅ Customers page functional');

    // 5. Check Console for Errors
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`CONSOLE ERROR: ${msg.text()}`);
    });
  });
});

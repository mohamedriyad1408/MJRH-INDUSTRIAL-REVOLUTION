import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const baseURL = process.env.DEMO_BASE_URL || 'https://mjrh.vercel.app';
const email = process.env.DEMO_EMAIL;
const password = process.env.DEMO_PASSWORD;
if (!email || !password) throw new Error('DEMO_EMAIL and DEMO_PASSWORD are required');

const outRoot = path.resolve('demo-video/real-system');
const desktopDir = path.join(outRoot, 'desktop');
const mobileDir = path.join(outRoot, 'mobile');
fs.mkdirSync(desktopDir, { recursive: true });
fs.mkdirSync(mobileDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function safeShot(page, file, label) {
  try {
    await page.screenshot({ path: file, fullPage: false });
    console.log('captured', label, file);
  } catch (e) {
    console.error('failed screenshot', label, e.message);
  }
}

async function gotoAndShot(page, route, file, label, wait = 2200) {
  try {
    await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => null);
    await sleep(wait);
    await safeShot(page, file, label);
  } catch (e) {
    console.error('failed page', label, route, e.message);
    await safeShot(page, file, label + ' error');
  }
}

async function login(page) {
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'دخول' }).click();
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => null);
  await sleep(3500);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, locale: 'ar-EG' });
const page = await context.newPage();
page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
page.on('console', (msg) => { if (msg.type() === 'error') console.error('CONSOLE', msg.text()); });

await login(page);
await safeShot(page, path.join(desktopDir, '01-dashboard-after-login.png'), 'dashboard after login');

const desktopShots = [
  ['/daily-operations', '02-daily-operations.png', 'تشغيل اليوم'],
  ['/system-health', '03-system-health-notifications-errors-whatsapp.png', 'فحص النظام والإشعارات والواتساب'],
  ['/orders', '04-orders-list.png', 'كل الطلبات'],
  ['/orders/1723ae45-bc96-4a4e-9b68-292aebf8b514', '05-order-journey-instapay.png', 'رحلة طلب مع انستاباي'],
  ['/orders/3638570f-e17e-45e5-a17a-7fc67ceb4451', '06-order-reclean-journey.png', 'رحلة طلب بمرتجع تنظيف'],
  ['/finance', '07-finance.png', 'المالية'],
  ['/accounting', '08-accounting-cash.png', 'الحسابات والخزنة'],
  ['/ledger', '09-ledger-journals.png', 'القيود والتقارير'],
  ['/live-map', '10-live-map-route.png', 'الخريطة وخط السير'],
  ['/stations/reception', '11-station-reception.png', 'الاستقبال'],
  ['/stations/cleaning', '12-station-cleaning.png', 'الغسيل والتنظيف'],
  ['/stations/drying-assembly', '13-station-drying-assembly.png', 'التجفيف والتجميع'],
  ['/stations/ironing', '14-station-ironing.png', 'الكي'],
  ['/stations/packing', '15-station-packing.png', 'التغليف'],
  ['/stations/qc', '16-station-qc.png', 'الجودة'],
  ['/driver', '17-driver.png', 'لوحة المندوب'],
  ['/help', '18-help-center.png', 'دليل الاستخدام'],
];

for (const [route, file, label] of desktopShots) await gotoAndShot(page, route, path.join(desktopDir, file), label);

// Try open notification popover on current authenticated page for a focused shot
try {
  await page.goto(`${baseURL}/stations/ironing`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => null);
  await sleep(1500);
  await page.locator('button').filter({ hasText: '' }).first().click({ timeout: 3000 }).catch(() => null);
  // More reliable: click bell icon container by visible badge if possible
  await page.locator('svg').nth(0).click({ timeout: 1500 }).catch(() => null);
  await sleep(1000);
  await safeShot(page, path.join(desktopDir, '19-notification-popover.png'), 'notification popover');
} catch {}

await context.close();

// Public/mobile pages
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ar-EG' });
const m = await mobile.newPage();
await gotoAndShot(m, '/landing', path.join(mobileDir, '01-mobile-landing.png'), 'mobile landing', 1500);
await gotoAndShot(m, '/dry-tech', path.join(mobileDir, '02-mobile-tenant-entry.png'), 'mobile tenant entry', 1800);
await gotoAndShot(m, '/customer-portal?tenant=dry-tech', path.join(mobileDir, '03-mobile-customer-portal.png'), 'mobile customer portal', 1800);
await gotoAndShot(m, '/track/e8788c2e-f828-4c70-817e-6484b40095bc', path.join(mobileDir, '04-mobile-track-order.png'), 'mobile track order', 2200);
await mobile.close();

await browser.close();
console.log('done real captures');

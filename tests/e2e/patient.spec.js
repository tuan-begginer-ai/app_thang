import { test, expect } from '@playwright/test';

test.describe('Patient Management E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Log browser console
    page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));

    // Mock browser dialogs + DB API for deterministic e2e flow
    await page.addInitScript(() => {
      window.__e2eAlerts = [];
      window.__e2eConfirms = [];

      window.alert = (message) => {
        window.__e2eAlerts.push(String(message));
      };

      window.confirm = (message) => {
        window.__e2eConfirms.push(String(message));
        return true;
      };

      window.dbAPI = {
        invoke: async (channel, ...args) => {
          console.log(`E2E Mock Invoke Request: ${channel}`, args);

          if (channel === 'db-add-patient') {
            return new Promise(resolve => setTimeout(() => resolve({ id: 100, ...args[0] }), 100));
          }

          if (channel === 'db-search-patients') {
            const query = args[0] || '';
            if (query && query.includes('Hồ Sơ Test')) {
              return [{
                id: 100,
                name: query,
                dob: '1995',
                phone: '0987654321',
                created_at: new Date().toISOString()
              }];
            }
            return [];
          }

          return { success: true };
        },
        send: () => {},
        on: () => {},
        removeListener: () => {}
      };
    });

    await page.goto('/');
    await page.waitForSelector('button:has-text("Lưu")', { timeout: 30000 });
  });

  test('should allow creating a new patient and searching for them', async ({ page }) => {
    const uniqueName = `Hồ Sơ Test ${Date.now()}`;

    // Fill required fields
    await page.locator('input[name="name"]').fill(uniqueName);
    await page.locator('input[name="dob"]').fill('1995');
    await page.locator('input[name="phone"]').fill('0987654321');

    // Save and verify success alert message
    await page.locator('.toolbar button:has-text("Lưu")').click();
    await page.waitForFunction(() => (window.__e2eAlerts || []).length > 0);
    const lastAlert = await page.evaluate(() => window.__e2eAlerts[window.__e2eAlerts.length - 1]);
    expect(lastAlert).toContain('Lưu dữ liệu thành công');

    // Open manager and search
    await page.locator('.toolbar button:has-text("Danh sách")').click();

    const searchWrap = page.locator('.patient-manager-modal');
    await expect(searchWrap).toBeVisible();

    const searchInput = searchWrap.locator('input[placeholder="Tìm theo tên, SĐT, địa chỉ..."]');
    await searchInput.fill(uniqueName);

    // Verify results contain searched patient
    await expect(searchWrap.locator('table.patient-list tbody')).toContainText(uniqueName, { timeout: 10000 });
  });

  test('should handle validation when name is empty', async ({ page }) => {
    await page.locator('input[name="name"]').fill('');

    await page.locator('.toolbar button:has-text("Lưu")').click();
    await page.waitForFunction(() => (window.__e2eAlerts || []).length > 0);

    const lastAlert = await page.evaluate(() => window.__e2eAlerts[window.__e2eAlerts.length - 1]);
    expect(lastAlert).toBe('Vui lòng nhập tên bệnh nhân!');
  });
});

import { test, expect } from '@playwright/test'
test('all management pages render real API data and export valid spreadsheets', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  const failedApis: string[] = []
  page.on('response', (r) => {
    if (r.url().includes('/api/') && r.status() >= 500) failedApis.push(r.url())
  })
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Địa chỉ email' }).fill('admin@librivo.local')
  await page.getByLabel('Mật khẩu', { exact: true }).fill('AdminDemo!2026')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).toHaveURL('/admin')
  for (const url of [
    '/admin/copies',
    '/admin/categories',
    '/admin/authors',
    '/admin/publishers',
    '/admin/shelves',
    '/admin/members',
    '/admin/requests',
    '/admin/loans',
    '/admin/reservations',
    '/admin/renewals',
    '/admin/fines',
    '/admin/reports',
    '/admin/roles',
    '/admin/settings',
    '/admin/audit',
    '/reader',
    '/reader/notifications',
    '/reader/profile',
    '/reader/reviews',
  ]) {
    await page.goto(url)
    await expect(page.locator('.workspace-content h1')).toBeVisible()
    await expect(page.getByText('Chưa thể tải dữ liệu')).toHaveCount(0)
    await expect(page.locator('.loading-block')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  const csv = await page.request.get('/api/reports/export?type=books&format=csv', {
    headers: {
      Origin: 'http://localhost:5173',
      Referer: 'http://localhost:5173/',
      Accept: 'application/json',
    },
  })
  expect(csv.status()).toBe(200)
  expect(await csv.text()).toContain('Clean Code')
  const excel = await page.request.get('/api/reports/export?type=books&format=xlsx', {
    headers: {
      Origin: 'http://localhost:5173',
      Referer: 'http://localhost:5173/',
      Accept: 'application/json',
    },
  })
  expect(excel.status()).toBe(200)
  expect((await excel.body()).subarray(0, 2).toString()).toBe('PK')
  await page.setViewportSize({ width: 360, height: 800 })
  for (const url of [
    '/admin/books',
    '/admin/copies',
    '/admin/members',
    '/admin/reports',
    '/admin/settings',
    '/reader/profile',
  ]) {
    await page.goto(url)
    await expect(page.locator('.workspace-content h1')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  expect(failedApis).toEqual([])
  expect(errors).toEqual([])
})

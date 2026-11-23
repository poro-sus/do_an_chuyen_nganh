import { test, expect, type Page } from '@playwright/test'
const credentials = {
  admin: ['admin@librivo.local', 'AdminDemo!2026'],
  staff: ['librarian@librivo.local', 'LibraryDemo!2026'],
  reader: ['reader@librivo.local', 'ReaderDemo!2026'],
  other: ['member30@librivo.local', 'ReaderDemo!2026'],
} as const
async function login(page: Page, role: keyof typeof credentials) {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Địa chỉ email' }).fill(credentials[role][0])
  await page.getByLabel('Mật khẩu', { exact: true }).fill(credentials[role][1])
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).toHaveURL(role === 'admin' || role === 'staff' ? '/admin' : '/reader')
}
async function csrfPost(page: Page, url: string, data?: unknown, method = 'POST') {
  await page.request.get('/sanctum/csrf-cookie')
  const cookie = (await page.context().cookies()).find((c) => c.name === 'XSRF-TOKEN')
  return page.request.fetch('/api' + url, {
    method,
    data,
    headers: {
      Origin: 'http://localhost:5173',
      Referer: 'http://localhost:5173/',
      'X-XSRF-TOKEN': decodeURIComponent(cookie?.value || ''),
      Accept: 'application/json',
    },
  })
}
test('admin creates a copy, reader borrows, staff hands over and returns, FIFO holds for another reader', async ({
  browser,
}) => {
  test.setTimeout(120000)
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
    browser.newContext(),
    browser.newContext(),
  ])
  const [admin, staff, reader, other] = await Promise.all(contexts.map((c) => c.newPage()))
  const title = 'Hành trình LIBRIVO E2E ' + Date.now()
  let bookId = 0
  try {
    await login(admin, 'admin')
    await admin.goto('/admin/books')
    await admin.getByRole('button', { name: 'Thêm sách mới' }).click()
    await admin.getByLabel('Tên sách *').fill(title)
    const author = admin.getByLabel('Tác giả *')
    await expect(author.locator('option')).not.toHaveCount(0)
    await author.selectOption({ index: 0 })
    await admin.getByLabel('Danh mục *').selectOption({ index: 0 })
    await admin.getByRole('button', { name: 'Tạo đầu sách', exact: true }).click()
    await expect(admin.getByRole('dialog')).toHaveCount(0)
    await admin.getByRole('textbox', { name: 'Tên sách, ISBN, tác giả…' }).fill(title)
    const adminRow = admin.locator('tbody tr').filter({ hasText: title })
    await expect(adminRow).toHaveCount(1)
    bookId = Number(
      (await adminRow.getByRole('link', { name: title, exact: true }).getAttribute('href'))
        ?.split('/')
        .pop(),
    )
    await adminRow.getByRole('button', { name: 'Thêm bản sao ' + title }).click()
    await admin.getByLabel('Số bản sao cần nhập').fill('1')
    await admin.getByRole('button', { name: 'Nhập bản sao', exact: true }).click()
    await expect(admin.getByRole('dialog')).toHaveCount(0)
    await login(reader, 'reader')
    await reader.goto('/catalog')
    await reader.getByRole('textbox', { name: 'Tìm theo tên sách, tác giả, ISBN…' }).fill(title)
    await reader.getByRole('link', { name: title, exact: true }).click()
    await reader.getByRole('button', { name: 'Gửi yêu cầu mượn' }).click()
    await reader.getByRole('button', { name: 'Xác nhận yêu cầu' }).click()
    await expect(reader.getByRole('button', { name: 'Bạn đã có phiếu mượn' })).toBeDisabled()
    await login(staff, 'staff')
    await staff.goto('/admin/requests')
    await staff.getByRole('textbox', { name: 'Tên sách, độc giả, barcode…' }).fill(title)
    await staff
      .locator('tbody tr')
      .filter({ hasText: title })
      .getByRole('button', { name: 'Duyệt', exact: true })
      .click()
    await staff.getByRole('button', { name: 'Xác nhận', exact: true }).click()
    await expect(staff.getByRole('dialog')).toHaveCount(0)
    await staff.goto('/admin/loans?status=approved')
    await staff.getByRole('textbox', { name: 'Tên sách, độc giả, barcode…' }).fill(title)
    await staff
      .locator('tbody tr')
      .filter({ hasText: title })
      .getByRole('button', { name: 'Bàn giao' })
      .click()
    await staff.getByRole('button', { name: 'Xác nhận', exact: true }).click()
    await expect(staff.getByRole('dialog')).toHaveCount(0)
    await reader.goto('/reader/loans')
    const readerRow = reader.locator('tbody tr').filter({ hasText: title })
    await expect(readerRow).toContainText('Đang mượn')
    await expect(readerRow.getByRole('button', { name: 'Gia hạn' })).toBeEnabled()
    await login(other, 'other')
    await other.goto('/books/' + bookId)
    await other.getByRole('button', { name: 'Đặt trước cuốn sách' }).click()
    await other.getByRole('button', { name: 'Xác nhận đặt trước' }).click()
    await expect(other.getByRole('dialog')).toHaveCount(0)
    await other.goto('/reader/reservations')
    await expect(other.locator('tbody tr').filter({ hasText: title })).toContainText('Đang chờ')
    await staff.goto('/admin/loans?status=active')
    await staff.getByRole('textbox', { name: 'Tên sách, độc giả, barcode…' }).fill(title)
    await staff
      .locator('tbody tr')
      .filter({ hasText: title })
      .getByRole('button', { name: 'Trả sách' })
      .click()
    await staff.getByRole('button', { name: 'Xác nhận', exact: true }).click()
    await expect(staff.getByRole('dialog')).toHaveCount(0)
    await other.reload()
    await expect(other.locator('tbody tr').filter({ hasText: title })).toContainText(
      'Sẵn sàng nhận',
    )
    const state = await (
      await other.request.get('/api/books/' + bookId, {
        headers: {
          Origin: 'http://localhost:5173',
          Referer: 'http://localhost:5173/',
          Accept: 'application/json',
        },
      })
    ).json()
    expect(state.data.available_count).toBe(0)
    await reader.reload()
    await expect(reader.locator('tbody tr').filter({ hasText: title })).toContainText('Đã trả')
    await reader.screenshot({ path: '../docs/screenshots/reader-loans.png', fullPage: true })
  } finally {
    if (bookId) {
      const loans = await (
        await admin.request.get('/api/loans', {
          params: { search: title },
          headers: {
            Origin: 'http://localhost:5173',
            Referer: 'http://localhost:5173/',
            Accept: 'application/json',
          },
        })
      ).json()
      for (const l of loans.data || []) {
        if (l.book_id !== bookId) continue
        if (l.status === 'active') await csrfPost(admin, '/loans/' + l.id + '/return')
        else if (['requested', 'approved'].includes(l.status))
          await csrfPost(admin, '/loans/' + l.id + '/cancel')
      }
      const reservations = await (
        await admin.request.get('/api/reservations', {
          headers: {
            Origin: 'http://localhost:5173',
            Referer: 'http://localhost:5173/',
            Accept: 'application/json',
          },
        })
      ).json()
      for (const r of reservations.data || [])
        if (r.book_id === bookId && ['ready', 'waiting'].includes(r.status))
          await csrfPost(admin, '/reservations/' + r.id, undefined, 'DELETE')
      await csrfPost(admin, '/books/' + bookId, undefined, 'DELETE')
    }
    await Promise.all(contexts.map((c) => c.close()))
  }
})

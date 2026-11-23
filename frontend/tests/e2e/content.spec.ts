import { test, expect } from '@playwright/test'
import fs from 'node:fs/promises'

test('expanded home collections and borrowing guidance use real catalogue data', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await fs.mkdir('../docs/screenshots', { recursive: true })
  await page.goto('/')
  await expect(page.locator('.brand-mark svg').first()).toBeVisible()
  await expect(page.locator('.themed-collection')).toHaveCount(3)
  await expect(page.locator('.collection-cover')).toHaveCount(6)
  await expect(page.locator('.home-book-spotlight h2')).toHaveText('The Pragmatic Programmer')
  await expect(page.locator('.borrowing-step')).toHaveCount(4)
  await expect(page.locator('.member-benefit')).toHaveCount(4)
  await expect(page.locator('.home-faq-list details')).toHaveCount(6)
  const policy = await (await page.request.get('/api/public/settings')).json()
  const loanQuestion = page.locator('.home-faq-list details').nth(1)
  await loanQuestion.locator('summary').click()
  await expect(loanQuestion.locator('p')).toContainText(`${policy.data.loan_days} ngày`)
  await expect(loanQuestion.locator('p')).not.toContainText('undefined')
  await page.locator('.home-collections-section').scrollIntoViewIfNeeded()
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: '../docs/screenshots/home-collections-expanded.png' })
  await page.locator('.themed-collection a').first().click()
  await expect(page).toHaveURL(/\/catalog\?category=\d+/)
  await expect(page.locator('.book-card').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('book details contain edition-specific editorial, working anchors and responsive layouts', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/books/2')
  await expect(page.locator('.detail-copy h1')).toHaveText('The Pragmatic Programmer')
  await expect(page.locator('.book-topics-grid article')).toHaveCount(6)
  await expect(page.locator('.editorial-prose p')).toHaveCount(3)
  await expect(page.locator('.book-takeaways li')).toHaveCount(4)
  await expect(page.locator('.reading-guide-steps > div')).toHaveCount(3)
  await expect(page.locator('.detail-author-cards article')).toHaveCount(2)
  await expect(page.locator('.edition-table')).toContainText('1999')
  await expect(page.locator('.book-sources a')).toHaveCount(3)
  const links = await page
    .locator('.detail-navigation-card a')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')))
  for (const target of links) await expect(page.locator(target!)).toHaveCount(1)
  await page
    .getByRole('navigation', { name: 'Chuyển đến nội dung sách' })
    .getByRole('link', { name: 'Nội dung nổi bật' })
    .click()
  await expect(page).toHaveURL(/#book-topics$/)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: '../docs/screenshots/detail-topics-expanded.png' })
  await page.getByRole('button', { name: 'Sao chép thông tin', exact: true }).click()
  await expect(page.getByText('Đã sao chép thông tin sách', { exact: true })).toBeVisible()
  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 844 })
    await page.locator('#book-overview').scrollIntoViewIfNeeded()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width === 390)
      await page.screenshot({ path: '../docs/screenshots/detail-expanded-mobile.png' })
    await page.goto('/')
    await expect(page.locator('.collection-cover')).toHaveCount(6)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.locator('.home-faq-section').scrollIntoViewIfNeeded()
    await page.locator('.home-faq-list summary').first().click()
    await expect(page.locator('.home-faq-list details[open] p')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.goto('/books/2')
    await expect(page.locator('.book-topics-grid article')).toHaveCount(6)
  }
  expect(errors).toEqual([])
})

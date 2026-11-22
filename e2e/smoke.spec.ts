import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const ROUTES = ['#/', '#/explore', '#/country/TUR', '#/firm/coca-cola-system', '#/methods', '#/scenarios', '?present=1#/']

for (const r of ROUTES) {
  test(`route ${r} renders without errors and has no serious axe issues`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(r)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    expect(errors).toEqual([])
    const res = await new AxeBuilder({ page }).analyze()
    const serious = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  })
}

test('42.8% never appears without 32.2%', async ({ page }) => {
  for (const r of ['#/', '?present=1#/']) {
    await page.goto(r)
    await page.waitForLoadState('networkidle')
    const text = await page.evaluate(() => document.body.innerText)
    if (text.includes('42.8%')) expect(text).toContain('32.2%')
  }
})

test('no percentage effect for the DiD', async ({ page }) => {
  await page.goto('#/')
  await page.waitForLoadState('networkidle')
  const text = await page.evaluate(() => document.body.innerText)
  expect(text).not.toMatch(/proves/i)
})

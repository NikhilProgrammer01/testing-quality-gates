import { test, expect } from '@playwright/test'

test.describe('Bank Calculator', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('switching to loan mode updates labels correctly', async ({ page }) => {
    const cards = page.locator('.summary-cards')

    await expect(page.getByLabel('Principal (₹)')).toBeVisible()
    await expect(cards).toContainText('Maturity amount')
    await expect(cards).toContainText('Interest earned')

    await page.getByRole('button', { name: 'Loan / EMI' }).click()

    await expect(page.getByLabel('Loan amount (₹)')).toBeVisible()
    await expect(cards).toContainText('Total payable')
    await expect(cards).toContainText('Total interest')

    await page.getByRole('button', { name: 'Savings / FD' }).click()
    await expect(cards).toContainText('Maturity amount')
    await expect(cards).toContainText('Interest earned')
  })

  test('result updates when inputs change', async ({ page }) => {
    await page.locator('#principal').fill('100000')
    await page.locator('#rate').fill('10')
    await page.locator('#years').fill('1')
    await page.locator('#frequency').selectOption('1')

    await expect(page.locator('.summary-cards')).toContainText('1,10,000')

    await page.locator('#principal').fill('200000')
    await expect(page.locator('.summary-cards')).toContainText('2,20,000')
  })

  test('EMI note is hidden in savings mode and visible in loan mode', async ({ page }) => {
    await expect(page.locator('.emi-note')).not.toBeVisible()

    await page.getByRole('button', { name: 'Loan / EMI' }).click()

    await expect(page.locator('.emi-note')).toBeVisible()
    await expect(page.locator('.emi-note')).toContainText('Monthly EMI: ₹')
    await expect(page.locator('.emi-note')).toContainText('Total months:')

    await page.getByRole('button', { name: 'Savings / FD' }).click()
    await expect(page.locator('.emi-note')).not.toBeVisible()
  })

})
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Collaborative Text Editor/);
});

test('redirects to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*login/);
});

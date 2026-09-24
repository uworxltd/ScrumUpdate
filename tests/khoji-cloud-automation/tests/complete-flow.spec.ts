import { expect, Page, test } from '@playwright/test';
import { Globals } from '../globals';
import { PostHogFunctions } from '../scripts/posthog/postHog';

test('test addition and removal of account', async ({ page }) => {
    let trackingEventsCount = 0;

    // disable timeouts for this test and let it fail on its own
    test.setTimeout(0)

    page.setDefaultTimeout(25000);

    page.on('response', async (response) => {
        const url = response.url();

        if (url.includes('https://app.posthog.com/e/')) {
            trackingEventsCount++;
        }

        if ((response.status() < 200 || response.status() >= 300) && url.includes(Globals.SERVER_URL.replace('https://', ''))) {
            console.error({
                status: response.status(),
                statusText: response.statusText(),
                url,
            });
        }
    });

    // nav to khoji login page
    await page.goto('/login?disableCaptcha=TXVoYW1tYWRBaG1hZA%3D%3D');

    // login with atlassian flow
    await page.locator('[data-test="login-button"]').click()
    await page.getByTestId('username').click();
    await page.getByTestId('username').fill(Globals.JIRA_EMAIL);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByTestId('password').fill(Globals.JIRA_PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await handleScreenPossibilities(page)

    // integrate uworx instance
    await page.locator(`[data-test="${Globals.APP_NAME}-integrate-button"]`).click();
    await page.waitForSelector('[data-test="selected-card-1"]');
    await page.waitForSelector('[data-test="option-image-1"]');
    await page.locator('[data-test="submit-button"]').click();

    // unlock feature log-my-work
    await page.waitForURL(/.*\/feature\/log-my-work.*/);
    await page.getByRole('button', { name: 'Got it!' }).click(); // click done for guided tour

    // assert that posthog was not working before cookies were accepted
    expect(trackingEventsCount).toBe(0);

    // accept cookies
    await page.getByLabel('allow cookies').click();

    // unlock feature remind-team
    await page.locator('[data-test="unlock-feature-button"]').click();
    await page.locator('[data-test="next-button"]').click();

    // unlock effort tracking
    await page.waitForURL(/.*\/feature\/team-view.*/);
    await page.locator('[data-test="unlock-effort-tracking"]').click();
    // create categories
    await page.getByText('Epic').click();
    await page.getByText('Sub-task', { exact: true }).click();
    await page.getByText('Task', { exact: true }).click();
    await page.locator('[data-test="add-category-button-main"]').click();
    await page.locator('[data-test="category-name-input"]').fill('dev');
    await page.locator('[data-test="assign-category-button"]').click();
    await page.locator('[data-test="save-category-button"]').click();
    await page.locator('[data-test="save-changes-categories"]').click();

    // check nav for log-my-work
    await page.waitForURL(/.*\/feature\/team-view.*/);
    await page.locator('[data-test="collapse-icon"]').click();
    await page.getByRole('link', { name: 'My Work' }).click();
    await page.locator('[data-test="View-edit-timesheet"]').click();
    await page.locator('[data-test="last-week-button"]').click();
    await page.locator('[data-test="collapse-icon"]').click();

    // delete instance
    await page.locator(`[data-test="${Globals.APP_NAME}-menu"]`).click();
    await page.getByRole('menuitem', { name: 'Manage app' }).click();
    await page.getByRole('tab', { name: 'Manage settings' }).click();
    await page.locator('[data-test="delete-app-button"]').click();
    await page.locator('[data-test="confirm-app-delete-button"]').click();

    // re-integrate with remind team as first feature
    await page.locator(`[data-test="${Globals.APP_NAME}-integrate-button"]`).click();
    await page.waitForSelector('[data-test="selected-card-1"]');
    await page.waitForSelector('[data-test="option-image-1"]');
    await page.locator('[data-test="2-feature"]').click();
    await page.waitForSelector('[data-test="selected-card-2"]');
    await page.waitForSelector('[data-test="option-image-2"]');
    await page.locator('[data-test="submit-button"]').click();
    await page.waitForURL(/.*\/build-team.*/);
    await page.locator('[data-test="next-button"]').click();
    await page.waitForURL(/.*\/feature\/team-view.*/);

    // assert that posthog was working after cookies were accepted
    expect(trackingEventsCount).toBeGreaterThan(5);

    // delete account
    await page.locator('[data-test="profile-menu-button"]').click();
    await page.locator('[data-test="profile-button"]').click();
    await page.locator('[data-test="delete-account-button"]').click();
    await page.locator('[data-test="option-3"]').click();
    await page.locator('[data-test="confirm-deletion"]').click();
    await page.waitForURL(/.*\/login.*/);
});

async function handleScreenPossibilities(page: Page) {
    try {
        await handlePossibility2();
    } catch (err) {
        const mfa = page.getByText('Continue without two-step verification');
        const emailCode = page.getByText('We\'ve emailed you a code');
        if (await mfa.isVisible()) {
            await mfa.click();
            await handlePossibility2();
        } else if (await emailCode.isVisible()) {
            throw new Error(
                'Manual intervention required. Please check your email for the code and enter it in the browser.'
            )
        }
    }

    async function handlePossibility2() {
        try {
            await page.getByLabel('open').click();
            await page.getByText(`${Globals.APP_NAME}.atlassian.net`, { exact: true }).click();
        } catch (error) {
            // no-op
        } finally {
            await page.getByRole('button', { name: 'Accept' }).click();
        }
    }
}
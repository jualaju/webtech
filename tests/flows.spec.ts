import { test, expect, type Page } from '@playwright/test';
async function completePhone(page: Page, name = 'Test Builder', phone = String(Date.now())) {
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: /Use .* demo account/ })).toHaveCount(0);
  await expect(dialog.getByText('DEMO MODE · NO SMS SENT')).toHaveCount(0);
  await dialog.getByRole('textbox', { name: 'Phone number', exact: true }).fill(phone);
  await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
  await dialog.getByRole('textbox', { name: 'Your name', exact: true }).fill(name);
  await dialog.getByRole('button', { name: 'Continue to OTP' }).click();
  const otp = dialog.getByRole('textbox', { name: '4-digit OTP', exact: true });
  await expect(otp).toHaveAttribute('maxlength', '4');
  await expect(dialog.getByText(/any code|No SMS/i)).toHaveCount(0);
  await otp.fill('12');
  await expect(dialog.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
  await otp.fill('1234');
  await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /Welcome back,/ })).toBeVisible();
  return phone;
}
async function signup(page: Page, prefix = 'test') {
  await page.getByRole('button', { name: 'Log in' }).click();
  await completePhone(page);
}
test('real routes, registration, submission, bookmarks, and hosting', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Less talk. More building.' })).toBeVisible();
  await page.getByRole('link', { name: 'Find your next build' }).click();
  await expect(page).toHaveURL(/\/hackathons$/);
  await page.getByRole('textbox', { name: 'Search hackathons' }).fill('Neural');
  await expect(page.getByText('1 hackathon', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await signup(page);
  await page.getByRole('button', { name: 'Save Buildspace 2026', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Unsave Buildspace 2026', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/saved');
  await expect(page.getByRole('heading', { name: 'Buildspace 2026', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'View Buildspace 2026', exact: true }).click();
  await expect(page).toHaveURL(/\/hackathons\/buildspace-26$/);
  await expect(page.getByRole('heading', { name: 'Buildspace 2026', exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Add to calendar' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('buildspace-26.ics');
  await page.getByRole('textbox', { name: 'Team name', exact: true }).fill('Browser Builders');
  await page.getByRole('button', { name: 'Register your team' }).click();
  await expect(page.getByText('You’re registered.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'View your team', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/builds$/);
  await expect(page.getByText('Browser Builders', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Submit project' }).click();
  await page.getByRole('textbox', { name: 'Project title' }).fill('Campus Connect');
  await page
    .getByRole('textbox', { name: 'What does it do?' })
    .fill('A working campus application for students and teams.');
  await page
    .getByRole('textbox', { name: 'Repository URL' })
    .fill('https://github.com/example/project');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Submit project', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Edit submission' })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard\/builds$/);
  await expect(page.getByRole('button', { name: 'Edit submission' })).toBeVisible();
  await page.getByRole('link', { name: 'Organize', exact: true }).click();
  await page.getByRole('button', { name: 'Create hackathon', exact: true }).click();
  await page.getByRole('textbox', { name: 'Hackathon name' }).fill('Browser Test Hack');
  await page.getByRole('textbox', { name: 'Organizer', exact: true }).fill('Test Club');
  await page
    .getByRole('textbox', { name: 'The brief' })
    .fill('Build a useful campus tool with your team over a weekend.');
  await page.getByRole('textbox', { name: 'Location' }).fill('Kochi');
  await page.getByLabel('Starts', { exact: true }).fill('2027-04-10');
  await page.getByLabel('Ends', { exact: true }).fill('2027-04-11');
  await page.getByLabel('Registration closes', { exact: true }).fill('2027-04-08');
  await page.getByRole('button', { name: 'Publish hackathon' }).click();
  await expect(page.getByRole('heading', { name: 'Browser Test Hack' })).toBeVisible();
  await page.getByRole('button', { name: 'View teams' }).click();
  await expect(page.getByRole('heading', { name: 'No teams yet.' })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
});
test('feed posts, reactions, replies and category filtering persist', async ({ page }) => {
  await page.goto('/feed');
  await expect(page.locator('.feed-post').first()).toBeVisible();
  await signup(page, 'feed');
  await page.goto('/feed');
  await page.getByRole('button', { name: 'Write a post' }).click();
  const message = `Shipping the good stuff ${Date.now()}`;
  await page.getByRole('textbox', { name: 'Your post' }).fill(message);
  await page.getByLabel('Post category').selectOption('Build log');
  await page.getByRole('button', { name: 'Post it', exact: true }).click();
  const post = page.locator('.feed-post').filter({ hasText: message });
  await expect(post).toBeVisible();
  await post.getByRole('button', { name: 'Add fire reaction to Test Builder post' }).click();
  await expect(
    post.getByRole('button', { name: 'Remove fire reaction to Test Builder post' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await post.getByRole('button', { name: '0 replies', exact: true }).click();
  await post
    .getByRole('textbox', { name: 'Reply to Test Builder' })
    .fill('This is a real reply, not placeholder text.');
  await post.getByRole('button', { name: 'Send reply' }).click();
  await expect(post.getByText('This is a real reply, not placeholder text.')).toBeVisible();
  await page.reload();
  const persisted = page.locator('.feed-post').filter({ hasText: message });
  await expect(persisted).toBeVisible();
  await expect(
    persisted.getByRole('button', { name: 'Remove fire reaction to Test Builder post' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page
    .locator('.community-nav')
    .getByRole('button', { name: 'Team up', exact: false })
    .click();
  await expect(page.locator('.feed-post .post-category').first()).toHaveText('Team up');
  await expect(persisted).toHaveCount(0);
});
test('toolkit timer and launch checklist work', async ({ page }) => {
  await page.goto('/toolkit');
  await page.getByRole('button', { name: '15 min', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('15:00');
  await page.getByRole('button', { name: 'Start focus' }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Reset focus timer' }).click();
  await expect(page.getByRole('timer')).toHaveText('15:00');
  const initial = await page.locator('.generated-name').textContent();
  await page.getByRole('button', { name: 'Give us another' }).click();
  await expect(page.locator('.generated-name')).not.toHaveText(initial!);
  await page.getByRole('checkbox', { name: 'The repo runs on someone else’s laptop.' }).check();
  await page.reload();
  await expect(
    page.getByRole('checkbox', { name: 'The repo runs on someone else’s laptop.' }),
  ).toBeChecked();
});
test('direct event links and browser history behave like pages', async ({ page }) => {
  await page.goto('/?event=neural-nights');
  await expect(page).toHaveURL(/\/hackathons\/neural-nights$/);
  await expect(page.getByRole('heading', { name: 'Neural Nights' })).toBeVisible();
  await page.getByRole('button', { name: 'Log in to register' }).click();
  await completePhone(page, 'Linked Builder');
  await page.getByRole('link', { name: 'View Neural Nights', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Register your team' })).toBeVisible();
  await expect(page).toHaveURL(/\/hackathons\/neural-nights$/);
  await page.getByRole('link', { name: 'Back to hackathons' }).click();
  await expect(page).toHaveURL(/\/hackathons$/);
  await expect(page.getByRole('textbox', { name: 'Search hackathons' })).toBeVisible();
  await page.keyboard.press('/');
  await expect(page.getByRole('textbox', { name: 'Search hackathons' })).toBeFocused();
  await page.goBack();
  await expect(page).toHaveURL(/\/hackathons\/neural-nights$/);
});
test('desktop and mobile routes fit viewport and navigation is accessible', async ({ page }) => {
  await page.goto('/feed');
  await expect(page.locator('.feed-post').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/feed-desktop.png', fullPage: true });
  await page.goto('/hackathons/buildspace-26');
  await expect(page.getByRole('heading', { name: 'Buildspace 2026' })).toBeVisible();
  await page.screenshot({ path: 'test-results/event-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    '/',
    '/hackathons',
    '/feed',
    '/toolkit',
    '/hackathons/buildspace-26',
    '/saved',
    '/dashboard',
    '/organize',
  ]) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      route,
    ).toBeTruthy();
    if (route === '/feed') {
      await expect(page.locator('.feed-post').first()).toBeVisible();
      await page.screenshot({ path: 'test-results/feed-mobile.png', fullPage: true });
    }
  }
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('button', { name: 'Log in to continue' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('new phone asks for a name; returning phones skip it and restore their data', async ({
  page,
}) => {
  await page.goto('/hackathons');
  await page.getByRole('button', { name: 'Log in' }).click();
  const phone = await completePhone(page, 'Alice Demo');
  await page.getByRole('button', { name: 'Save Buildspace 2026', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Unsave Buildspace 2026', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Switch account' }).click();
  await completePhone(page, 'Bob Demo');
  await expect(
    page.getByRole('button', { name: 'Save Buildspace 2026', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Switch account' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Phone number', exact: true }).fill(phone);
  await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(dialog.getByRole('textbox', { name: 'Your name', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('textbox', { name: '4-digit OTP', exact: true })).toBeVisible();
  await dialog.getByRole('textbox', { name: '4-digit OTP', exact: true }).fill('9999');
  await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Unsave Buildspace 2026', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Switch account' })).toContainText('Alice');
});

test('dashboard replaces the landing page for signed-in users', async ({ page }) => {
  await page.goto('/');
  await signup(page);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /Welcome back,/ })).toBeVisible();
  await expect(page.getByText('Registered events', { exact: true })).toBeVisible();
  await expect(page.getByText('Projects submitted', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recommended for you' })).toBeVisible();
  await expect(page.getByText('Sample event', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'EventForge home' })).toHaveText(/EventForge/);
  await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true });
  await page.goto('/');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Less talk. More building.' })).toHaveCount(0);
  await page.getByRole('link', { name: 'EventForge home' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'View all', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/builds$/);
});

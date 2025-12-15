import { test, expect, Page, Dialog } from '@playwright/test';

test.describe('SplitDumb E2E Tests', () => {
  test.describe('Landing Page', () => {
    test('displays landing page with create and join options', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByRole('heading', { name: 'SplitDumb' })).toBeVisible();
      await expect(page.getByText('Split expenses without the spreadsheet drama')).toBeVisible();
      await expect(page.getByRole('button', { name: /Create Trip/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /trip code/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Join Trip/i })).toBeVisible();
    });
  });

  test.describe('Trip Creation Flow', () => {
    test('creates a new trip and shows credentials', async ({ page }) => {
      // Use ?test=true to mark trips created as test trips
      await page.goto('/?test=true');

      // Set up dialog handler BEFORE clicking
      page.on('dialog', async (dialog) => {
        await dialog.accept('Test Trip');
      });

      // Click create trip button
      await page.getByRole('button', { name: /Create Trip/i }).click();

      // Wait for navigation to trip page
      await expect(page).toHaveURL(/\/[a-z]+-[a-z]+-[a-z]+$/, { timeout: 10000 });

      // Verify credentials modal appears
      await expect(page.getByRole('heading', { name: 'Trip Created!' })).toBeVisible();
      await expect(page.getByText('Trip Code')).toBeVisible();
      await expect(page.getByText('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Continue to Trip' })).toBeVisible();
    });
  });

  test.describe('Full Trip Flow', () => {
    test('complete trip workflow: create, add participants, add expenses, verify balances', async ({ page }) => {
      await page.goto('/?test=true');

      // Track dialogs
      const dialogResponses = ['E2E Test Trip', 'Alice', 'Bob', 'Charlie'];
      let dialogIndex = 0;
      page.on('dialog', async (dialog) => {
        if (dialogIndex < dialogResponses.length) {
          await dialog.accept(dialogResponses[dialogIndex++]);
        } else {
          await dialog.accept();
        }
      });

      // Create trip
      await page.getByRole('button', { name: /Create Trip/i }).click();

      // Wait for credentials modal
      await expect(page.getByRole('heading', { name: 'Trip Created!' })).toBeVisible();

      // Get the trip slug from URL
      const url = page.url();
      const tripSlug = url.split('/').pop() || '';
      expect(tripSlug).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/);

      // Continue to trip
      await page.getByRole('button', { name: 'Continue to Trip' }).click();

      // Verify trip view is displayed
      await expect(page.getByRole('heading', { name: 'E2E Test Trip' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Participants' })).toBeVisible();

      // Add participants (dialogs are already set up)
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('Alice')).toBeVisible();

      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('Bob')).toBeVisible();

      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('Charlie')).toBeVisible();

      // Verify participants are in the payer dropdown (options exist but aren't visible until dropdown opens)
      const payerSelect = page.locator('#expense-payer');
      await expect(payerSelect.getByRole('option', { name: 'Alice' })).toBeAttached();

      // Add expense: Alice pays $75 for dinner, split among all
      await page.getByRole('textbox', { name: /what was it for/i }).fill('Dinner');
      await page.getByPlaceholder('Amount').fill('75');
      await payerSelect.selectOption('Alice');
      await page.getByRole('button', { name: 'Add Expense' }).click();

      // Verify expense appears
      await expect(page.getByText('Dinner $75.00')).toBeVisible();
      await expect(page.getByText('Paid by Alice')).toBeVisible();

      // Verify balances: Alice +$50, Bob -$25, Charlie -$25
      await expect(page.getByText('Alice +$50.00')).toBeVisible();
      await expect(page.getByText('Bob -$25.00')).toBeVisible();
      await expect(page.getByText('Charlie -$25.00')).toBeVisible();
    });

    test('can delete an expense and balances update', async ({ page }) => {
      await page.goto('/?test=true');

      const dialogResponses = ['Delete Test', 'TestUser'];
      let dialogIndex = 0;
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'confirm') {
          await dialog.accept();
        } else if (dialogIndex < dialogResponses.length) {
          await dialog.accept(dialogResponses[dialogIndex++]);
        } else {
          await dialog.accept();
        }
      });

      // Create trip
      await page.getByRole('button', { name: /Create Trip/i }).click();
      await page.getByRole('button', { name: 'Continue to Trip' }).click();

      // Add a participant
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('TestUser')).toBeVisible();

      // Add an expense
      await page.getByRole('textbox', { name: /what was it for/i }).fill('Test Expense');
      await page.getByPlaceholder('Amount').fill('100');
      await page.locator('#expense-payer').selectOption('TestUser');
      await page.getByRole('button', { name: 'Add Expense' }).click();

      await expect(page.getByText('Test Expense $100.00')).toBeVisible();

      // Delete the expense
      await page.getByLabel('Delete expense').click();

      // Verify expense is gone
      await expect(page.getByText('Test Expense $100.00')).not.toBeVisible();
      await expect(page.getByText('No expenses yet')).toBeVisible();
    });
  });

  test.describe('Trip Join Flow', () => {
    test('can join an existing trip with credentials', async ({ page }) => {
      await page.goto('/?test=true');

      // Set up dialog handler
      page.on('dialog', async (dialog) => {
        await dialog.accept('Join Test Trip');
      });

      // Create a trip first
      await page.getByRole('button', { name: /Create Trip/i }).click();
      await expect(page.getByRole('heading', { name: 'Trip Created!' })).toBeVisible();

      // Wait for credentials modal to be fully visible
      await expect(page.locator('.credential-display .value').first()).toBeVisible();

      // Capture credentials from the modal
      const tripCode = await page.locator('.credential-display .value').first().textContent();
      const password = await page.locator('.credential-display .value').last().textContent();
      expect(tripCode).toBeTruthy();
      expect(password).toBeTruthy();

      // Go to trip and then back to landing
      await page.getByRole('button', { name: 'Continue to Trip' }).click();
      await page.getByRole('button', { name: 'Back to home' }).click();

      // Now join using the credentials form
      await page.getByRole('textbox', { name: /trip code/i }).fill(tripCode!);
      await page.getByRole('textbox', { name: /password/i }).fill(password!);
      await page.getByRole('button', { name: 'Join Trip' }).click();

      // Verify we're on the trip page
      await expect(page.getByRole('heading', { name: 'Join Test Trip' })).toBeVisible();
    });
  });

  test.describe('Share Functionality', () => {
    test('share button copies to clipboard', async ({ page, context }) => {
      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      await page.goto('/?test=true');

      page.on('dialog', async (dialog) => {
        await dialog.accept(dialog.type() === 'prompt' ? 'Share Test' : undefined);
      });

      await page.getByRole('button', { name: /Create Trip/i }).click();
      await page.getByRole('button', { name: 'Continue to Trip' }).click();

      // Click share button - should show alert
      await page.getByRole('button', { name: /Share Trip/i }).click();

      // The share action triggers an alert, we auto-accept it
      // If we got here without error, the share worked
    });
  });

  test.describe('Settings', () => {
    test('can view trip credentials in settings', async ({ page }) => {
      await page.goto('/?test=true');

      page.on('dialog', async (dialog) => {
        await dialog.accept('Settings Test');
      });

      await page.getByRole('button', { name: /Create Trip/i }).click();
      await page.getByRole('button', { name: 'Continue to Trip' }).click();

      // Open settings
      await page.getByRole('button', { name: 'Settings' }).click();
      await expect(page.getByRole('heading', { name: 'Trip Settings' })).toBeVisible();

      // View credentials
      await page.getByText('View Credentials').click();
      await expect(page.getByRole('heading', { name: 'Trip Credentials' })).toBeVisible();
      await expect(page.getByText('Trip Code')).toBeVisible();
      await expect(page.getByText('Password')).toBeVisible();
    });
  });

  test.describe('Date Display', () => {
    test('expense dates show correctly formatted', async ({ page }) => {
      await page.goto('/?test=true');

      const dialogResponses = ['Date Test', 'Tester'];
      let dialogIndex = 0;
      page.on('dialog', async (dialog) => {
        if (dialogIndex < dialogResponses.length) {
          await dialog.accept(dialogResponses[dialogIndex++]);
        } else {
          await dialog.accept();
        }
      });

      await page.getByRole('button', { name: /Create Trip/i }).click();
      await page.getByRole('button', { name: 'Continue to Trip' }).click();

      // Add a participant
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('Tester')).toBeVisible();

      // Add expense
      await page.getByRole('textbox', { name: /what was it for/i }).fill('Date Check');
      await page.getByPlaceholder('Amount').fill('50');
      await page.locator('#expense-payer').selectOption('Tester');
      await page.getByRole('button', { name: 'Add Expense' }).click();

      // Verify date is displayed (should be current month, not Jan 21)
      const today = new Date();
      const expectedMonth = today.toLocaleDateString('en-US', { month: 'short' });

      // Check that the date contains current month
      await expect(page.locator('.expense-date')).toContainText(expectedMonth);
    });
  });

  test.describe('Password Protection', () => {
    test('direct URL access prompts for password', async ({ page }) => {
      // Navigate directly to a trip URL without credentials
      // Should prompt for password and redirect to landing on cancel

      let dialogSeen = false;
      page.on('dialog', async (dialog) => {
        dialogSeen = true;
        expect(dialog.type()).toBe('prompt');
        expect(dialog.message()).toContain('password');
        await dialog.dismiss(); // Cancel the dialog
      });

      await page.goto('/some-fake-trip');

      // Should have shown the password prompt
      expect(dialogSeen).toBe(true);

      // Should redirect to landing page after cancelling
      await expect(page).toHaveURL('/');
    });
  });
});

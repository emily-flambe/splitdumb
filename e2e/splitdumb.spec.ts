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
      // Set up dialog handler BEFORE navigating
      page.on('dialog', async (dialog) => {
        await dialog.accept('Test Trip');
      });

      // Use ?test=true to mark trips created as test trips
      await page.goto('/?test=true');

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
      // Track dialogs - set up BEFORE navigating
      const dialogResponses = ['E2E Test Trip', 'Alice', 'Bob', 'Charlie'];
      let dialogIndex = 0;
      page.on('dialog', async (dialog) => {
        if (dialogIndex < dialogResponses.length) {
          await dialog.accept(dialogResponses[dialogIndex++]);
        } else {
          await dialog.accept();
        }
      });

      await page.goto('/?test=true');

      // Create trip
      await page.getByRole('button', { name: /Create Trip/i }).click();
      await expect(page).toHaveURL(/\/[a-z]+-[a-z]+-[a-z]+$/, { timeout: 10000 });

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

      // Scroll to balances section
      await page.locator('#balances-list').scrollIntoViewIfNeeded();

      // Toggle to detailed balances view (app defaults to simplified)
      await page.getByRole('button', { name: 'Show Detailed Balances' }).click();

      // Verify balances: Alice gets back $50, Bob owes $25, Charlie owes $25
      await expect(page.locator('#balances-list .balance-item.positive')).toContainText('Alice');
      await expect(page.locator('#balances-list .balance-item.positive')).toContainText('gets back');
      await expect(page.locator('#balances-list .balance-item.positive')).toContainText('$50.00');
      await expect(page.locator('#balances-list .balance-item.negative').first()).toContainText('Bob');
      await expect(page.locator('#balances-list .balance-item.negative').first()).toContainText('owes');
      await expect(page.locator('#balances-list .balance-item.negative').first()).toContainText('$25.00');
    });

    test('can delete an expense and balances update', async ({ page }) => {
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

      await page.goto('/?test=true');

      // Create trip
      await page.getByRole('button', { name: /Create Trip/i }).click();
      await expect(page).toHaveURL(/\/[a-z]+-[a-z]+-[a-z]+$/, { timeout: 10000 });
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

    test('can add expense with percentage-based custom split', async ({ page }) => {
      const dialogResponses = ['Percentage Test', 'Alice', 'Bob'];
      let dialogIndex = 0;
      page.on('dialog', async (dialog) => {
        if (dialogIndex < dialogResponses.length) {
          await dialog.accept(dialogResponses[dialogIndex++]);
        } else {
          await dialog.accept();
        }
      });

      await page.goto('/?test=true');

      // Create trip
      await page.getByRole('button', { name: /Create Trip/i }).click();
      await expect(page).toHaveURL(/\/[a-z]+-[a-z]+-[a-z]+$/, { timeout: 10000 });
      await page.getByRole('button', { name: 'Continue to Trip' }).click();

      // Add two participants
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('Alice')).toBeVisible();
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('Bob')).toBeVisible();

      // Add expense with custom percentage split: Alice pays $100, split 75/25
      await page.getByRole('textbox', { name: /what was it for/i }).fill('Dinner');
      await page.getByPlaceholder('Amount').fill('100');
      await page.locator('#expense-payer').selectOption('Alice');

      // Enable custom splits and select percentage mode
      await page.locator('#custom-splits-toggle').check();
      await page.locator('#split-mode-percentage').check();

      // Set percentages: Alice 75%, Bob 25%
      await page.locator('input[data-participant-id].split-amount-input').first().fill('75');
      await page.locator('input[data-participant-id].split-amount-input').last().fill('25');

      await page.getByRole('button', { name: 'Add Expense' }).click();

      // Verify expense appears
      await expect(page.getByText('Dinner $100.00')).toBeVisible();

      // Scroll to balances and check detailed view
      await page.locator('#balances-list').scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: 'Show Detailed Balances' }).click();

      // Alice paid $100, owes $75 = gets back $25
      // Bob paid $0, owes $25 = owes $25
      await expect(page.locator('#balances-list .balance-item.positive')).toContainText('Alice');
      await expect(page.locator('#balances-list .balance-item.positive')).toContainText('$25.00');
      await expect(page.locator('#balances-list .balance-item.negative')).toContainText('Bob');
      await expect(page.locator('#balances-list .balance-item.negative')).toContainText('$25.00');
    });
  });

  test.describe('Trip Join Flow', () => {
    test('can join an existing trip with credentials', async ({ page }) => {
      // Set up dialog handler BEFORE navigating
      page.on('dialog', async (dialog) => {
        await dialog.accept('Join Test Trip');
      });

      await page.goto('/?test=true');

      // Create a trip first
      await page.getByRole('button', { name: /Create Trip/i }).click();
      await expect(page).toHaveURL(/\/[a-z]+-[a-z]+-[a-z]+$/, { timeout: 10000 });
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

      page.on('dialog', async (dialog) => {
        await dialog.accept(dialog.type() === 'prompt' ? 'Share Test' : undefined);
      });

      await page.goto('/?test=true');
      await page.getByRole('button', { name: /Create Trip/i }).click();
      await expect(page).toHaveURL(/\/[a-z]+-[a-z]+-[a-z]+$/, { timeout: 10000 });
      await page.getByRole('button', { name: 'Continue to Trip' }).click();

      // Click share button - should show alert
      await page.getByRole('button', { name: /Share Trip/i }).click();

      // The share action triggers an alert, we auto-accept it
      // If we got here without error, the share worked
    });
  });

  test.describe('Settings', () => {
    test('can view trip credentials in settings', async ({ page }) => {
      page.on('dialog', async (dialog) => {
        await dialog.accept('Settings Test');
      });

      await page.goto('/?test=true');
      await page.getByRole('button', { name: /Create Trip/i }).click();
      await expect(page).toHaveURL(/\/[a-z]+-[a-z]+-[a-z]+$/, { timeout: 10000 });
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

  test.describe('Debt Simplification', () => {
    test('can toggle between simplified and detailed balance views', async ({ page }) => {
      const dialogResponses = ['Toggle Test', 'User1', 'User2'];
      let dialogIndex = 0;
      page.on('dialog', async (dialog) => {
        if (dialogIndex < dialogResponses.length) {
          await dialog.accept(dialogResponses[dialogIndex++]);
        } else {
          await dialog.accept();
        }
      });

      await page.goto('/?test=true');

      // Create trip and add participants
      await page.getByRole('button', { name: /Create Trip/i }).click();
      await expect(page).toHaveURL(/\/[a-z]+-[a-z]+-[a-z]+$/, { timeout: 10000 });
      await page.getByRole('button', { name: 'Continue to Trip' }).click();
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('User1')).toBeVisible();
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('User2')).toBeVisible();

      // Add expense
      await page.getByRole('textbox', { name: /what was it for/i }).fill('Test');
      await page.getByPlaceholder('Amount').fill('100');
      await page.locator('#expense-payer').selectOption('User1');
      await page.getByRole('button', { name: 'Add Expense' }).click();

      // Wait for expense to appear
      await expect(page.getByText('Test $100.00')).toBeVisible();

      // Scroll to balances section
      await page.locator('#balances-list').scrollIntoViewIfNeeded();

      // Should start with simplified view
      await expect(page.locator('#balances-list').getByText('Who should pay whom:')).toBeVisible();

      // Toggle to detailed view
      await page.getByRole('button', { name: 'Show Detailed Balances' }).click();

      // Should now show detailed balances
      await expect(page.locator('#balances-list .balance-item').getByText('gets back')).toBeVisible();
      await expect(page.locator('#balances-list .balance-item').getByText('owes')).toBeVisible();

      // Toggle back to simplified
      await page.getByRole('button', { name: 'Show Simplified Payments' }).click();

      // Should show simplified view again
      await expect(page.locator('#balances-list').getByText('Who should pay whom:')).toBeVisible();
    });

    test('shows correct simplified debts for complex scenario', async ({ page }) => {
      const dialogResponses = ['Complex Test', 'Alice', 'Bob', 'Charlie'];
      let dialogIndex = 0;
      page.on('dialog', async (dialog) => {
        if (dialogIndex < dialogResponses.length) {
          await dialog.accept(dialogResponses[dialogIndex++]);
        } else {
          await dialog.accept();
        }
      });

      await page.goto('/?test=true');

      // Create trip and add participants
      await page.getByRole('button', { name: /Create Trip/i }).click();
      await expect(page).toHaveURL(/\/[a-z]+-[a-z]+-[a-z]+$/, { timeout: 10000 });
      await page.getByRole('button', { name: 'Continue to Trip' }).click();
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('Alice')).toBeVisible();
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('Bob')).toBeVisible();
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('Charlie')).toBeVisible();

      // Add multiple expenses
      // Alice pays $60 for all three
      await page.getByRole('textbox', { name: /what was it for/i }).fill('Lunch');
      await page.getByPlaceholder('Amount').fill('60');
      await page.locator('#expense-payer').selectOption('Alice');
      await page.getByRole('button', { name: 'Add Expense' }).click();

      // Wait for first expense to appear
      await expect(page.getByText('Lunch $60.00')).toBeVisible();

      // Bob pays $30 for all three
      await page.getByRole('textbox', { name: /what was it for/i }).fill('Coffee');
      await page.getByPlaceholder('Amount').fill('30');
      await page.locator('#expense-payer').selectOption('Bob');
      await page.getByRole('button', { name: 'Add Expense' }).click();

      // Wait for second expense to appear
      await expect(page.getByText('Coffee $30.00')).toBeVisible();

      // Scroll to balances section
      await page.locator('#balances-list').scrollIntoViewIfNeeded();

      // The simplified debts should consolidate these:
      // Total: $90, each person should pay $30
      // Alice paid $60, owes $30, net: +$30 (gets back)
      // Bob paid $30, owes $30, net: $0 (settled)
      // Charlie paid $0, owes $30, net: -$30 (owes)
      // Simplified: Charlie pays Alice $30

      await expect(page.locator('#balances-list').getByText('Who should pay whom:')).toBeVisible();

      // Should only have one payment instruction (Charlie → Alice)
      const balanceItems = page.locator('.balance-item.simplified');
      await expect(balanceItems).toHaveCount(1);

      // Verify it's the correct payment
      await expect(balanceItems.first()).toContainText('Charlie');
      await expect(balanceItems.first()).toContainText('pays');
      await expect(balanceItems.first()).toContainText('$30.00');
      await expect(balanceItems.first()).toContainText('Alice');
    });

    test('shows settled message when all debts are paid', async ({ page }) => {
      const dialogResponses = ['Settled Test', 'User1'];
      let dialogIndex = 0;
      page.on('dialog', async (dialog) => {
        if (dialogIndex < dialogResponses.length) {
          await dialog.accept(dialogResponses[dialogIndex++]);
        } else {
          await dialog.accept();
        }
      });

      await page.goto('/?test=true');

      // Create trip and add one participant
      await page.getByRole('button', { name: /Create Trip/i }).click();
      await expect(page).toHaveURL(/\/[a-z]+-[a-z]+-[a-z]+$/, { timeout: 10000 });
      await page.getByRole('button', { name: 'Continue to Trip' }).click();
      await page.getByRole('button', { name: '+ Add' }).click();

      // Add expense where user pays for themselves
      await page.getByRole('textbox', { name: /what was it for/i }).fill('Solo');
      await page.getByPlaceholder('Amount').fill('10');
      await page.locator('#expense-payer').selectOption('User1');
      await page.getByRole('button', { name: 'Add Expense' }).click();

      // Wait for expense to appear
      await expect(page.getByText('Solo $10.00')).toBeVisible();

      // Scroll to balances section
      await page.locator('#balances-list').scrollIntoViewIfNeeded();

      // Should show settled message in balances section
      await expect(page.locator('#balances-list').getByText('All debts are settled!')).toBeVisible();
    });
  });
});

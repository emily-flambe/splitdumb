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
      await expect(page.locator('.modal').getByText('Trip Code')).toBeVisible();
      await expect(page.locator('.modal').getByText('Password', { exact: true })).toBeVisible();
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
      await expect(page.getByText('Paid by: Alice')).toBeVisible();

      // Scroll to balances section
      await page.locator('#balances-list').scrollIntoViewIfNeeded();

      // Verify simplified balances show who pays whom
      await expect(page.locator('#balances-list').getByText('Who should pay whom:')).toBeVisible();
      // Bob and Charlie each owe $25 to Alice
      await expect(page.locator('#balances-list .balance-item').first().getByText('pays')).toBeVisible();
    });

    test('can edit an expense via modal', async ({ page }) => {
      const dialogResponses = ['Edit Modal Test', 'TestUser'];
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

      // Add a participant
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('TestUser')).toBeVisible();

      // Add an expense
      await page.getByRole('textbox', { name: /what was it for/i }).fill('Original Expense');
      await page.getByPlaceholder('Amount').fill('100');
      await page.locator('#expense-payer').selectOption('TestUser');
      await page.getByRole('button', { name: 'Add Expense' }).click();

      // Verify expense appears in expenses list (use specific selector to avoid matching event log)
      await expect(page.locator('#expenses-list .expense-description').getByText('Original Expense')).toBeVisible();
      await expect(page.locator('#expenses-list').getByText('$100.00')).toBeVisible();

      // Wait for the expense item to be ready and click on it to open edit modal
      const expenseItem = page.locator('.expense-item');
      await expenseItem.waitFor({ state: 'visible' });
      await expenseItem.click();

      // Verify edit modal opens with correct title
      await expect(page.getByRole('heading', { name: 'Edit Expense' })).toBeVisible();

      // Verify form is pre-populated
      await expect(page.locator('#edit-expense-description')).toHaveValue('Original Expense');
      await expect(page.locator('#edit-expense-amount')).toHaveValue('100.00');

      // Edit the values
      await page.locator('#edit-expense-description').fill('Updated Expense');
      await page.locator('#edit-expense-amount').fill('75.50');

      // Save changes
      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Verify modal closes and expense is updated (use specific selector)
      await expect(page.getByRole('heading', { name: 'Edit Expense' })).not.toBeVisible();
      await expect(page.locator('#expenses-list .expense-description').getByText('Updated Expense')).toBeVisible();
      await expect(page.locator('#expenses-list').getByText('$75.50')).toBeVisible();
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

      // Scroll to balances and verify simplified view shows Bob pays Alice
      await page.locator('#balances-list').scrollIntoViewIfNeeded();

      // Bob paid $0, owes $25 = pays $25 to Alice
      await expect(page.locator('#balances-list').getByText('Who should pay whom:')).toBeVisible();
      await expect(page.locator('#balances-list .balance-item').getByText('Bob')).toBeVisible();
      await expect(page.locator('#balances-list .balance-item').getByText('pays')).toBeVisible();
      await expect(page.locator('#balances-list .balance-item').getByText('Alice')).toBeVisible();
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
      const password = await page.locator('#modal-password-value').textContent();
      expect(tripCode).toBeTruthy();
      expect(password).toBeTruthy();

      // Go to trip and then back to landing
      await page.getByRole('button', { name: 'Continue to Trip' }).click();
      await expect(page.getByRole('heading', { name: 'Join Test Trip' })).toBeVisible();
      await page.getByRole('button', { name: 'Back to home' }).click();
      await expect(page).toHaveURL(/\/\?test=true$|\/$/);

      // Now join using the credentials form
      await page.getByRole('textbox', { name: /trip code/i }).fill(tripCode!);
      await page.getByRole('textbox', { name: /password/i }).fill(password!);
      await page.getByRole('button', { name: 'Join Trip' }).click();

      // Wait for navigation to trip page, then verify heading
      await expect(page).toHaveURL(/\/[a-z]+-[a-z]+-[a-z]+$/, { timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'Join Test Trip' })).toBeVisible();
    });
  });

  test.describe('Share Functionality', () => {
    test('copy button copies to clipboard and shows feedback', async ({ page, context }) => {
      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      page.on('dialog', async (dialog) => {
        await dialog.accept(dialog.type() === 'prompt' ? 'Share Test' : undefined);
      });

      await page.goto('/?test=true');
      await page.getByRole('button', { name: /Create Trip/i }).click();
      await expect(page).toHaveURL(/\/[a-z]+-[a-z]+-[a-z]+$/, { timeout: 10000 });
      await page.getByRole('button', { name: 'Continue to Trip' }).click();

      // Verify share box shows credentials
      await expect(page.locator('#share-url')).not.toHaveText('---');
      await expect(page.locator('#share-password')).not.toHaveText('---');

      // Click copy button
      await page.getByRole('button', { name: 'Copy' }).click();

      // Verify "Copied!" feedback appears
      await expect(page.locator('#copy-feedback')).toHaveClass(/show/);
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
      await expect(page.locator('.modal').getByText('Trip Code')).toBeVisible();
      await expect(page.locator('.modal').getByText('Password', { exact: true })).toBeVisible();
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

  test.describe('Payments', () => {
    test('can add a payment and balances update', async ({ page }) => {
      const dialogResponses = ['Payment Test', 'Alice', 'Bob'];
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

      // Add participants
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('Alice')).toBeVisible();
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('Bob')).toBeVisible();

      // Wait for participant checkboxes to be updated
      await expect(page.locator('.participant-checkbox').nth(1)).toBeVisible();

      // Add expense: Alice pays $100 split between both
      await page.getByRole('textbox', { name: /what was it for/i }).fill('Dinner');
      await page.getByPlaceholder('Amount').fill('100');
      await page.locator('#expense-payer').selectOption('Alice');
      await page.getByRole('button', { name: 'Add Expense' }).click();

      await expect(page.getByText('Dinner $100.00')).toBeVisible();

      // Scroll to balances section
      await page.locator('#balances-list').scrollIntoViewIfNeeded();

      // Verify initial simplified debts: Bob owes Alice $50
      await expect(page.locator('.balance-item.simplified')).toContainText('Bob');
      await expect(page.locator('.balance-item.simplified')).toContainText('pays');
      await expect(page.locator('.balance-item.simplified')).toContainText('$50.00');
      await expect(page.locator('.balance-item.simplified')).toContainText('Alice');

      // Scroll to payments section
      await page.locator('#payments-list').scrollIntoViewIfNeeded();

      // Add a payment: Bob pays Alice $20
      await page.locator('#payment-from').selectOption('Bob');
      await page.locator('#payment-to').selectOption('Alice');
      await page.locator('#payment-amount').fill('20');
      await page.locator('.btn-add-payment').click();

      // Wait for payment to appear
      await expect(page.locator('.payment-item')).toBeVisible();
      await expect(page.locator('.payment-item')).toContainText('Bob');
      await expect(page.locator('.payment-item')).toContainText('Alice');
      await expect(page.locator('.payment-item')).toContainText('$20.00');

      // Scroll back to balances section
      await page.locator('#balances-list').scrollIntoViewIfNeeded();

      // Verify updated simplified debts: Bob now owes Alice $30
      await expect(page.locator('.balance-item.simplified')).toContainText('$30.00');
    });

    test('can edit a payment amount inline', async ({ page }) => {
      const dialogResponses = ['Edit Payment Test', 'Alice', 'Bob'];
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

      // Add participants
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('Alice')).toBeVisible();
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('Bob')).toBeVisible();

      // Wait for participant checkboxes to be updated
      await expect(page.locator('.participant-checkbox').nth(1)).toBeVisible();

      // Add expense: Alice pays $100
      await page.getByRole('textbox', { name: /what was it for/i }).fill('Dinner');
      await page.getByPlaceholder('Amount').fill('100');
      await page.locator('#expense-payer').selectOption('Alice');
      await page.getByRole('button', { name: 'Add Expense' }).click();

      await expect(page.getByText('Dinner $100.00')).toBeVisible();

      // Scroll to payments section
      await page.locator('#payments-list').scrollIntoViewIfNeeded();

      // Add a payment: Bob pays Alice $20
      await page.locator('#payment-from').selectOption('Bob');
      await page.locator('#payment-to').selectOption('Alice');
      await page.locator('#payment-amount').fill('20');
      await page.locator('.btn-add-payment').click();

      // Wait for payment to appear
      await expect(page.locator('.payment-item .payment-amount')).toContainText('$20.00');

      // Click on the amount to edit it
      await page.locator('.payment-item .payment-amount').click();

      // Wait for input to appear and change value
      const amountInput = page.locator('.payment-item .payment-amount-input');
      await expect(amountInput).toBeVisible();
      await amountInput.fill('35');
      await amountInput.press('Enter');

      // Wait for updated amount to appear
      await expect(page.locator('.payment-item .payment-amount')).toContainText('$35.00');

      // Scroll to balances section
      await page.locator('#balances-list').scrollIntoViewIfNeeded();

      // Verify updated simplified debts: Bob now owes Alice $15 (50 - 35)
      await expect(page.locator('.balance-item.simplified')).toContainText('$15.00');
    });

    test('can delete a payment and balances revert', async ({ page }) => {
      const dialogResponses = ['Delete Payment Test', 'Alice', 'Bob'];
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

      // Add participants
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('Alice')).toBeVisible();
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('Bob')).toBeVisible();

      // Wait for participant checkboxes to be updated
      await expect(page.locator('.participant-checkbox').nth(1)).toBeVisible();

      // Add expense: Alice pays $100
      await page.getByRole('textbox', { name: /what was it for/i }).fill('Dinner');
      await page.getByPlaceholder('Amount').fill('100');
      await page.locator('#expense-payer').selectOption('Alice');
      await page.getByRole('button', { name: 'Add Expense' }).click();

      await expect(page.getByText('Dinner $100.00')).toBeVisible();

      // Scroll to payments section
      await page.locator('#payments-list').scrollIntoViewIfNeeded();

      // Add a payment: Bob pays Alice $20
      await page.locator('#payment-from').selectOption('Bob');
      await page.locator('#payment-to').selectOption('Alice');
      await page.locator('#payment-amount').fill('20');
      await page.locator('.btn-add-payment').click();

      // Wait for payment to appear
      await expect(page.locator('.payment-item')).toBeVisible();

      // Scroll to balances section to verify $30 debt
      await page.locator('#balances-list').scrollIntoViewIfNeeded();
      await expect(page.locator('.balance-item.simplified')).toContainText('$30.00');

      // Scroll back to payments section
      await page.locator('#payments-list').scrollIntoViewIfNeeded();

      // Delete the payment
      await page.locator('.btn-delete-payment').click();

      // Wait for payment to be removed
      await expect(page.locator('.payment-item')).not.toBeVisible();
      await expect(page.locator('#payments-list').getByText('No payments logged yet')).toBeVisible();

      // Scroll to balances section
      await page.locator('#balances-list').scrollIntoViewIfNeeded();

      // Verify balances reverted: Bob owes Alice $50 again
      await expect(page.locator('.balance-item.simplified')).toContainText('$50.00');
    });
  });

  test.describe('Activity Log', () => {
    test('shows empty state initially', async ({ page }) => {
      const dialogResponses = ['Activity Test'];
      let dialogIndex = 0;
      page.on('dialog', async (dialog) => {
        if (dialogIndex < dialogResponses.length) {
          await dialog.accept(dialogResponses[dialogIndex++]);
        } else {
          await dialog.accept();
        }
      });

      await page.goto('/?test=true');
      await page.getByRole('button', { name: /Create Trip/i }).click();
      await expect(page).toHaveURL(/\/[a-z]+-[a-z]+-[a-z]+$/, { timeout: 10000 });
      await page.getByRole('button', { name: 'Continue to Trip' }).click();

      // Scroll to activity section
      await page.locator('#event-log').scrollIntoViewIfNeeded();

      // Should show empty state
      await expect(page.locator('#event-log').getByText('No activity yet')).toBeVisible();
    });

    test('logs participant added event', async ({ page }) => {
      const dialogResponses = ['Activity Test', 'Alice'];
      let dialogIndex = 0;
      page.on('dialog', async (dialog) => {
        if (dialogIndex < dialogResponses.length) {
          await dialog.accept(dialogResponses[dialogIndex++]);
        } else {
          await dialog.accept();
        }
      });

      await page.goto('/?test=true');
      await page.getByRole('button', { name: /Create Trip/i }).click();
      await expect(page).toHaveURL(/\/[a-z]+-[a-z]+-[a-z]+$/, { timeout: 10000 });
      await page.getByRole('button', { name: 'Continue to Trip' }).click();

      // Add a participant
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('Alice')).toBeVisible();

      // Scroll to activity section
      await page.locator('#event-log').scrollIntoViewIfNeeded();

      // Should show participant added event
      await expect(page.locator('#event-log').getByText('Alice was added to trip')).toBeVisible();
    });

    test('logs expense added event', async ({ page }) => {
      const dialogResponses = ['Activity Test', 'Alice'];
      let dialogIndex = 0;
      page.on('dialog', async (dialog) => {
        if (dialogIndex < dialogResponses.length) {
          await dialog.accept(dialogResponses[dialogIndex++]);
        } else {
          await dialog.accept();
        }
      });

      await page.goto('/?test=true');
      await page.getByRole('button', { name: /Create Trip/i }).click();
      await expect(page).toHaveURL(/\/[a-z]+-[a-z]+-[a-z]+$/, { timeout: 10000 });
      await page.getByRole('button', { name: 'Continue to Trip' }).click();

      // Add a participant
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('Alice')).toBeVisible();

      // Add an expense
      await page.getByRole('textbox', { name: /what was it for/i }).fill('Lunch');
      await page.getByPlaceholder('Amount').fill('25');
      await page.locator('#expense-payer').selectOption('Alice');
      await page.getByRole('button', { name: 'Add Expense' }).click();

      // Wait for expense to appear
      await expect(page.getByText('Lunch $25.00')).toBeVisible();

      // Scroll to activity section
      await page.locator('#event-log').scrollIntoViewIfNeeded();

      // Should show expense added event
      await expect(page.locator('#event-log').getByText('"Lunch" ($25.00) was added')).toBeVisible();
    });

    test('logs expense modified and deleted events', async ({ page }) => {
      const dialogResponses = ['Activity Test', 'Alice'];
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
      await page.getByRole('button', { name: /Create Trip/i }).click();
      await expect(page).toHaveURL(/\/[a-z]+-[a-z]+-[a-z]+$/, { timeout: 10000 });
      await page.getByRole('button', { name: 'Continue to Trip' }).click();

      // Add a participant
      await page.getByRole('button', { name: '+ Add' }).click();
      await expect(page.locator('#participants-list').getByText('Alice')).toBeVisible();

      // Add an expense
      await page.getByRole('textbox', { name: /what was it for/i }).fill('Dinner');
      await page.getByPlaceholder('Amount').fill('50');
      await page.locator('#expense-payer').selectOption('Alice');
      await page.getByRole('button', { name: 'Add Expense' }).click();
      await expect(page.getByText('Dinner $50.00')).toBeVisible();

      // Click on expense to edit
      await page.locator('#expenses-list .expense-item').first().click();
      await expect(page.locator('.modal')).toBeVisible();

      // Edit the expense
      await page.locator('#edit-expense-description').fill('Updated Dinner');
      await page.locator('.modal').getByRole('button', { name: 'Save Changes' }).click();
      await expect(page.locator('.modal')).not.toBeVisible();

      // Scroll to activity section
      await page.locator('#event-log').scrollIntoViewIfNeeded();

      // Should show expense modified event
      await expect(page.locator('#event-log').getByText('"Updated Dinner" was modified')).toBeVisible();

      // Now delete the expense using the delete button on the expense item
      await page.getByLabel('Delete expense').click();

      // Should show expense deleted event
      await expect(page.locator('#event-log').getByText('"Updated Dinner" was deleted')).toBeVisible();
    });
  });
});

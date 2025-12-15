// src/frontend/app.ts
import type { TripWithParticipants, Participant, ExpenseWithSplits, Balance } from '../types';
import {
  createTrip,
  authTrip,
  getTrip,
  addParticipant,
  deleteParticipant,
  createExpense,
  deleteExpense,
  getExpenses,
  getBalances,
  getCredentials,
  clearCredentials,
  ApiError,
} from './api';

// State management
interface AppState {
  currentView: 'landing' | 'trip';
  currentSlug: string | null;
  trip: TripWithParticipants | null;
  expenses: ExpenseWithSplits[];
  balances: Balance[];
  loading: boolean;
}

const state: AppState = {
  currentView: 'landing',
  currentSlug: null,
  trip: null,
  expenses: [],
  balances: [],
  loading: false,
};

// DOM Elements
const landingView = document.getElementById('landing') as HTMLElement;
const tripView = document.getElementById('trip-view') as HTMLElement;
const createTripBtn = document.getElementById('create-trip-btn') as HTMLButtonElement;
const joinForm = document.getElementById('join-form') as HTMLFormElement;
const tripSlugInput = document.getElementById('trip-slug') as HTMLInputElement;
const tripPasswordInput = document.getElementById('trip-password') as HTMLInputElement;
const backBtn = document.getElementById('back-btn') as HTMLButtonElement;
const tripNameDisplay = document.getElementById('trip-name') as HTMLHeadingElement;
const shareBtn = document.getElementById('share-btn') as HTMLButtonElement;
const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
const participantsList = document.getElementById('participants-list') as HTMLUListElement;
const addParticipantBtn = document.getElementById('add-participant-btn') as HTMLButtonElement;
const expenseForm = document.getElementById('expense-form') as HTMLFormElement;
const expenseDescription = document.getElementById('expense-description') as HTMLInputElement;
const expenseAmount = document.getElementById('expense-amount') as HTMLInputElement;
const expensePayer = document.getElementById('expense-payer') as HTMLSelectElement;
const participantCheckboxes = document.getElementById('participant-checkboxes') as HTMLDivElement;
const customSplitsToggle = document.getElementById('custom-splits-toggle') as HTMLInputElement;
const customSplitsSection = document.getElementById('custom-splits') as HTMLDivElement;
const customSplitInputs = document.getElementById('custom-split-inputs') as HTMLDivElement;
const expensesList = document.getElementById('expenses-list') as HTMLUListElement;
const balancesList = document.getElementById('balances-list') as HTMLDivElement;

// Routing
function navigateTo(path: string) {
  window.history.pushState({}, '', path);
  handleRoute();
}

function handleRoute() {
  const path = window.location.pathname;

  if (path === '/') {
    showLandingView();
  } else {
    const slug = path.slice(1); // Remove leading slash
    if (slug) {
      showTripView(slug);
    } else {
      showLandingView();
    }
  }
}

function showLandingView() {
  state.currentView = 'landing';
  landingView.classList.add('active');
  tripView.classList.remove('active');
}

function showTripView(slug: string) {
  state.currentView = 'trip';
  state.currentSlug = slug;
  landingView.classList.remove('active');
  tripView.classList.add('active');
  loadTripData(slug);
}

// Landing page handlers
async function handleCreateTrip() {
  const tripName = prompt('Enter trip name:');
  if (!tripName?.trim()) return;

  try {
    const result = await createTrip(tripName.trim());
    navigateTo(`/${result.slug}`);
  } catch (error) {
    if (error instanceof ApiError) {
      alert(`Failed to create trip: ${error.message}`);
    } else {
      alert('Failed to create trip. Please try again.');
    }
  }
}

async function handleJoinTrip(event: Event) {
  event.preventDefault();

  const slug = tripSlugInput.value.trim();
  const password = tripPasswordInput.value.trim();

  if (!slug || !password) return;

  try {
    await authTrip(slug, password);
    navigateTo(`/${slug}`);
  } catch (error) {
    if (error instanceof ApiError) {
      alert(`Failed to join trip: ${error.message}`);
    } else {
      alert('Failed to join trip. Please try again.');
    }
  }
}

// Trip view handlers
async function loadTripData(slug: string) {
  state.loading = true;

  try {
    const [trip, balances, expenses] = await Promise.all([
      getTrip(slug),
      getBalances(slug),
      getExpenses(slug),
    ]);

    state.trip = trip;
    state.balances = balances;
    state.expenses = expenses;

    renderTripView();
    renderExpenses();
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        // Not authenticated, redirect to landing
        clearCredentials();
        navigateTo('/');
      } else {
        alert(`Failed to load trip: ${error.message}`);
      }
    } else {
      alert('Failed to load trip. Please try again.');
    }
  } finally {
    state.loading = false;
  }
}

function renderTripView() {
  if (!state.trip) return;

  // Update trip name
  tripNameDisplay.textContent = state.trip.name;

  // Render participants
  renderParticipants();

  // Render expense form
  renderExpenseForm();

  // Render balances
  renderBalances();
}

function renderParticipants() {
  if (!state.trip) return;

  const participants = state.trip.participants;

  if (participants.length === 0) {
    participantsList.innerHTML = '<li class="empty-state">No participants yet. Add some!</li>';
    return;
  }

  participantsList.innerHTML = participants
    .map(
      (p) => `
      <li class="participant-item">
        <span class="participant-name">${escapeHtml(p.name)}</span>
        <button class="btn-delete" data-participant-id="${p.id}" aria-label="Remove ${escapeHtml(p.name)}">×</button>
      </li>
    `
    )
    .join('');

  // Add delete handlers
  participantsList.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const participantId = parseInt((e.target as HTMLElement).dataset.participantId || '0');
      if (participantId && confirm('Remove this participant? Their expenses will remain.')) {
        await handleDeleteParticipant(participantId);
      }
    });
  });
}

function renderExpenseForm() {
  if (!state.trip) return;

  const participants = state.trip.participants;

  // Update payer select
  expensePayer.innerHTML =
    '<option value="">Who paid?</option>' +
    participants.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');

  // Update participant checkboxes
  participantCheckboxes.innerHTML = participants
    .map(
      (p) => `
      <label class="checkbox-label">
        <input type="checkbox" class="participant-checkbox" value="${p.id}" checked>
        <span>${escapeHtml(p.name)}</span>
      </label>
    `
    )
    .join('');

  // Update custom split inputs
  renderCustomSplitInputs();
}

function renderCustomSplitInputs() {
  if (!state.trip) return;

  const participants = state.trip.participants;

  customSplitInputs.innerHTML = participants
    .map(
      (p) => `
      <div class="split-input-row">
        <label for="split-${p.id}">${escapeHtml(p.name)}</label>
        <input
          type="number"
          id="split-${p.id}"
          class="split-amount-input"
          data-participant-id="${p.id}"
          placeholder="0.00"
          step="0.01"
          min="0"
        >
      </div>
    `
    )
    .join('');
}

function renderBalances() {
  if (state.balances.length === 0) {
    balancesList.innerHTML = '<div class="empty-state">Add expenses to see balances</div>';
    return;
  }

  balancesList.innerHTML = state.balances
    .map((balance) => {
      const netAmount = Math.abs(balance.net);
      const sign = balance.net > 0 ? '+' : balance.net < 0 ? '-' : '';
      const colorClass = balance.net > 0 ? 'positive' : balance.net < 0 ? 'negative' : 'neutral';

      return `
        <div class="balance-item ${colorClass}">
          <span class="balance-name">${escapeHtml(balance.participant_name)}</span>
          <span class="balance-amount">${sign}$${netAmount.toFixed(2)}</span>
        </div>
      `;
    })
    .join('');
}

async function handleAddParticipant() {
  if (!state.currentSlug) return;

  const name = prompt('Enter participant name:');
  if (!name?.trim()) return;

  try {
    await addParticipant(state.currentSlug, name.trim());
    await loadTripData(state.currentSlug);
  } catch (error) {
    if (error instanceof ApiError) {
      alert(`Failed to add participant: ${error.message}`);
    } else {
      alert('Failed to add participant. Please try again.');
    }
  }
}

async function handleDeleteParticipant(participantId: number) {
  if (!state.currentSlug) return;

  try {
    await deleteParticipant(state.currentSlug, participantId);
    await loadTripData(state.currentSlug);
  } catch (error) {
    if (error instanceof ApiError) {
      alert(`Failed to delete participant: ${error.message}`);
    } else {
      alert('Failed to delete participant. Please try again.');
    }
  }
}

async function handleAddExpense(event: Event) {
  event.preventDefault();
  if (!state.currentSlug || !state.trip) return;

  const description = expenseDescription.value.trim();
  const amount = parseFloat(expenseAmount.value);
  const paidBy = parseInt(expensePayer.value);

  if (!description || !amount || !paidBy) {
    alert('Please fill in all fields');
    return;
  }

  // Get splits based on mode
  let splits: { participant_id: number; amount: number }[];

  if (customSplitsToggle.checked) {
    // Custom splits mode
    splits = [];
    const splitInputs = customSplitInputs.querySelectorAll('.split-amount-input') as NodeListOf<HTMLInputElement>;

    for (const input of splitInputs) {
      const splitAmount = parseFloat(input.value);
      if (splitAmount > 0) {
        splits.push({
          participant_id: parseInt(input.dataset.participantId || '0'),
          amount: splitAmount,
        });
      }
    }

    if (splits.length === 0) {
      alert('Please enter at least one split amount');
      return;
    }

    // Validate that splits sum to expense amount
    const totalSplits = splits.reduce((sum, split) => sum + split.amount, 0);
    if (Math.abs(totalSplits - amount) > 0.01) {
      alert(`Split amounts ($${totalSplits.toFixed(2)}) must equal expense amount ($${amount.toFixed(2)})`);
      return;
    }
  } else {
    // Equal split mode
    const checkboxes = participantCheckboxes.querySelectorAll(
      '.participant-checkbox:checked'
    ) as NodeListOf<HTMLInputElement>;

    if (checkboxes.length === 0) {
      alert('Please select at least one participant to split with');
      return;
    }

    const splitAmount = amount / checkboxes.length;
    splits = Array.from(checkboxes).map((checkbox) => ({
      participant_id: parseInt(checkbox.value),
      amount: splitAmount,
    }));
  }

  try {
    await createExpense(state.currentSlug, {
      description,
      amount,
      paid_by: paidBy,
      splits,
    });

    // Reset form
    expenseForm.reset();
    // Re-check all checkboxes
    participantCheckboxes.querySelectorAll('.participant-checkbox').forEach((cb) => {
      (cb as HTMLInputElement).checked = true;
    });
    // Hide custom splits if it was visible
    if (customSplitsToggle.checked) {
      customSplitsToggle.checked = false;
      customSplitsSection.style.display = 'none';
    }

    // Reload data
    await loadTripData(state.currentSlug);
  } catch (error) {
    if (error instanceof ApiError) {
      alert(`Failed to add expense: ${error.message}`);
    } else {
      alert('Failed to add expense. Please try again.');
    }
  }
}

async function handleDeleteExpense(expenseId: number) {
  if (!state.currentSlug) return;

  try {
    await deleteExpense(state.currentSlug, expenseId);
    await loadTripData(state.currentSlug);
  } catch (error) {
    if (error instanceof ApiError) {
      alert(`Failed to delete expense: ${error.message}`);
    } else {
      alert('Failed to delete expense. Please try again.');
    }
  }
}

function handleShareTrip() {
  if (!state.currentSlug) return;

  const credentials = getCredentials();
  if (!credentials) {
    alert('Unable to share trip - credentials not found');
    return;
  }

  const shareMessage = `Join my trip on SplitDumb!

splitdumb.emilycogsdill.com/${credentials.slug}
Password: ${credentials.password}

(it's super secure don't worry)`;

  // Copy to clipboard
  navigator.clipboard
    .writeText(shareMessage)
    .then(() => {
      alert('Share link copied to clipboard!');
    })
    .catch(() => {
      // Fallback: show the message
      prompt('Copy this message to share:', shareMessage);
    });
}

function handleSettings() {
  if (!state.currentSlug || !state.trip) return;

  const action = confirm(
    'Delete this trip? This cannot be undone.\n\nClick OK to delete, Cancel to go back.'
  );

  if (action) {
    // Note: deleteTrip functionality would need to be implemented
    // For now, just redirect to landing
    clearCredentials();
    navigateTo('/');
  }
}

// Utility functions
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event listeners
createTripBtn.addEventListener('click', handleCreateTrip);
joinForm.addEventListener('submit', handleJoinTrip);
backBtn.addEventListener('click', () => navigateTo('/'));
shareBtn.addEventListener('click', handleShareTrip);
settingsBtn.addEventListener('click', handleSettings);
addParticipantBtn.addEventListener('click', handleAddParticipant);
expenseForm.addEventListener('submit', handleAddExpense);

// Toggle custom splits
customSplitsToggle.addEventListener('change', () => {
  if (customSplitsToggle.checked) {
    customSplitsSection.style.display = 'block';
    document.getElementById('participants-selection')!.style.display = 'none';
  } else {
    customSplitsSection.style.display = 'none';
    document.getElementById('participants-selection')!.style.display = 'block';
  }
});

// Handle browser back/forward
window.addEventListener('popstate', handleRoute);

// Auto-login check on page load
function checkAutoLogin() {
  const credentials = getCredentials();
  const currentPath = window.location.pathname;

  // If we're on landing page and have credentials, redirect to trip
  if (currentPath === '/' && credentials) {
    navigateTo(`/${credentials.slug}`);
    return;
  }

  // Otherwise, handle the current route
  handleRoute();
}

// Initialize app
checkAutoLogin();

function renderExpenses() {
  if (state.expenses.length === 0) {
    expensesList.innerHTML = '<li class="empty-state">No expenses yet. Add one above!</li>';
    return;
  }

  expensesList.innerHTML = state.expenses
    .map((expense) => {
      const date = new Date(expense.created_at);
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      return `
        <li class="expense-item">
          <div class="expense-info">
            <div class="expense-header">
              <span class="expense-description">${escapeHtml(expense.description)}</span>
              <span class="expense-amount">$${expense.amount.toFixed(2)}</span>
            </div>
            <div class="expense-meta">
              <span class="expense-payer">Paid by ${escapeHtml(expense.payer_name)}</span>
              <span class="expense-date">${dateStr}</span>
            </div>
          </div>
          <button class="btn-delete" data-expense-id="${expense.id}" aria-label="Delete expense">×</button>
        </li>
      `;
    })
    .join('');

  // Add delete handlers
  expensesList.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const expenseId = parseInt((e.target as HTMLElement).dataset.expenseId || '0');
      if (expenseId && confirm('Delete this expense?')) {
        await handleDeleteExpense(expenseId);
      }
    });
  });
}

export {};

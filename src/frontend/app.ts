// src/frontend/app.ts
import type { TripWithParticipants, Participant, ExpenseWithSplits, Balance, SimplifiedDebt, PaymentWithNames, EventLog } from '../types';
import {
  createTrip,
  authTrip,
  getTrip,
  updateTrip,
  deleteTrip,
  addParticipant,
  deleteParticipant,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenses,
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
  getBalances,
  getSimplifiedDebts,
  getEvents,
  getCredentials,
  saveCredentials,
  clearCredentials,
  ApiError,
} from './api';

// Admin types
interface AdminTrip {
  id: number;
  slug: string;
  name: string;
  is_test: number;
  created_at: number;
  updated_at: number;
}

// State management
interface AppState {
  currentView: 'landing' | 'trip' | 'admin';
  currentSlug: string | null;
  trip: TripWithParticipants | null;
  expenses: ExpenseWithSplits[];
  payments: PaymentWithNames[];
  balances: Balance[];
  simplifiedDebts: SimplifiedDebt[];
  events: EventLog[];
  loading: boolean;
  adminPassword: string | null;
  adminTrips: AdminTrip[];
  includeTestTrips: boolean;
}

const state: AppState = {
  currentView: 'landing',
  currentSlug: null,
  trip: null,
  expenses: [],
  payments: [],
  balances: [],
  simplifiedDebts: [],
  events: [],
  loading: false,
  adminPassword: null,
  adminTrips: [],
  includeTestTrips: false,
};

// DOM Elements
const landingView = document.getElementById('landing') as HTMLElement;
const tripView = document.getElementById('trip-view') as HTMLElement;
const adminView = document.getElementById('admin-view') as HTMLElement;
const adminBackBtn = document.getElementById('admin-back-btn') as HTMLButtonElement;
const adminTripsList = document.getElementById('admin-trips-list') as HTMLDivElement;
const createTripBtn = document.getElementById('create-trip-btn') as HTMLButtonElement;
const joinForm = document.getElementById('join-form') as HTMLFormElement;
const tripSlugInput = document.getElementById('trip-slug') as HTMLInputElement;
const tripPasswordInput = document.getElementById('trip-password') as HTMLInputElement;
const backBtn = document.getElementById('back-btn') as HTMLButtonElement;
const tripNameDisplay = document.getElementById('trip-name') as HTMLHeadingElement;
const shareBtn = document.getElementById('share-btn') as HTMLButtonElement;
const shareUrl = document.getElementById('share-url') as HTMLAnchorElement;
const sharePassword = document.getElementById('share-password') as HTMLSpanElement;
const copyFeedback = document.getElementById('copy-feedback') as HTMLSpanElement;
const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
const participantsList = document.getElementById('participants-list') as HTMLUListElement;
const addParticipantBtn = document.getElementById('add-participant-btn') as HTMLButtonElement;
const expenseForm = document.getElementById('expense-form') as HTMLFormElement;
const expenseDescription = document.getElementById('expense-description') as HTMLInputElement;
const expenseAmount = document.getElementById('expense-amount') as HTMLInputElement;
const expensePayer = document.getElementById('expense-payer') as HTMLSelectElement;
const expenseDateInput = document.getElementById('expense-date') as HTMLInputElement;
const participantCheckboxes = document.getElementById('participant-checkboxes') as HTMLDivElement;
const customSplitsToggle = document.getElementById('custom-splits-toggle') as HTMLInputElement;
const customSplitsSection = document.getElementById('custom-splits') as HTMLDivElement;
const customSplitInputs = document.getElementById('custom-split-inputs') as HTMLDivElement;
const splitModeAmount = document.getElementById('split-mode-amount') as HTMLInputElement;
const splitModePercentage = document.getElementById('split-mode-percentage') as HTMLInputElement;
const customSplitsHelper = document.getElementById('custom-splits-helper') as HTMLParagraphElement;
const expensesList = document.getElementById('expenses-list') as HTMLUListElement;
const balancesList = document.getElementById('balances-list') as HTMLDivElement;
const paymentFromSelect = document.getElementById('payment-from') as HTMLSelectElement;
const paymentToSelect = document.getElementById('payment-to') as HTMLSelectElement;
const paymentAmountInput = document.getElementById('payment-amount') as HTMLInputElement;
const addPaymentBtn = document.getElementById('add-payment-btn') as HTMLButtonElement;
const paymentsList = document.getElementById('payments-list') as HTMLDivElement;
const eventLog = document.getElementById('event-log') as HTMLDivElement;

// Modal elements
const modalOverlay = document.getElementById('modal-overlay') as HTMLDivElement;
const modalTitle = document.getElementById('modal-title') as HTMLHeadingElement;
const modalContent = document.getElementById('modal-content') as HTMLDivElement;
const modalClose = document.getElementById('modal-close') as HTMLButtonElement;

// Routing
function navigateTo(path: string) {
  window.history.pushState({}, '', path);
  handleRoute();
}

async function handleRoute() {
  const path = window.location.pathname;

  if (path === '/') {
    showLandingView();
  } else if (path === '/admin') {
    // Prompt for admin password if not already authenticated
    if (!state.adminPassword) {
      const password = await showInputModal('Admin Login', 'Enter admin password:', '', 'password');
      if (!password) {
        navigateTo('/');
        return;
      }
      // Verify admin password
      verifyAdminPassword(password);
    } else {
      showAdminView();
    }
  } else {
    const slug = path.slice(1); // Remove leading slash
    if (slug) {
      await showTripView(slug);
    } else {
      showLandingView();
    }
  }
}

async function verifyAdminPassword(password: string) {
  try {
    const response = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      state.adminPassword = password;
      showAdminView();
    } else {
      showAlertModal('Invalid admin password', 'error');
      navigateTo('/');
    }
  } catch (error) {
    showAlertModal('Failed to verify admin password', 'error');
    navigateTo('/');
  }
}

function showLandingView() {
  state.currentView = 'landing';
  state.currentSlug = null;
  landingView.classList.add('active');
  tripView.classList.remove('active');
  adminView.classList.remove('active');
}

async function showTripView(slug: string) {
  // Check if we have credentials for this trip
  const credentials = getCredentials();

  if (!credentials || credentials.slug !== slug) {
    // No credentials or wrong trip - show password modal
    showPasswordEntryModal(slug);
    return;
  }

  state.currentView = 'trip';
  state.currentSlug = slug;
  landingView.classList.remove('active');
  tripView.classList.add('active');
  adminView.classList.remove('active');
  loadTripData(slug);
}

function showAdminView() {
  state.currentView = 'admin';
  state.currentSlug = null;
  landingView.classList.remove('active');
  tripView.classList.remove('active');
  adminView.classList.add('active');
  loadAdminData();
}

// Landing page handlers
async function handleCreateTrip() {
  const tripName = await showInputModal('Create Trip', 'Trip name:');
  if (!tripName?.trim()) return;

  // Check if test mode is enabled via URL parameter (for E2E tests)
  const isTestTrip = new URLSearchParams(window.location.search).get('test') === 'true';

  try {
    const result = await createTrip(tripName.trim(), isTestTrip);
    // Navigate to trip and show credentials modal
    navigateTo(`/${result.slug}`);
    // Show credentials after a short delay to let the trip view load
    setTimeout(() => {
      showCredentialsModal(result.slug, result.password, true);
    }, 500);
  } catch (error) {
    if (error instanceof ApiError) {
      showAlertModal(`Failed to create trip: ${error.message}`, 'error');
    } else {
      showAlertModal('Failed to create trip. Please try again.', 'error');
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
      showAlertModal(`Failed to join trip: ${error.message}`, 'error');
    } else {
      showAlertModal('Failed to join trip. Please try again.', 'error');
    }
  }
}

// Trip view handlers
async function loadTripData(slug: string) {
  state.loading = true;

  try {
    const [trip, balances, simplifiedDebts, expenses, payments, events] = await Promise.all([
      getTrip(slug),
      getBalances(slug),
      getSimplifiedDebts(slug),
      getExpenses(slug),
      getPayments(slug).catch(() => []), // Payments are optional - don't fail if table doesn't exist
      getEvents(slug).catch(() => []), // Events are optional - don't fail if table doesn't exist
    ]);

    state.trip = trip;
    state.balances = balances;
    state.simplifiedDebts = simplifiedDebts;
    state.expenses = expenses;
    state.payments = payments;
    state.events = events;

    renderTripView();
    renderExpenses();
    renderPayments();
    renderEvents();
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        // Not authenticated, redirect to landing
        clearCredentials();
        navigateTo('/');
      } else {
        showAlertModal(`Failed to load trip: ${error.message}`, 'error');
      }
    } else {
      showAlertModal('Failed to load trip. Please try again.', 'error');
    }
  } finally {
    state.loading = false;
  }
}

function renderTripView() {
  if (!state.trip) return;

  // Update trip name
  tripNameDisplay.textContent = state.trip.name;

  // Update share box with credentials
  const credentials = getCredentials();
  if (credentials) {
    const fullUrl = `https://splitdumb.emilycogsdill.com/${credentials.slug}`;
    shareUrl.textContent = fullUrl;
    shareUrl.href = fullUrl;
    sharePassword.textContent = credentials.password;
  }

  // Render participants
  renderParticipants();

  // Render expense form
  renderExpenseForm();

  // Render payment form
  renderPaymentForm();

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
      if (participantId && await showConfirmModal('Remove this participant? Their expenses will remain.', 'Remove')) {
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
  const isPercentageMode = splitModePercentage.checked;

  // Update helper text
  if (isPercentageMode) {
    customSplitsHelper.textContent = 'Enter percentage for each person (must total 100%):';
  } else {
    customSplitsHelper.textContent = 'Enter custom amounts for each person:';
  }

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
          placeholder="${isPercentageMode ? '0' : '0.00'}"
          step="${isPercentageMode ? '0.01' : '0.01'}"
          min="0"
          ${isPercentageMode ? 'max="100"' : ''}
        >
        ${isPercentageMode ? '<span class="percentage-symbol">%</span>' : ''}
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

  let content = '';

  // Show simplified debts (payment instructions)
  if (state.simplifiedDebts.length === 0) {
    content = '<div class="empty-state">All debts are settled!</div>';
  } else {
    content = `
      <div class="simplified-debts-header">
        <strong>Who should pay whom:</strong>
      </div>
      ${state.simplifiedDebts
        .map((debt) => {
          return `
            <div class="balance-item simplified">
              <span class="balance-name">${escapeHtml(debt.from_participant_name)}</span>
              <span class="balance-status">pays</span>
              <span class="balance-amount">$${debt.amount.toFixed(2)}</span>
              <span class="balance-status">to</span>
              <span class="balance-name">${escapeHtml(debt.to_participant_name)}</span>
            </div>
          `;
        })
        .join('')}
    `;
  }

  balancesList.innerHTML = content;
}

async function handleAddParticipant() {
  if (!state.currentSlug) return;

  const name = await showInputModal('Add Participant', 'Participant name:');
  if (!name?.trim()) return;

  try {
    await addParticipant(state.currentSlug, name.trim());
    await loadTripData(state.currentSlug);
  } catch (error) {
    if (error instanceof ApiError) {
      showAlertModal(`Failed to add participant: ${error.message}`, 'error');
    } else {
      showAlertModal('Failed to add participant. Please try again.', 'error');
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
      showAlertModal(`Failed to delete participant: ${error.message}`, 'error');
    } else {
      showAlertModal('Failed to delete participant. Please try again.', 'error');
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
    showAlertModal('Please fill in all fields', 'error');
    return;
  }

  // Get splits based on mode
  let splits: { participant_id: number; amount: number }[];

  if (customSplitsToggle.checked) {
    // Custom splits mode
    const isPercentageMode = splitModePercentage.checked;
    splits = [];
    const splitInputs = customSplitInputs.querySelectorAll('.split-amount-input') as NodeListOf<HTMLInputElement>;

    if (isPercentageMode) {
      // Percentage mode - collect percentages and validate they sum to 100%
      const percentages: { participant_id: number; percentage: number }[] = [];

      for (const input of splitInputs) {
        const percentage = parseFloat(input.value);
        if (percentage > 0) {
          percentages.push({
            participant_id: parseInt(input.dataset.participantId || '0'),
            percentage: percentage,
          });
        }
      }

      if (percentages.length === 0) {
        showAlertModal('Please enter at least one percentage', 'error');
        return;
      }

      // Validate that percentages sum to 100%
      const totalPercentage = percentages.reduce((sum, p) => sum + p.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        showAlertModal(`Percentages must total 100%. Current total: ${totalPercentage.toFixed(2)}%`, 'error');
        return;
      }

      // Convert percentages to dollar amounts
      splits = percentages.map((p) => ({
        participant_id: p.participant_id,
        amount: (amount * p.percentage) / 100,
      }));
    } else {
      // Dollar amount mode
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
        showAlertModal('Please enter at least one split amount', 'error');
        return;
      }

      // Validate that splits sum to expense amount
      const totalSplits = splits.reduce((sum, split) => sum + split.amount, 0);
      if (Math.abs(totalSplits - amount) > 0.01) {
        showAlertModal(`Split amounts ($${totalSplits.toFixed(2)}) must equal expense amount ($${amount.toFixed(2)})`, 'error');
        return;
      }
    }
  } else {
    // Equal split mode
    const checkboxes = participantCheckboxes.querySelectorAll(
      '.participant-checkbox:checked'
    ) as NodeListOf<HTMLInputElement>;

    if (checkboxes.length === 0) {
      showAlertModal('Please select at least one participant to split with', 'error');
      return;
    }

    const splitAmount = amount / checkboxes.length;
    splits = Array.from(checkboxes).map((checkbox) => ({
      participant_id: parseInt(checkbox.value),
      amount: splitAmount,
    }));
  }

  // Get expense date if provided
  const expenseDateValue = expenseDateInput.value;
  const expenseDate = expenseDateValue ? Math.floor(new Date(expenseDateValue).getTime() / 1000) : null;

  try {
    await createExpense(state.currentSlug, {
      description,
      amount,
      paid_by: paidBy,
      expense_date: expenseDate,
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
      showAlertModal(`Failed to add expense: ${error.message}`, 'error');
    } else {
      showAlertModal('Failed to add expense. Please try again.', 'error');
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
      showAlertModal(`Failed to delete expense: ${error.message}`, 'error');
    } else {
      showAlertModal('Failed to delete expense. Please try again.', 'error');
    }
  }
}

function handleShareTrip() {
  if (!state.currentSlug) return;

  const credentials = getCredentials();
  if (!credentials) return;

  const shareMessage = `URL:
https://splitdumb.emilycogsdill.com/${credentials.slug}
Password:
${credentials.password}`;

  // Copy to clipboard
  navigator.clipboard
    .writeText(shareMessage)
    .then(() => {
      // Show "Copied!" feedback
      copyFeedback.classList.add('show');
      setTimeout(() => {
        copyFeedback.classList.remove('show');
      }, 2000);
    })
    .catch(() => {
      // Fallback: show the message in a modal
      showAlertModal(`Copy this message to share:\n\n${shareMessage}`, 'info');
    });
}

function handleSettings() {
  showSettingsModal();
}

// Admin functions
async function loadAdminData() {
  if (!state.adminPassword) return;

  try {
    const url = `/api/admin/trips?includeTest=${state.includeTestTrips}`;
    const response = await fetch(url, {
      headers: { 'X-Admin-Password': state.adminPassword },
    });

    if (!response.ok) {
      if (response.status === 401) {
        state.adminPassword = null;
        navigateTo('/');
        return;
      }
      throw new Error('Failed to load trips');
    }

    state.adminTrips = await response.json();
    renderAdminTrips();
  } catch (error) {
    showAlertModal('Failed to load admin data', 'error');
    console.error(error);
  }
}

function renderAdminTrips() {
  // Render controls
  const controlsHtml = `
    <div class="admin-controls">
      <label class="toggle-label">
        <input type="checkbox" id="include-test-toggle" ${state.includeTestTrips ? 'checked' : ''}>
        Show test trips
      </label>
      <button class="btn btn-secondary btn-small" id="delete-all-test-btn" style="color: #ef4444;">Delete All Test Trips</button>
    </div>
  `;

  if (state.adminTrips.length === 0) {
    adminTripsList.innerHTML = controlsHtml + '<div class="empty-state">No trips found</div>';
    attachAdminControlListeners();
    return;
  }

  const tripsHtml = state.adminTrips
    .map((trip) => {
      const createdDate = new Date(trip.created_at * 1000).toLocaleDateString();
      const testBadge = trip.is_test ? '<span class="test-badge">TEST</span>' : '';
      return `
        <div class="admin-trip-card" data-slug="${escapeHtml(trip.slug)}">
          <h3>${escapeHtml(trip.name)} ${testBadge}</h3>
          <div class="trip-slug">${escapeHtml(trip.slug)}</div>
          <div class="trip-meta">Created: ${createdDate}</div>
          <div class="admin-trip-actions">
            <button class="btn btn-secondary btn-small admin-rename" data-slug="${escapeHtml(trip.slug)}">Rename</button>
            <button class="btn btn-secondary btn-small admin-password" data-slug="${escapeHtml(trip.slug)}">Change Password</button>
            <button class="btn btn-secondary btn-small admin-delete" data-slug="${escapeHtml(trip.slug)}" style="color: #ef4444;">Delete</button>
          </div>
        </div>
      `;
    })
    .join('');

  adminTripsList.innerHTML = controlsHtml + tripsHtml;
  attachAdminControlListeners();
  attachAdminTripListeners();
}

function attachAdminControlListeners() {
  document.getElementById('include-test-toggle')?.addEventListener('change', async (e) => {
    state.includeTestTrips = (e.target as HTMLInputElement).checked;
    await loadAdminData();
  });

  document.getElementById('delete-all-test-btn')?.addEventListener('click', handleDeleteAllTestTrips);
}

function attachAdminTripListeners() {
  // Add event listeners
  adminTripsList.querySelectorAll('.admin-rename').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const slug = (e.target as HTMLElement).dataset.slug;
      if (slug) handleAdminRename(slug);
    });
  });

  adminTripsList.querySelectorAll('.admin-password').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const slug = (e.target as HTMLElement).dataset.slug;
      if (slug) handleAdminChangePassword(slug);
    });
  });

  adminTripsList.querySelectorAll('.admin-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const slug = (e.target as HTMLElement).dataset.slug;
      if (slug) handleAdminDelete(slug);
    });
  });
}

async function handleAdminRename(slug: string) {
  if (!state.adminPassword) return;

  const trip = state.adminTrips.find((t) => t.slug === slug);
  const newName = await showInputModal('Rename Trip', 'New trip name:', trip?.name || '');
  if (!newName?.trim()) return;

  try {
    const response = await fetch(`/api/admin/trips/${slug}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': state.adminPassword,
      },
      body: JSON.stringify({ name: newName.trim() }),
    });

    if (!response.ok) throw new Error('Failed to rename trip');

    await loadAdminData();
  } catch (error) {
    showAlertModal('Failed to rename trip', 'error');
    console.error(error);
  }
}

async function handleAdminChangePassword(slug: string) {
  if (!state.adminPassword) return;

  const newPassword = await showInputModal('Change Password', 'New password:', '', 'password');
  if (!newPassword?.trim()) return;

  try {
    const response = await fetch(`/api/admin/trips/${slug}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': state.adminPassword,
      },
      body: JSON.stringify({ password: newPassword.trim() }),
    });

    if (!response.ok) throw new Error('Failed to change password');

    showAlertModal('Password updated successfully!', 'success');
  } catch (error) {
    showAlertModal('Failed to change password', 'error');
    console.error(error);
  }
}

async function handleAdminDelete(slug: string) {
  if (!state.adminPassword) return;

  const confirmed = await showConfirmModal(`Are you sure you want to delete trip "${slug}"? This cannot be undone.`);
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/admin/trips/${slug}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Password': state.adminPassword },
    });

    if (!response.ok) throw new Error('Failed to delete trip');

    await loadAdminData();
  } catch (error) {
    showAlertModal('Failed to delete trip', 'error');
    console.error(error);
  }
}

async function handleDeleteAllTestTrips() {
  if (!state.adminPassword) return;

  const confirmed = await showConfirmModal('Delete ALL test trips? This cannot be undone.');
  if (!confirmed) return;

  try {
    const response = await fetch('/api/admin/trips/test', {
      method: 'DELETE',
      headers: { 'X-Admin-Password': state.adminPassword },
    });

    if (!response.ok) throw new Error('Failed to delete test trips');

    const result = await response.json();
    showAlertModal(result.message, 'success');
    await loadAdminData();
  } catch (error) {
    showAlertModal('Failed to delete test trips', 'error');
    console.error(error);
  }
}

// Modal functions
function showModal(title: string, content: string) {
  modalTitle.textContent = title;
  modalContent.innerHTML = content;
  modalOverlay.style.display = 'flex';
}

function hideModal() {
  modalOverlay.style.display = 'none';
}

function showAlertModal(message: string, type: 'error' | 'success' | 'info' = 'info') {
  const iconMap = {
    error: '⚠️',
    success: '✓',
    info: 'ℹ️'
  };
  showModal(
    type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Notice',
    `
    <div class="alert-modal-content">
      <span class="alert-icon ${type}">${iconMap[type]}</span>
      <p>${escapeHtml(message)}</p>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" id="alert-ok-btn">OK</button>
    </div>
  `
  );
  document.getElementById('alert-ok-btn')?.addEventListener('click', hideModal);
}

function showInputModal(title: string, label: string, defaultValue = '', inputType = 'text'): Promise<string | null> {
  return new Promise((resolve) => {
    showModal(
      title,
      `
      <form id="input-modal-form" class="input-modal-form">
        <label for="input-modal-value">${escapeHtml(label)}</label>
        <input
          type="${inputType}"
          id="input-modal-value"
          value="${escapeHtml(defaultValue)}"
          required
          autofocus
        >
        <div class="modal-actions">
          <button type="submit" class="btn btn-primary">OK</button>
          <button type="button" id="input-cancel-btn" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    `
    );

    const form = document.getElementById('input-modal-form') as HTMLFormElement;
    const input = document.getElementById('input-modal-value') as HTMLInputElement;
    const cancelBtn = document.getElementById('input-cancel-btn') as HTMLButtonElement;

    input.focus();
    input.select();

    const cleanup = () => {
      modalClose.removeEventListener('click', handleCancel);
    };

    const handleCancel = () => {
      cleanup();
      hideModal();
      resolve(null);
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = input.value.trim();
      cleanup();
      hideModal();
      resolve(value || null);
    });

    cancelBtn.addEventListener('click', handleCancel);

    // Override modal close to resolve null
    modalClose.removeEventListener('click', hideModal);
    modalClose.addEventListener('click', handleCancel);
  });
}

function showConfirmModal(message: string, confirmText = 'Delete', isDangerous = true): Promise<boolean> {
  return new Promise((resolve) => {
    showModal(
      'Confirm',
      `
      <div class="confirm-modal-content">
        <p>${escapeHtml(message)}</p>
      </div>
      <div class="modal-actions">
        <button id="confirm-yes-btn" class="btn ${isDangerous ? 'btn-danger' : 'btn-primary'}">${escapeHtml(confirmText)}</button>
        <button id="confirm-no-btn" class="btn btn-secondary">Cancel</button>
      </div>
    `
    );

    const yesBtn = document.getElementById('confirm-yes-btn') as HTMLButtonElement;
    const noBtn = document.getElementById('confirm-no-btn') as HTMLButtonElement;

    yesBtn.focus();

    const cleanup = () => {
      modalClose.removeEventListener('click', handleNo);
    };

    const handleYes = () => {
      cleanup();
      hideModal();
      resolve(true);
    };

    const handleNo = () => {
      cleanup();
      hideModal();
      resolve(false);
    };

    yesBtn.addEventListener('click', handleYes);
    noBtn.addEventListener('click', handleNo);

    // Override modal close to resolve false
    modalClose.removeEventListener('click', hideModal);
    modalClose.addEventListener('click', handleNo);
  });
}

function showPasswordEntryModal(slug: string) {
  showModal(
    'Enter Password',
    `
    <p>Enter the password for trip "<strong>${escapeHtml(slug)}</strong>":</p>
    <form id="password-entry-form" class="password-entry-form">
      <input
        type="password"
        id="password-entry-input"
        placeholder="Password"
        required
        autofocus
      >
      <div id="password-error" class="error-message" style="display: none;"></div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-primary">Join Trip</button>
        <button type="button" id="password-cancel-btn" class="btn btn-secondary">Cancel</button>
      </div>
    </form>
  `
  );

  const form = document.getElementById('password-entry-form') as HTMLFormElement;
  const input = document.getElementById('password-entry-input') as HTMLInputElement;
  const errorDiv = document.getElementById('password-error') as HTMLDivElement;
  const cancelBtn = document.getElementById('password-cancel-btn') as HTMLButtonElement;

  // Focus the input
  input.focus();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = input.value.trim();
    if (!password) return;

    try {
      await authTrip(slug, password);
      hideModal();
      // Now show the trip view
      state.currentView = 'trip';
      state.currentSlug = slug;
      landingView.classList.remove('active');
      tripView.classList.add('active');
      adminView.classList.remove('active');
      loadTripData(slug);
    } catch (error) {
      if (error instanceof ApiError) {
        errorDiv.textContent = error.message;
      } else {
        errorDiv.textContent = 'Failed to join trip. Please try again.';
      }
      errorDiv.style.display = 'block';
      input.value = '';
      input.focus();
    }
  });

  cancelBtn.addEventListener('click', () => {
    hideModal();
    navigateTo('/');
  });

  // Override modal close to navigate home
  const closeHandler = () => {
    hideModal();
    navigateTo('/');
  };
  modalClose.removeEventListener('click', hideModal);
  modalClose.addEventListener('click', closeHandler);

  // Reset close handler when modal is hidden
  const observer = new MutationObserver(() => {
    if (modalOverlay.style.display === 'none') {
      modalClose.removeEventListener('click', closeHandler);
      modalClose.addEventListener('click', hideModal);
      observer.disconnect();
    }
  });
  observer.observe(modalOverlay, { attributes: true, attributeFilter: ['style'] });
}

function showCredentialsModal(slug: string, password: string, isNewTrip = false) {
  const title = isNewTrip ? 'Trip Created!' : 'Trip Credentials';
  const intro = isNewTrip
    ? '<p>Share these credentials with your friends so they can join:</p>'
    : '<p>Your trip credentials:</p>';

  let currentPassword = password;

  showModal(
    title,
    `
    ${intro}
    <div class="credential-display">
      <div class="label">Trip Code</div>
      <div class="value">${escapeHtml(slug)}</div>
    </div>
    <div class="credential-display">
      <div class="label">Password</div>
      <div class="value"><span id="modal-password-value">${escapeHtml(password)}</span> <button class="btn-edit-inline" id="edit-password-btn" aria-label="Edit password">✏️</button></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" id="copy-credentials-btn">Copy Share Message</button>
      <button class="btn btn-secondary" id="close-credentials-btn">${isNewTrip ? 'Continue to Trip' : 'Close'}</button>
    </div>
  `
  );

  document.getElementById('edit-password-btn')?.addEventListener('click', async () => {
    const newPassword = await showInputModal('Change Password', 'New password:', currentPassword);
    if (!newPassword?.trim() || newPassword.trim() === currentPassword) return;

    try {
      await updateTrip(slug, { password: newPassword.trim() });
      currentPassword = newPassword.trim();
      const passwordDisplay = document.getElementById('modal-password-value');
      if (passwordDisplay) {
        passwordDisplay.textContent = currentPassword;
      }
      saveCredentials(slug, currentPassword);
    } catch (error) {
      showAlertModal('Failed to update password. Please try again.', 'error');
    }
  });

  document.getElementById('copy-credentials-btn')?.addEventListener('click', () => {
    const shareMessage = `Join my trip on SplitDumb!

https://splitdumb.emilycogsdill.com/${slug}
Password: ${currentPassword}

(it's super secure don't worry)`;

    navigator.clipboard.writeText(shareMessage).then(() => {
      const btn = document.getElementById('copy-credentials-btn');
      if (btn) {
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = 'Copy Share Message';
        }, 2000);
      }
    });
  });

  document.getElementById('close-credentials-btn')?.addEventListener('click', hideModal);
}

function showSettingsModal() {
  if (!state.trip || !state.currentSlug) return;

  showModal(
    'Trip Settings',
    `
    <div class="settings-option" id="settings-rename">
      <div class="option-info">
        <h3>Rename Trip</h3>
        <p>Change the name of this trip</p>
      </div>
      <span class="arrow">→</span>
    </div>
    <div class="settings-option" id="settings-password">
      <div class="option-info">
        <h3>Change Password</h3>
        <p>Set a new password for this trip</p>
      </div>
      <span class="arrow">→</span>
    </div>
    <div class="settings-option" id="settings-view-credentials">
      <div class="option-info">
        <h3>View Credentials</h3>
        <p>See trip code and password</p>
      </div>
      <span class="arrow">→</span>
    </div>
    <div class="settings-option danger" id="settings-delete">
      <div class="option-info">
        <h3>Delete Trip</h3>
        <p>Permanently delete this trip and all data</p>
      </div>
      <span class="arrow">→</span>
    </div>
  `
  );

  document.getElementById('settings-rename')?.addEventListener('click', handleRenameTripSetting);
  document.getElementById('settings-password')?.addEventListener('click', handleChangePasswordSetting);
  document.getElementById('settings-view-credentials')?.addEventListener('click', handleViewCredentialsSetting);
  document.getElementById('settings-delete')?.addEventListener('click', handleDeleteTripSetting);
}

async function handleRenameTripSetting() {
  if (!state.currentSlug || !state.trip) return;

  const newName = await showInputModal('Rename Trip', 'New trip name:', state.trip.name);
  if (!newName?.trim() || newName.trim() === state.trip.name) return;

  try {
    await updateTrip(state.currentSlug, { name: newName.trim() });
    await loadTripData(state.currentSlug);
    hideModal();
  } catch (error) {
    if (error instanceof ApiError) {
      showAlertModal(`Failed to rename trip: ${error.message}`, 'error');
    } else {
      showAlertModal('Failed to rename trip. Please try again.', 'error');
    }
  }
}

async function handleChangePasswordSetting() {
  if (!state.currentSlug) return;

  const newPassword = await showInputModal('Change Password', 'New password:', '', 'password');
  if (!newPassword?.trim()) return;

  try {
    await updateTrip(state.currentSlug, { password: newPassword.trim() });
    showAlertModal('Password updated successfully!', 'success');
    hideModal();
  } catch (error) {
    if (error instanceof ApiError) {
      showAlertModal(`Failed to change password: ${error.message}`, 'error');
    } else {
      showAlertModal('Failed to change password. Please try again.', 'error');
    }
  }
}

function handleViewCredentialsSetting() {
  const credentials = getCredentials();
  if (!credentials) {
    showAlertModal('Credentials not found', 'error');
    return;
  }
  showCredentialsModal(credentials.slug, credentials.password, false);
}

async function handleDeleteTripSetting() {
  if (!state.currentSlug) return;

  const confirmed = await showConfirmModal(
    'Are you sure you want to delete this trip? This will permanently delete all participants, expenses, and data. This cannot be undone.'
  );

  if (!confirmed) return;

  try {
    await deleteTrip(state.currentSlug);
    hideModal();
    navigateTo('/');
  } catch (error) {
    if (error instanceof ApiError) {
      showAlertModal(`Failed to delete trip: ${error.message}`, 'error');
    } else {
      showAlertModal('Failed to delete trip. Please try again.', 'error');
    }
  }
}

// Payment functions
function renderPaymentForm() {
  if (!state.trip) return;

  const participants = state.trip.participants;

  // Update payment from/to selects
  const options = participants.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');

  paymentFromSelect.innerHTML = '<option value="">From</option>' + options;
  paymentToSelect.innerHTML = '<option value="">To</option>' + options;

  // Reset form
  paymentAmountInput.value = '';
  addPaymentBtn.disabled = true;
}

function validatePaymentForm() {
  const fromId = paymentFromSelect.value;
  const toId = paymentToSelect.value;
  const amount = parseFloat(paymentAmountInput.value);

  addPaymentBtn.disabled = !fromId || !toId || fromId === toId || !amount || amount <= 0;
}

function renderPayments() {
  if (state.payments.length === 0) {
    paymentsList.innerHTML = '<div class="empty-state">No payments logged yet</div>';
    return;
  }

  paymentsList.innerHTML = state.payments
    .map(
      (payment) => `
      <div class="payment-item" data-payment-id="${payment.id}">
        <span class="payment-from">${escapeHtml(payment.from_participant_name)}</span>
        <span class="payment-arrow">→</span>
        <span class="payment-to">${escapeHtml(payment.to_participant_name)}</span>
        <span class="payment-amount" data-payment-id="${payment.id}">$${payment.amount.toFixed(2)}</span>
        <button class="btn-delete-payment" data-payment-id="${payment.id}" aria-label="Delete payment">×</button>
      </div>
    `
    )
    .join('');

  // Add click-to-edit handlers for payment amounts
  paymentsList.querySelectorAll('.payment-amount').forEach((amountEl) => {
    amountEl.addEventListener('click', (e) => {
      const paymentId = parseInt((e.target as HTMLElement).dataset.paymentId || '0');
      const payment = state.payments.find((p) => p.id === paymentId);
      if (payment) {
        startEditPaymentAmount(e.target as HTMLElement, payment);
      }
    });
  });

  // Add delete handlers
  paymentsList.querySelectorAll('.btn-delete-payment').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const paymentId = parseInt((e.target as HTMLElement).dataset.paymentId || '0');
      if (paymentId && await showConfirmModal('Delete this payment?')) {
        await handleDeletePayment(paymentId);
      }
    });
  });
}

function startEditPaymentAmount(element: HTMLElement, payment: PaymentWithNames) {
  const currentAmount = payment.amount;

  // Create input
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'payment-amount-input';
  input.value = currentAmount.toFixed(2);
  input.step = '0.01';
  input.min = '0';

  // Replace the span with input
  element.replaceWith(input);
  input.focus();
  input.select();

  // Block invalid keys
  input.addEventListener('keydown', blockInvalidNumberKeys);

  // Handle save on blur or Enter
  const saveEdit = async () => {
    const newAmount = parseFloat(input.value);
    if (!newAmount || newAmount <= 0) {
      // Restore original
      restorePaymentAmountDisplay(input, payment);
      return;
    }

    if (Math.abs(newAmount - currentAmount) < 0.01) {
      // No change
      restorePaymentAmountDisplay(input, payment);
      return;
    }

    try {
      await updatePayment(state.currentSlug!, payment.id, { amount: newAmount });
      await loadTripData(state.currentSlug!);
    } catch (error) {
      showAlertModal('Failed to update payment', 'error');
      restorePaymentAmountDisplay(input, payment);
    }
  };

  input.addEventListener('blur', saveEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    } else if (e.key === 'Escape') {
      restorePaymentAmountDisplay(input, payment);
    }
  });
}

function restorePaymentAmountDisplay(input: HTMLElement, payment: PaymentWithNames) {
  const span = document.createElement('span');
  span.className = 'payment-amount';
  span.dataset.paymentId = String(payment.id);
  span.textContent = `$${payment.amount.toFixed(2)}`;
  input.replaceWith(span);

  // Re-add click handler
  span.addEventListener('click', () => {
    startEditPaymentAmount(span, payment);
  });
}

async function handleAddPayment() {
  if (!state.currentSlug) return;

  const fromId = parseInt(paymentFromSelect.value);
  const toId = parseInt(paymentToSelect.value);
  const amount = parseFloat(paymentAmountInput.value);

  if (!fromId || !toId || fromId === toId || !amount || amount <= 0) {
    return;
  }

  try {
    await createPayment(state.currentSlug, {
      from_participant_id: fromId,
      to_participant_id: toId,
      amount,
    });

    // Reset form
    paymentFromSelect.value = '';
    paymentToSelect.value = '';
    paymentAmountInput.value = '';
    addPaymentBtn.disabled = true;

    // Reload data
    await loadTripData(state.currentSlug);
  } catch (error) {
    if (error instanceof ApiError) {
      showAlertModal(`Failed to add payment: ${error.message}`, 'error');
    } else {
      showAlertModal('Failed to add payment. Please try again.', 'error');
    }
  }
}

async function handleDeletePayment(paymentId: number) {
  if (!state.currentSlug) return;

  try {
    await deletePayment(state.currentSlug, paymentId);
    await loadTripData(state.currentSlug);
  } catch (error) {
    if (error instanceof ApiError) {
      showAlertModal(`Failed to delete payment: ${error.message}`, 'error');
    } else {
      showAlertModal('Failed to delete payment. Please try again.', 'error');
    }
  }
}

// Utility functions
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Block scientific notation in number inputs (e, E, +, -)
function blockInvalidNumberKeys(e: KeyboardEvent) {
  if (['e', 'E', '+', '-'].includes(e.key)) {
    e.preventDefault();
  }
}

// Event listeners
createTripBtn.addEventListener('click', handleCreateTrip);
joinForm.addEventListener('submit', handleJoinTrip);
backBtn.addEventListener('click', () => navigateTo('/'));
shareBtn.addEventListener('click', handleShareTrip);
settingsBtn.addEventListener('click', handleSettings);
addParticipantBtn.addEventListener('click', handleAddParticipant);
expenseForm.addEventListener('submit', handleAddExpense);
expenseAmount.addEventListener('keydown', blockInvalidNumberKeys);

// Payment form event listeners
paymentFromSelect.addEventListener('change', validatePaymentForm);
paymentToSelect.addEventListener('change', validatePaymentForm);
paymentAmountInput.addEventListener('input', validatePaymentForm);
paymentAmountInput.addEventListener('keydown', blockInvalidNumberKeys);
addPaymentBtn.addEventListener('click', handleAddPayment);

// Modal event listeners
modalClose.addEventListener('click', hideModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) hideModal();
});

// Admin event listeners
adminBackBtn.addEventListener('click', () => {
  state.adminPassword = null;
  navigateTo('/');
});

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

// Toggle between amount and percentage mode
splitModeAmount.addEventListener('change', renderCustomSplitInputs);
splitModePercentage.addEventListener('change', renderCustomSplitInputs);

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

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function renderExpenses() {
  if (state.expenses.length === 0) {
    expensesList.innerHTML = '<li class="empty-state">No expenses yet. Add one above!</li>';
    return;
  }

  expensesList.innerHTML = state.expenses
    .map((expense) => {
      const addedDateStr = formatDate(expense.created_at);
      const expenseDateStr = expense.expense_date ? formatDate(expense.expense_date) : null;
      const splitNames = expense.split_participant_names?.join(', ') || 'everyone';

      return `
        <li class="expense-item" data-expense-id="${expense.id}">
          <div class="expense-info">
            <div class="expense-header">
              <span class="expense-description">${escapeHtml(expense.description)}</span>
              <span class="expense-amount">$${expense.amount.toFixed(2)}</span>
            </div>
            <div class="expense-details">
              <div class="expense-detail-row">Added: ${addedDateStr}</div>
              ${expenseDateStr ? `<div class="expense-detail-row">Expense date: ${expenseDateStr}</div>` : ''}
              <div class="expense-detail-row">Paid by: ${escapeHtml(expense.payer_name)}</div>
              <div class="expense-detail-row">Split between: ${escapeHtml(splitNames)}</div>
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
      e.stopPropagation();
      const expenseId = parseInt((e.target as HTMLElement).dataset.expenseId || '0');
      if (expenseId && await showConfirmModal('Delete this expense?')) {
        await handleDeleteExpense(expenseId);
      }
    });
  });

  // Add click-to-edit handlers for expense items
  expensesList.querySelectorAll('.expense-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('btn-delete')) return;
      const expenseId = parseInt((item as HTMLElement).dataset.expenseId || '0');
      const expense = state.expenses.find((exp) => exp.id === expenseId);
      if (expense) {
        showEditExpenseModal(expense);
      }
    });
  });
}

function showEditExpenseModal(expense: ExpenseWithSplits) {
  if (!state.trip) return;

  const participantOptions = state.trip.participants
    .map((p) => `<option value="${p.id}" ${p.id === expense.paid_by ? 'selected' : ''}>${escapeHtml(p.name)}</option>`)
    .join('');

  const participantCheckboxesHtml = state.trip.participants
    .map((p) => {
      const split = expense.splits.find((s) => s.participant_id === p.id);
      const isChecked = split ? 'checked' : '';
      return `
        <label class="checkbox-label">
          <input type="checkbox" class="edit-participant-checkbox" value="${p.id}" ${isChecked}>
          <span>${escapeHtml(p.name)}</span>
        </label>
      `;
    })
    .join('');

  const customSplitInputsHtml = state.trip.participants
    .map((p) => {
      const split = expense.splits.find((s) => s.participant_id === p.id);
      return `
        <div class="custom-split-row">
          <label>${escapeHtml(p.name)}</label>
          <input type="number" class="edit-split-input" data-participant-id="${p.id}"
                 value="${split ? split.amount.toFixed(2) : ''}" placeholder="0.00" step="0.01" min="0">
        </div>
      `;
    })
    .join('');

  const hasCustomSplits = !areEqualSplits(expense);

  // Format expense_date for date input (YYYY-MM-DD)
  const expenseDateValue = expense.expense_date
    ? new Date(expense.expense_date * 1000).toISOString().split('T')[0]
    : '';

  showModal(
    'Edit Expense',
    `
    <form id="edit-expense-form" class="expense-form">
      <div class="form-row">
        <input type="text" id="edit-expense-description" value="${escapeHtml(expense.description)}" placeholder="What was it for?" required>
        <input type="number" id="edit-expense-amount" value="${expense.amount.toFixed(2)}" placeholder="Amount" step="0.01" min="0" inputmode="decimal" required>
      </div>
      <div class="form-row">
        <select id="edit-expense-payer" required>
          ${participantOptions}
        </select>
        <input type="date" id="edit-expense-date" value="${expenseDateValue}" placeholder="When? (optional)">
      </div>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" id="edit-custom-splits-toggle" ${hasCustomSplits ? 'checked' : ''}>
          <span>Custom split amounts</span>
        </label>
      </div>
      <div id="edit-participants-selection" class="participants-selection" style="${hasCustomSplits ? 'display: none;' : ''}">
        <p class="helper-text">Select who this expense is for:</p>
        <div id="edit-participant-checkboxes" class="checkbox-grid">
          ${participantCheckboxesHtml}
        </div>
      </div>
      <div id="edit-custom-splits" class="custom-splits" style="${hasCustomSplits ? '' : 'display: none;'}">
        <p class="helper-text">Enter custom amounts for each person:</p>
        <div id="edit-custom-split-inputs" class="custom-split-inputs">
          ${customSplitInputsHtml}
        </div>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-primary">Save Changes</button>
        <button type="button" id="cancel-edit-btn" class="btn btn-secondary">Cancel</button>
      </div>
    </form>
    `
  );

  // Toggle custom splits visibility
  const customToggle = document.getElementById('edit-custom-splits-toggle') as HTMLInputElement;
  const participantsSection = document.getElementById('edit-participants-selection') as HTMLDivElement;
  const customSplitsSection = document.getElementById('edit-custom-splits') as HTMLDivElement;

  customToggle?.addEventListener('change', () => {
    if (customToggle.checked) {
      participantsSection.style.display = 'none';
      customSplitsSection.style.display = 'block';
    } else {
      participantsSection.style.display = 'block';
      customSplitsSection.style.display = 'none';
    }
  });

  // Handle form submission
  const form = document.getElementById('edit-expense-form') as HTMLFormElement;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleEditExpenseSubmit(expense.id);
  });

  // Block e/E/+/- in amount field
  const editAmountInput = document.getElementById('edit-expense-amount') as HTMLInputElement;
  editAmountInput?.addEventListener('keydown', blockInvalidNumberKeys);

  // Cancel button
  document.getElementById('cancel-edit-btn')?.addEventListener('click', hideModal);
}

function areEqualSplits(expense: ExpenseWithSplits): boolean {
  if (expense.splits.length === 0) return true;
  const expectedAmount = expense.amount / expense.splits.length;
  return expense.splits.every((s) => Math.abs(s.amount - expectedAmount) < 0.01);
}

async function handleEditExpenseSubmit(expenseId: number) {
  if (!state.currentSlug || !state.trip) return;

  const description = (document.getElementById('edit-expense-description') as HTMLInputElement).value.trim();
  const amount = parseFloat((document.getElementById('edit-expense-amount') as HTMLInputElement).value);
  const paidBy = parseInt((document.getElementById('edit-expense-payer') as HTMLSelectElement).value);
  const customToggle = document.getElementById('edit-custom-splits-toggle') as HTMLInputElement;

  if (!description) {
    showAlertModal('Please enter a description', 'error');
    return;
  }

  if (!amount || amount <= 0) {
    showAlertModal('Please enter a valid amount', 'error');
    return;
  }

  let splits: { participant_id: number; amount: number }[];

  if (customToggle.checked) {
    // Custom splits mode
    splits = [];
    const splitInputs = document.querySelectorAll('.edit-split-input') as NodeListOf<HTMLInputElement>;

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
      showAlertModal('Please enter at least one split amount', 'error');
      return;
    }

    const totalSplits = splits.reduce((sum, split) => sum + split.amount, 0);
    if (Math.abs(totalSplits - amount) > 0.01) {
      showAlertModal(`Split amounts ($${totalSplits.toFixed(2)}) must equal expense amount ($${amount.toFixed(2)})`, 'error');
      return;
    }
  } else {
    // Equal split mode
    const checkboxes = document.querySelectorAll('.edit-participant-checkbox:checked') as NodeListOf<HTMLInputElement>;

    if (checkboxes.length === 0) {
      showAlertModal('Please select at least one participant to split with', 'error');
      return;
    }

    const splitAmount = amount / checkboxes.length;
    splits = Array.from(checkboxes).map((checkbox) => ({
      participant_id: parseInt(checkbox.value),
      amount: splitAmount,
    }));
  }

  // Get expense date if provided
  const editExpenseDateValue = (document.getElementById('edit-expense-date') as HTMLInputElement).value;
  const expenseDate = editExpenseDateValue ? Math.floor(new Date(editExpenseDateValue).getTime() / 1000) : null;

  try {
    await updateExpense(state.currentSlug, expenseId, {
      description,
      amount,
      paid_by: paidBy,
      expense_date: expenseDate,
      splits,
    });

    hideModal();
    await loadTripData(state.currentSlug);
  } catch (error) {
    if (error instanceof ApiError) {
      showAlertModal(`Failed to update expense: ${error.message}`, 'error');
    } else {
      showAlertModal('Failed to update expense. Please try again.', 'error');
    }
  }
}

function renderEvents() {
  if (state.events.length === 0) {
    eventLog.innerHTML = '<div class="empty-state">No activity yet</div>';
    return;
  }

  eventLog.innerHTML = state.events
    .map((event) => {
      const date = new Date(event.created_at * 1000);
      const timeStr = formatRelativeTime(date);

      return `
        <div class="event-item">
          <span class="event-description">${escapeHtml(event.description)}</span>
          <span class="event-time">${timeStr}</span>
        </div>
      `;
    })
    .join('');
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export {};

/**
 * ResTool V2 - Main Application
 * V1 Schema Compatible - All Features Working
 */

import { Auth } from './core/auth.js';
import { EventBus } from './core/eventBus.js';
import { checkConnection } from './core/supabase.js';
import { Toast } from './utils/toast.js';
import { Reservations } from './services/reservations.js';
import { Hotels } from './services/hotels.js';
import { formatDate, formatCurrency, formatDateTime } from './utils/formatters.js';
import { ModalManager } from './utils/modal.js';

class App {
  constructor() {
    this.initialized = false;
    this.currentUser = null;
    this.reservations = [];
    this.filters = {
      search: '',
      hotel: '',
      status: 'active'
    };
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.initialized) return;

    try {
      console.log('[App] Starting initialization...');
      
      // Show loading screen
      this.showLoading();

      // Initialize services
      Toast.initialize();
      ModalManager.initialize();
      await Auth.initialize();

      // Check for demo session
      const hasDemoSession = await Auth.checkDemoSession();

      // Check database connection
      const isConnected = await checkConnection();
      this.updateConnectionStatus(isConnected);

      // Setup event listeners
      this.setupEventListeners();

      // Check authentication
      if (Auth.isAuthenticated() || hasDemoSession) {
        await this.onLogin(Auth.getCurrentUser());
      } else {
        this.hideLoading();
        this.showLogin();
      }

      this.initialized = true;
      console.log('[App] Initialization complete!');
    } catch (error) {
      console.error('App initialization error:', error);
      Toast.error('Fehler beim Initialisieren der Anwendung');
      
      this.hideLoading();
      this.showLogin();
      this.initialized = true;
    }
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Auth events
    EventBus.on('auth:login', (user) => this.onLogin(user));
    EventBus.on('auth:logout', () => this.onLogout());

    // Reservation events
    EventBus.on('reservations:created', () => this.handleReservationChange());
    EventBus.on('reservations:updated', () => this.handleReservationChange());
    EventBus.on('reservations:deleted', () => this.handleReservationChange());

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // User menu
    const userMenuTrigger = document.getElementById('user-menu-trigger');
    const userMenu = document.getElementById('user-menu');
    
    if (userMenuTrigger && userMenu) {
      userMenuTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenu.classList.toggle('hidden');
      });

      document.addEventListener('click', () => {
        userMenu.classList.add('hidden');
      });
    }

    // Logout button
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
      btn.addEventListener('click', () => this.handleLogout());
    });

    // New reservation buttons
    document.querySelectorAll('[data-action="new-reservation"]').forEach(btn => {
      btn.addEventListener('click', () => this.openNewReservationModal());
    });

    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.loadReservations();
      });
    }

    // Hotel filter
    const hotelFilter = document.getElementById('kpi-hotel-filter');
    if (hotelFilter) {
      hotelFilter.addEventListener('change', (e) => {
        this.filters.hotel = e.target.value;
        this.loadReservations();
        this.updateKPIs();
      });
    }

    // Status filter
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.loadReservations();
      });
    }
  }

  /**
   * Handle login form submission
   */
  async handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const result = await Toast.promise(
        Auth.login(email, password),
        {
          loading: 'Anmeldung läuft...',
          success: 'Erfolgreich angemeldet!',
          error: 'Anmeldung fehlgeschlagen'
        }
      );

      if (!result.success) {
        Toast.error(result.error || 'Ungültige Anmeldedaten');
      }
    } catch (error) {
      Toast.error('Ein Fehler ist aufgetreten');
    }
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    try {
      await Toast.promise(
        Auth.logout(),
        {
          loading: 'Abmeldung läuft...',
          success: 'Erfolgreich abgemeldet',
          error: 'Abmeldung fehlgeschlagen'
        }
      );
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Called when user logs in
   */
  async onLogin(user) {
    this.currentUser = user;

    // Update UI
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    
    if (userName) userName.textContent = user.name;
    if (userEmail) userEmail.textContent = user.email;

    // Initialize hotels
    await Hotels.initialize();

    // Load hotel filters
    this.loadHotelFilters();

    // Initialize reservations service
    Reservations.initialize();

    // Load data
    await this.loadReservations();
    await this.updateKPIs();

    // Show main app
    this.hideLoading();
    this.hideLogin();
    this.showMainApp();
  }

  /**
   * Called when user logs out
   */
  onLogout() {
    this.currentUser = null;
    this.reservations = [];

    this.hideMainApp();
    this.showLogin();
  }

  /**
   * Handle reservation changes
   */
  async handleReservationChange() {
    await this.loadReservations();
    await this.updateKPIs();
  }

  /**
   * Load reservations from database
   */
  async loadReservations() {
    try {
      const filters = {
        status: this.filters.status
      };
      
      if (this.filters.hotel && this.filters.hotel !== 'all') {
        filters.hotel_code = this.filters.hotel;
      }

      if (this.filters.search) {
        filters.search = this.filters.search;
      }

      const result = await Reservations.getAll(filters);

      if (result.error) {
        throw result.error;
      }

      this.reservations = result.data || [];
      this.renderReservationsTable();
    } catch (error) {
      console.error('Load reservations error:', error);
      Toast.error('Fehler beim Laden der Reservierungen');
    }
  }

  /**
   * Render reservations table
   */
  renderReservationsTable() {
    const container = document.getElementById('reservations-table-container');
    if (!container) return;

    const reservations = this.reservations;

    // Show empty state if no reservations
    if (!reservations || reservations.length === 0) {
      container.innerHTML = `
        <div style="padding: 60px 20px; text-align: center; color: var(--text-secondary);">
          <p style="font-size: 16px; margin-bottom: 8px;">📋 Keine Reservierungen gefunden</p>
          <p style="font-size: 14px;">Erstellen Sie eine neue Reservierung, um loszulegen.</p>
        </div>
      `;
      return;
    }

    // Calculate total price for each reservation
    const calculateTotal = (res) => {
      const nights = Reservations.calculateNights(res.arrival, res.departure);
      return nights * (res.rate_price || 0);
    };

    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Res-Nr.</th>
          <th>Gast</th>
          <th>Hotel</th>
          <th>Anreise</th>
          <th>Abreise</th>
          <th>Kategorie</th>
          <th>Rate</th>
          <th>Gesamt</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${reservations.map(res => `
          <tr data-id="${res.id}" style="cursor: pointer;">
            <td><strong>${res.reservation_number || '-'}</strong></td>
            <td>
              <strong>${res.guest_last_name || 'N/A'}${res.guest_first_name ? ', ' + res.guest_first_name : ''}</strong>
              ${res.guest_email ? `<br><span style="font-size: 12px; color: var(--text-secondary);">${res.guest_email}</span>` : ''}
            </td>
            <td>${res.hotel_name || res.hotel_code || '-'}</td>
            <td>${formatDate(res.arrival)}</td>
            <td>${formatDate(res.departure)}</td>
            <td>${res.category || '-'}</td>
            <td>${res.rate_name || '-'}</td>
            <td><strong>${formatCurrency(calculateTotal(res))}</strong></td>
            <td>
              <span class="status-badge status-badge-${res.status || 'active'}">
                ${this.getStatusLabel(res.status)}
              </span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    `;

    // Add click handlers
    table.querySelectorAll('tbody tr').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.dataset.id;
        this.openEditReservationModal(id);
      });
    });

    container.innerHTML = '';
    container.appendChild(table);
  }

  /**
   * Get status label
   */
  getStatusLabel(status) {
    const labels = {
      active: 'Aktiv',
      confirmed: 'Bestätigt',
      completed: 'Abgeschlossen',
      canceled: 'Storniert',
      done: 'Erledigt'
    };
    return labels[status] || 'Aktiv';
  }

  /**
   * Update KPIs
   */
  async updateKPIs() {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      const hotelCode = this.filters.hotel && this.filters.hotel !== 'all' ? this.filters.hotel : null;
      const todayStats = await Reservations.getStats(today, today, hotelCode);

      // Update KPIs
      document.getElementById('kpi-bookings-today').textContent = todayStats?.totalReservations || 0;
      document.getElementById('kpi-revenue-today').textContent = formatCurrency(todayStats?.totalRevenue || 0, false);
      document.getElementById('kpi-occupancy').textContent = '-%'; // TODO: Calculate from availability
      document.getElementById('kpi-adr').textContent = formatCurrency(todayStats?.averagePrice || 0, false);
    } catch (error) {
      console.error('Update KPIs error:', error);
    }
  }

  /**
   * Load hotel filters
   */
  loadHotelFilters() {
    const hotelFilter = document.getElementById('kpi-hotel-filter');
    const wizardHotel = document.getElementById('wizard-hotel');

    if (hotelFilter) {
      hotelFilter.innerHTML = '<option value="all">Alle Hotels</option>';
      
      const grouped = Hotels.getGrouped();
      Object.keys(grouped).forEach(group => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = group;
        
        grouped[group].forEach(hotel => {
          const option = document.createElement('option');
          option.value = hotel.code;
          option.textContent = Hotels.getDisplayName(hotel);
          optgroup.appendChild(option);
        });
        
        hotelFilter.appendChild(optgroup);
      });
    }

    if (wizardHotel) {
      wizardHotel.innerHTML = '<option value="">Hotel wählen...</option>';
      
      const grouped = Hotels.getGrouped();
      Object.keys(grouped).forEach(group => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = group;
        
        grouped[group].forEach(hotel => {
          const option = document.createElement('option');
          option.value = hotel.code;
          option.textContent = Hotels.getDisplayName(hotel);
          optgroup.appendChild(option);
        });
        
        wizardHotel.appendChild(optgroup);
      });
    }
  }

  /**
   * Open new reservation modal
   */
  openNewReservationModal() {
    ModalManager.open('modal-new-reservation');
    const wizard = new ReservationWizard();
    wizard.initialize();
  }

  /**
   * Open edit reservation modal
   */
  async openEditReservationModal(id) {
    try {
      const reservation = await Reservations.getById(id);
      if (!reservation) {
        Toast.error('Reservierung nicht gefunden');
        return;
      }

      // TODO: Implement edit modal with full details
      Toast.info('Reservierung Details: ' + reservation.reservation_number);
      console.log('Reservation:', reservation);
    } catch (error) {
      Toast.error('Fehler beim Laden der Reservierung');
    }
  }

  /**
   * Update connection status indicator
   */
  updateConnectionStatus(isConnected) {
    const indicator = document.querySelector('.status-indicator');
    if (!indicator) return;

    const label = indicator.querySelector('.status-label');
    const dot = indicator.querySelector('.status-dot');

    if (isConnected) {
      if (dot) dot.style.background = 'var(--success)';
      if (label) label.textContent = 'DB';
      indicator.title = 'Supabase verbunden';
    } else {
      if (dot) dot.style.background = 'var(--error)';
      if (label) label.textContent = 'DB';
      indicator.title = 'Supabase nicht verbunden';
    }
  }

  /**
   * UI State Management
   */
  showLoading() {
    document.getElementById('loading-screen')?.classList.remove('hidden');
  }

  hideLoading() {
    document.getElementById('loading-screen')?.classList.add('hidden');
  }

  showLogin() {
    document.getElementById('login-screen')?.classList.remove('hidden');
  }

  hideLogin() {
    document.getElementById('login-screen')?.classList.add('hidden');
  }

  showMainApp() {
    document.getElementById('main-app')?.classList.remove('hidden');
  }

  hideMainApp() {
    document.getElementById('main-app')?.classList.add('hidden');
  }
}

/**
 * Reservation Wizard - V1 Compatible
 */
class ReservationWizard {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 4;
    this.data = {};
  }

  initialize() {
    this.setupNavigation();
    this.loadCategories();
    this.setDefaultDates();
    this.setupHotelListener();
  }

  setupNavigation() {
    const prevBtn = document.getElementById('wizard-prev');
    const nextBtn = document.getElementById('wizard-next');
    const submitBtn = document.getElementById('wizard-submit');

    // Remove old listeners
    const newPrevBtn = prevBtn.cloneNode(true);
    const newNextBtn = nextBtn.cloneNode(true);
    const newSubmitBtn = submitBtn.cloneNode(true);
    
    prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

    newPrevBtn.addEventListener('click', () => this.previousStep());
    newNextBtn.addEventListener('click', () => this.nextStep());
    newSubmitBtn.addEventListener('click', () => this.submit());
  }

  setupHotelListener() {
    const hotelSelect = document.getElementById('wizard-hotel');
    const rateSelect = document.getElementById('wizard-rate');
    
    if (hotelSelect && rateSelect) {
      hotelSelect.addEventListener('change', () => {
        this.updateRatesForHotel();
      });
    }
  }

  updateRatesForHotel() {
    const hotelCode = document.getElementById('wizard-hotel').value;
    const rateSelect = document.getElementById('wizard-rate');
    
    if (!rateSelect || !hotelCode) return;

    const rates = Hotels.getRatesForHotel(hotelCode);
    
    rateSelect.innerHTML = rates.map(rate => 
      `<option value="${rate.name}" data-price="${rate.price}">${rate.name} (${rate.price} €)</option>`
    ).join('');

    // Trigger price update
    if (rates.length > 0) {
      this.updatePrice();
    }
  }

  updatePrice() {
    const rateSelect = document.getElementById('wizard-rate');
    const priceDisplay = document.getElementById('wizard-price-display');
    
    if (rateSelect && priceDisplay) {
      const selectedOption = rateSelect.options[rateSelect.selectedIndex];
      const price = selectedOption?.dataset.price || 0;
      priceDisplay.textContent = `${price} € pro Nacht`;
    }
  }

  nextStep() {
    if (!this.validateStep(this.currentStep)) return;

    this.collectStepData(this.currentStep);
    
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.updateUI();
      
      if (this.currentStep === this.totalSteps) {
        this.showSummary();
      }
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateUI();
    }
  }

  updateUI() {
    // Update steps
    document.querySelectorAll('.wizard-step').forEach((step, index) => {
      step.classList.toggle('active', index + 1 === this.currentStep);
    });

    // Update pages
    document.querySelectorAll('.wizard-page').forEach((page, index) => {
      page.classList.toggle('active', index + 1 === this.currentStep);
    });

    // Update buttons
    document.getElementById('wizard-prev').disabled = this.currentStep === 1;
    
    const nextBtn = document.getElementById('wizard-next');
    const submitBtn = document.getElementById('wizard-submit');
    
    if (this.currentStep === this.totalSteps) {
      nextBtn.classList.add('hidden');
      submitBtn.classList.remove('hidden');
    } else {
      nextBtn.classList.remove('hidden');
      submitBtn.classList.add('hidden');
    }
  }

  validateStep(step) {
    if (step === 1) {
      const hotel = document.getElementById('wizard-hotel').value;
      const arrival = document.getElementById('wizard-arrival').value;
      const departure = document.getElementById('wizard-departure').value;

      if (!hotel || !arrival || !departure) {
        Toast.warning('Bitte alle Felder ausfüllen');
        return false;
      }

      if (new Date(departure) <= new Date(arrival)) {
        Toast.warning('Abreise muss nach Anreise liegen');
        return false;
      }
    }

    if (step === 2) {
      if (!this.data.category) {
        Toast.warning('Bitte eine Kategorie auswählen');
        return false;
      }
      if (!this.data.rate_name) {
        Toast.warning('Bitte eine Rate auswählen');
        return false;
      }
    }

    if (step === 3) {
      const firstname = document.getElementById('wizard-firstname').value;
      const lastname = document.getElementById('wizard-lastname').value;

      if (!firstname || !lastname) {
        Toast.warning('Vor- und Nachname sind Pflichtfelder');
        return false;
      }
    }

    return true;
  }

  collectStepData(step) {
    if (step === 1) {
      const hotelCode = document.getElementById('wizard-hotel').value;
      const hotel = Hotels.getByCode(hotelCode);
      
      this.data.hotel_code = hotelCode;
      this.data.hotel_name = hotel ? Hotels.getDisplayName(hotel) : hotelCode;
      this.data.arrival = document.getElementById('wizard-arrival').value;
      this.data.departure = document.getElementById('wizard-departure').value;
      this.data.guests_adults = parseInt(document.getElementById('wizard-adults').value) || 1;
      this.data.guests_children = parseInt(document.getElementById('wizard-children').value) || 0;
    }

    if (step === 2) {
      // Category should already be set by card click
      const rateSelect = document.getElementById('wizard-rate');
      const selectedOption = rateSelect.options[rateSelect.selectedIndex];
      
      this.data.rate_name = rateSelect.value;
      this.data.rate_price = parseInt(selectedOption.dataset.price) || 0;
    }

    if (step === 3) {
      this.data.guest_first_name = document.getElementById('wizard-firstname').value;
      this.data.guest_last_name = document.getElementById('wizard-lastname').value;
      this.data.guest_email = document.getElementById('wizard-email').value;
      this.data.guest_phone = document.getElementById('wizard-phone').value;
      this.data.company_name = document.getElementById('wizard-company').value;
      this.data.notes = document.getElementById('wizard-notes').value;
    }
  }

  loadCategories() {
    const grid = document.getElementById('category-grid');
    if (!grid) return;

    const categories = Hotels.getCategories();
    
    grid.innerHTML = categories.map(cat => `
      <div class="category-card" data-category="${cat.name}">
        <div class="category-name">${cat.name}</div>
        <div class="category-meta">
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">
            ${cat.size} • ${cat.beds}
          </div>
          <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">
            ${cat.note}
          </div>
        </div>
      </div>
    `).join('');

    // Add click handlers
    grid.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        grid.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.data.category = card.dataset.category;
      });
    });
  }

  setDefaultDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    document.getElementById('wizard-arrival').value = today.toISOString().split('T')[0];
    document.getElementById('wizard-departure').value = tomorrow.toISOString().split('T')[0];
  }

  showSummary() {
    const summary = document.getElementById('wizard-summary');
    if (!summary) return;

    const hotel = Hotels.getByCode(this.data.hotel_code);
    const nights = Reservations.calculateNights(this.data.arrival, this.data.departure);
    const total = nights * this.data.rate_price;

    summary.innerHTML = `
      <div class="summary-row">
        <span class="summary-label">Hotel</span>
        <span class="summary-value">${this.data.hotel_name || 'N/A'}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Kategorie</span>
        <span class="summary-value">${this.data.category || 'N/A'}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Rate</span>
        <span class="summary-value">${this.data.rate_name || 'N/A'}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Zeitraum</span>
        <span class="summary-value">${formatDate(this.data.arrival)} - ${formatDate(this.data.departure)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Nächte</span>
        <span class="summary-value">${nights}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Gast</span>
        <span class="summary-value">${this.data.guest_first_name} ${this.data.guest_last_name}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Gesamtpreis</span>
        <span class="summary-value">${formatCurrency(total)}</span>
      </div>
    `;
  }

  async submit() {
    try {
      // Ensure all data is collected
      this.collectStepData(3);
      
      console.log('Submitting reservation with data:', this.data);
      
      const result = await Toast.promise(
        Reservations.create(this.data),
        {
          loading: 'Reservierung wird erstellt...',
          success: 'Reservierung erfolgreich erstellt!',
          error: 'Fehler beim Erstellen der Reservierung'
        }
      );

      if (result.data) {
        ModalManager.close('modal-new-reservation');
        // Reset wizard
        this.data = {};
        this.currentStep = 1;
      }
    } catch (error) {
      console.error('Submit error:', error);
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
  });
} else {
  window.app = new App();
  window.app.init();
}

export default App;

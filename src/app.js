/**
 * ResTool V2 - Main Application
 * Modern hotel reservation management system
 */

import { Auth } from './core/auth.js';
import { EventBus } from './core/eventBus.js';
import { checkConnection } from './core/supabase.js';
import { Toast } from './utils/toast.js';
import { Reservations } from './services/reservations.js';
import { Hotels } from './services/hotels.js';
import { formatDate, formatCurrency, formatDateTime } from './utils/formatters.js';
import { ModalManager } from './utils/modal.js';
import { TableManager } from './components/tables/tableManager.js';

class App {
  constructor() {
    this.initialized = false;
    this.currentUser = null;
    this.reservations = [];
    this.filters = {
      search: '',
      hotel: '',
      status: ''
    };
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.initialized) return;

    try {
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
        this.showLogin();
      }

      this.initialized = true;
    } catch (error) {
      console.error('App initialization error:', error);
      Toast.error('Fehler beim Initialisieren der Anwendung');
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
    EventBus.on('reservations:updated', () => this.loadReservations());

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
        this.filterReservations();
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

    // Modal triggers
    document.querySelectorAll('[data-modal]').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        const modalId = trigger.dataset.modal;
        ModalManager.open(modalId);
      });
    });
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

      if (result.success) {
        // onLogin will be called via EventBus
      } else {
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
   * Load reservations from database
   */
  async loadReservations() {
    try {
      const filters = {};
      
      if (this.filters.hotel) {
        filters.hotel = this.filters.hotel;
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
   * Filter reservations locally
   */
  filterReservations() {
    const searchTerm = this.filters.search.toLowerCase();
    
    if (!searchTerm) {
      this.renderReservationsTable();
      return;
    }

    const filtered = this.reservations.filter(res => {
      const searchFields = [
        res.firstname,
        res.lastname,
        res.email,
        res.phone,
        res.hotel
      ].map(f => (f || '').toLowerCase());

      return searchFields.some(field => field.includes(searchTerm));
    });

    this.renderReservationsTable(filtered);
  }

  /**
   * Render reservations table
   */
  renderReservationsTable(data = null) {
    const container = document.getElementById('reservations-table-container');
    if (!container) return;

    const reservations = data || this.reservations;

    if (reservations.length === 0) {
      container.innerHTML = `
        <div style="padding: 60px 20px; text-align: center; color: var(--text-secondary);">
          <p style="font-size: 16px; margin-bottom: 8px;">Keine Reservierungen gefunden</p>
          <p style="font-size: 14px;">Erstellen Sie eine neue Reservierung, um loszulegen.</p>
        </div>
      `;
      return;
    }

    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Gast</th>
          <th>Hotel</th>
          <th>Anreise</th>
          <th>Abreise</th>
          <th>Nächte</th>
          <th>Kategorie</th>
          <th>Preis</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${reservations.map(res => `
          <tr data-id="${res.id}" style="cursor: pointer;">
            <td>
              <strong>${res.firstname} ${res.lastname}</strong>
              ${res.email ? `<br><span style="font-size: 12px; color: var(--text-secondary);">${res.email}</span>` : ''}
            </td>
            <td>${res.hotel || '-'}</td>
            <td>${formatDate(res.checkin)}</td>
            <td>${formatDate(res.checkout)}</td>
            <td>${res.nights || 0}</td>
            <td>${res.category || '-'}</td>
            <td><strong>${formatCurrency(res.total || 0)}</strong></td>
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
      completed: 'Abgeschlossen',
      canceled: 'Storniert'
    };
    return labels[status] || status;
  }

  /**
   * Update KPIs
   */
  async updateKPIs() {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      const todayStats = await Reservations.getStats(today, today, this.filters.hotel);
      const weekStats = await Reservations.getStats(today, nextWeek, this.filters.hotel);

      // Update today's KPIs
      document.getElementById('kpi-bookings-today').textContent = todayStats?.totalReservations || 0;
      document.getElementById('kpi-revenue-today').textContent = formatCurrency(todayStats?.totalRevenue || 0);
      document.getElementById('kpi-occupancy').textContent = '-%'; // TODO: Calculate from availability
      document.getElementById('kpi-adr').textContent = formatCurrency(todayStats?.averagePrice || 0);
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
      hotelFilter.innerHTML = '<option value="">Alle Hotels</option>';
      Hotels.getActive().forEach(hotel => {
        const option = document.createElement('option');
        option.value = hotel.id;
        option.textContent = hotel.name;
        hotelFilter.appendChild(option);
      });
    }

    if (wizardHotel) {
      wizardHotel.innerHTML = '<option value="">Hotel wählen...</option>';
      Hotels.getActive().forEach(hotel => {
        const option = document.createElement('option');
        option.value = hotel.id;
        option.textContent = hotel.name;
        wizardHotel.appendChild(option);
      });
    }
  }

  /**
   * Open new reservation modal
   */
  openNewReservationModal() {
    ModalManager.open('modal-new-reservation');
    this.initializeWizard();
  }

  /**
   * Initialize reservation wizard
   */
  initializeWizard() {
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

      // TODO: Implement edit modal
      Toast.info('Bearbeitungsfunktion kommt bald');
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

    if (isConnected) {
      indicator.classList.add('status-success');
      indicator.title = 'Supabase verbunden';
    } else {
      indicator.classList.remove('status-success');
      indicator.classList.add('status-error');
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
 * Reservation Wizard
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
  }

  setupNavigation() {
    const prevBtn = document.getElementById('wizard-prev');
    const nextBtn = document.getElementById('wizard-next');
    const submitBtn = document.getElementById('wizard-submit');

    prevBtn.addEventListener('click', () => this.previousStep());
    nextBtn.addEventListener('click', () => this.nextStep());
    submitBtn.addEventListener('click', () => this.submit());
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
      const checkin = document.getElementById('wizard-checkin').value;
      const checkout = document.getElementById('wizard-checkout').value;

      if (!hotel || !checkin || !checkout) {
        Toast.warning('Bitte alle Felder ausfüllen');
        return false;
      }

      if (new Date(checkout) <= new Date(checkin)) {
        Toast.warning('Abreise muss nach Anreise liegen');
        return false;
      }
    }

    if (step === 2) {
      if (!this.data.category) {
        Toast.warning('Bitte eine Kategorie auswählen');
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
      this.data.hotel = document.getElementById('wizard-hotel').value;
      this.data.persons = document.getElementById('wizard-persons').value;
      this.data.checkin = document.getElementById('wizard-checkin').value;
      this.data.checkout = document.getElementById('wizard-checkout').value;
    }

    if (step === 3) {
      this.data.firstname = document.getElementById('wizard-firstname').value;
      this.data.lastname = document.getElementById('wizard-lastname').value;
      this.data.email = document.getElementById('wizard-email').value;
      this.data.phone = document.getElementById('wizard-phone').value;
      this.data.company = document.getElementById('wizard-company').value;
      this.data.notes = document.getElementById('wizard-notes').value;
    }
  }

  loadCategories() {
    const grid = document.getElementById('category-grid');
    if (!grid) return;

    const categories = Hotels.getCategories();
    
    grid.innerHTML = categories.map(cat => `
      <div class="category-card" data-category="${cat.id}">
        <div class="category-name">${cat.name}</div>
        <div class="category-price">${formatCurrency(cat.basePrice)}</div>
        <div class="category-description">${cat.description}</div>
      </div>
    `).join('');

    // Add click handlers
    grid.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        grid.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.data.category = card.dataset.category;
        this.data.price = Hotels.getCategoryById(card.dataset.category).basePrice;
      });
    });
  }

  setDefaultDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    document.getElementById('wizard-checkin').value = today.toISOString().split('T')[0];
    document.getElementById('wizard-checkout').value = tomorrow.toISOString().split('T')[0];
  }

  showSummary() {
    const summary = document.getElementById('wizard-summary');
    if (!summary) return;

    const hotel = Hotels.getById(this.data.hotel);
    const category = Hotels.getCategoryById(this.data.category);
    
    const checkin = new Date(this.data.checkin);
    const checkout = new Date(this.data.checkout);
    const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
    const total = this.data.price * nights;

    summary.innerHTML = `
      <div class="summary-row">
        <span class="summary-label">Hotel</span>
        <span class="summary-value">${hotel.name}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Kategorie</span>
        <span class="summary-value">${category.name}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Zeitraum</span>
        <span class="summary-value">${formatDate(this.data.checkin)} - ${formatDate(this.data.checkout)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Nächte</span>
        <span class="summary-value">${nights}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Gast</span>
        <span class="summary-value">${this.data.firstname} ${this.data.lastname}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Gesamtpreis</span>
        <span class="summary-value">${formatCurrency(total)}</span>
      </div>
    `;
  }

  async submit() {
    try {
      await Toast.promise(
        Reservations.create(this.data),
        {
          loading: 'Reservierung wird erstellt...',
          success: 'Reservierung erfolgreich erstellt!',
          error: 'Fehler beim Erstellen der Reservierung'
        }
      );

      ModalManager.close('modal-new-reservation');
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

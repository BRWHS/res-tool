/* ================================================
   HOTEL RESERVATION SYSTEM V2.0 - CORE APPLICATION
   ================================================ */

'use strict';

// =============== CONFIGURATION ===============
const CONFIG = {
  VERSION: '2.0.0',
  API: {
    SUPABASE_URL: 'https://ncrczhlwqwqirvdgbrfb.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jcmN6aGx3cXdxaXJ2ZGdicmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0MTMyNDAsImV4cCI6MjA1MTk4OTI0MH0.jYNGgg6jT0-tSsWnWnWsZOW5Y-n0hHD2eI82ktl2YzA',
    HNS: {
      PROD: 'https://api.hotelnetsolutions.de/v1',
      TEST: 'https://test-api.hotelnetsolutions.de/v1',
      TIMEOUT: 15000,
      MAX_RETRIES: 3
    }
  },
  STORAGE: {
    PREFIX: 'hrs_v2_',
    KEYS: {
      USER_SESSION: 'userSession',
      CHANNEL_SETTINGS: 'channelSettings',
      HOTELS: 'hotels',
      RATES: 'rates',
      CATEGORIES: 'categories',
      PREFERENCES: 'preferences',
      CACHE: 'cache'
    }
  },
  UI: {
    ANIMATION_DURATION: 250,
    DEBOUNCE_DELAY: 300,
    TOAST_DURATION: 3000,
    DATE_FORMAT: 'YYYY-MM-DD',
    CURRENCY_FORMAT: 'EUR'
  },
  CACHE: {
    TTL: 5 * 60 * 1000, // 5 minutes
    MAX_SIZE: 100
  }
};

// =============== STATE MANAGEMENT ===============
class StateManager {
  constructor() {
    this.state = {
      user: null,
      hotels: [],
      reservations: [],
      categories: [],
      rates: [],
      filters: {
        status: 'active',
        hotel: null,
        dateFrom: null,
        dateTo: null,
        search: ''
      },
      ui: {
        loading: false,
        modal: null,
        theme: 'dark'
      }
    };
    this.listeners = new Map();
  }

  get(path) {
    return path.split('.').reduce((acc, key) => acc?.[key], this.state);
  }

  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((acc, key) => {
      if (!acc[key]) acc[key] = {};
      return acc[key];
    }, this.state);
    
    const oldValue = target[lastKey];
    target[lastKey] = value;
    
    this.notify(path, value, oldValue);
  }

  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path).add(callback);
    
    return () => {
      const callbacks = this.listeners.get(path);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(path);
        }
      }
    };
  }

  notify(path, newValue, oldValue) {
    const callbacks = this.listeners.get(path);
    if (callbacks) {
      callbacks.forEach(callback => callback(newValue, oldValue));
    }
  }
}

const state = new StateManager();

// =============== API LAYER ===============
class API {
  constructor(config) {
    this.config = config;
    this.supabase = null;
    this.cache = new Map();
  }
}

  // Demo data generator
  getDemoData(table) {
    const demoData = {
      reservations: [
        {
          id: 1,
          reservation_number: 'RES-2024-001',
          hotel_code: 'MA7-M-DOR',
          guest_first_name: 'Max',
          guest_last_name: 'Mustermann',
          guest_email: 'max@example.com',
          arrival: '2024-02-15',
          departure: '2024-02-18',
          category: 'Standard',
          rate_price: 89.00,
          status: 'active',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          reservation_number: 'RES-2024-002',
          hotel_code: 'RES-HD-ALT',
          guest_first_name: 'Anna',
          guest_last_name: 'Schmidt',
          guest_email: 'anna@example.com',
          arrival: '2024-02-20',
          departure: '2024-02-22',
          category: 'Superior',
          rate_price: 125.00,
          status: 'active',
          created_at: new Date().toISOString()
        }
      ],
      hotels: typeof HOTELS !== 'undefined' ? HOTELS : [],
      categories: [
        { id: 1, name: 'Standard', code: 'STD' },
        { id: 2, name: 'Superior', code: 'SUP' },
        { id: 3, name: 'Deluxe', code: 'DLX' }
      ],
      rates: [
        { id: 1, name: 'Standardrate', code: 'STD', price: 89 },
        { id: 2, name: 'Wochenendrate', code: 'WKD', price: 99 },
        { id: 3, name: 'Geschäftsrate', code: 'BUS', price: 79 }
      ]
    };
    
    return demoData[table] || [];
  }

  // Generic fetch wrapper with retry logic
  async fetchWithRetry(url, options = {}, retries = 3) {
    const controller = new AbortController();
      {
        id: 2,
        reservation_number: 'RES-2024-002',
        hotel_code: 'RES-HD-ALT',
        guest_first_name: 'Anna',
        guest_last_name: 'Schmidt',
        guest_email: 'anna@example.com',
        arrival: '2024-02-20',
        departure: '2024-02-22',
        category: 'Superior',
        rate_price: 125.00,
        status: 'active',
        created_at: new Date().toISOString()
      }
    ],
    hotels: this.HOTELS,
    categories: [
      { id: 1, name: 'Standard', code: 'STD' },
      { id: 2, name: 'Superior', code: 'SUP' },
      { id: 3, name: 'Deluxe', code: 'DLX' }
    ],
    rates: [
      { id: 1, name: 'Standardrate', code: 'STD', price: 89 },
      { id: 2, name: 'Wochenendrate', code: 'WKD', price: 99 },
      { id: 3, name: 'Geschäftsrate', code: 'BUS', price: 79 }
    ]
  };
  
  return demoData[table] || [];
}

  // Generic fetch wrapper with retry logic
  async fetchWithRetry(url, options = {}, retries = 3) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.HNS.TIMEOUT);
    
    const fetchOptions = {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    let lastError;
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeout);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        lastError = error;
        
        if (i < retries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    
    throw lastError;
  }

  // Cache management
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.CACHE.TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCached(key, data) {
    // Implement LRU cache
    if (this.cache.size >= this.config.CACHE.MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

 async getReservations(filters = {}) {
  // Demo Mode - return demo data
  if (!this.supabase || this.supabase.demo) {
    const demoReservations = this.getDemoData('reservations');
    
    // Apply basic filters
    let filtered = [...demoReservations];
    
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(r => r.status === filters.status);
    }
    
    if (filters.hotel) {
      filtered = filtered.filter(r => r.hotel_code === filters.hotel);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(r => 
        r.guest_last_name.toLowerCase().includes(searchLower) ||
        r.guest_first_name.toLowerCase().includes(searchLower) ||
        r.reservation_number.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }
  
  // Original Supabase code (falls vorhanden)
  await this.initSupabase();
  // ... rest of original code
}

  async createReservation(reservation) {
    await this.initSupabase();
    
    const { data, error } = await this.supabase
      .from('reservations')
      .insert(reservation)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create reservation: ${error.message}`);
    }

    return data;
  }

  async updateReservation(id, updates) {
    await this.initSupabase();
    
    const { data, error } = await this.supabase
      .from('reservations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update reservation: ${error.message}`);
    }

    return data;
  }

  async deleteReservation(id) {
    await this.initSupabase();
    
    const { error } = await this.supabase
      .from('reservations')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete reservation: ${error.message}`);
    }

    return true;
  }

  // HNS Integration
  async pushToHNS(reservation) {
    const settings = Storage.get('CHANNEL_SETTINGS') || {};
    
    if (!settings.api_key || !settings.enabled) {
      console.log('HNS integration not configured or disabled');
      return null;
    }

    const baseUrl = settings.mode === 'live' 
      ? this.config.HNS.PROD 
      : this.config.HNS.TEST;

    const payload = this.mapReservationToHNS(reservation, settings);

    return await this.fetchWithRetry(
      `${baseUrl}/reservations`,
      {
        method: 'POST',
        headers: {
          'X-API-Key': settings.api_key,
          'X-API-Secret': settings.api_secret || ''
        },
        body: JSON.stringify(payload)
      }
    );
  }

  mapReservationToHNS(reservation, settings) {
    const hotelMapping = settings.hotel_map || {};
    const categoryMapping = settings.category_map || {};
    const rateMapping = settings.rate_map || {};

    return {
      hotelId: hotelMapping[reservation.hotel_code] || reservation.hotel_code,
      stay: {
        arrival: reservation.arrival,
        departure: reservation.departure,
        adults: reservation.guests_adults || 1,
        children: reservation.guests_children || 0
      },
      guest: {
        firstName: reservation.guest_first_name || '',
        lastName: reservation.guest_last_name || '',
        email: reservation.guest_email || '',
        phone: reservation.guest_phone || ''
      },
      room: {
        categoryId: categoryMapping[reservation.category] || reservation.category
      },
      rate: {
        code: rateMapping[reservation.rate_code] || reservation.rate_code,
        name: reservation.rate_name || '',
        price: Number(reservation.rate_price || 0),
        currency: 'EUR'
      },
      notes: reservation.notes || '',
      idempotencyKey: reservation.reservation_number
    };
  }
}

// =============== STORAGE LAYER ===============
class Storage {
  static get(key) {
    try {
      const fullKey = CONFIG.STORAGE.PREFIX + (CONFIG.STORAGE.KEYS[key] || key);
      const item = localStorage.getItem(fullKey);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }

  static set(key, value) {
    try {
      const fullKey = CONFIG.STORAGE.PREFIX + (CONFIG.STORAGE.KEYS[key] || key);
      localStorage.setItem(fullKey, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }

  static remove(key) {
    try {
      const fullKey = CONFIG.STORAGE.PREFIX + (CONFIG.STORAGE.KEYS[key] || key);
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }

  static clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CONFIG.STORAGE.PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }
}

// =============== UI COMPONENTS ===============
class UIManager {
  constructor() {
    this.toasts = new Set();
    this.modals = new Map();
  }

  // Toast Notifications
  showToast(message, type = 'info', duration = CONFIG.UI.TOAST_DURATION) {
    const id = Date.now().toString();
    const toast = this.createToastElement(id, message, type);
    
    document.body.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    
    // Auto remove
    setTimeout(() => {
      this.removeToast(id);
    }, duration);
    
    this.toasts.add(id);
    return id;
  }

  createToastElement(id, message, type) {
    const toast = document.createElement('div');
    toast.id = `toast-${id}`;
    toast.className = `notification ${type}`;
    toast.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="ui.removeToast('${id}')">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </div>
    `;
    return toast;
  }

  removeToast(id) {
    const toast = document.getElementById(`toast-${id}`);
    if (toast) {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
      this.toasts.delete(id);
    }
  }

  // Modal Management
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    state.set('ui.modal', modalId);
    
    // Focus trap
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length) {
      focusableElements[0].focus();
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    
    state.set('ui.modal', null);
  }

  closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    });
    document.body.style.overflow = '';
    state.set('ui.modal', null);
  }

  // Loading States
  setLoading(element, isLoading) {
    if (!element) return;
    
    if (isLoading) {
      element.disabled = true;
      element.classList.add('loading');
      element.dataset.originalText = element.textContent;
      element.innerHTML = '<span class="spinner"></span> Loading...';
    } else {
      element.disabled = false;
      element.classList.remove('loading');
      element.textContent = element.dataset.originalText || element.textContent;
    }
  }

  // Form Validation
  validateForm(formElement) {
    const inputs = formElement.querySelectorAll('[required]');
    const errors = [];
    
    inputs.forEach(input => {
      if (!input.value.trim()) {
        errors.push({
          field: input.name || input.id,
          message: `${input.dataset.label || 'This field'} is required`
        });
        input.classList.add('error');
      } else {
        input.classList.remove('error');
      }
    });
    
    // Email validation
    const emailInputs = formElement.querySelectorAll('[type="email"]');
    emailInputs.forEach(input => {
      if (input.value && !this.isValidEmail(input.value)) {
        errors.push({
          field: input.name || input.id,
          message: 'Please enter a valid email address'
        });
        input.classList.add('error');
      }
    });
    
    // Date validation
    const dateInputs = formElement.querySelectorAll('[type="date"]');
    dateInputs.forEach(input => {
      if (input.value && !this.isValidDate(input.value)) {
        errors.push({
          field: input.name || input.id,
          message: 'Please enter a valid date'
        });
        input.classList.add('error');
      }
    });
    
    return { valid: errors.length === 0, errors };
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  isValidDate(date) {
    return !isNaN(new Date(date).getTime());
  }

  // Debounce function for input events
  debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }
}

// =============== HOTEL DATA ===============
const HOTELS = [
  { code: 'MA7-M-DOR', group: 'MA7', name: 'Mannheim Dorfplatz', city: 'Mannheim' },
  { code: 'MA7-M-HAF', group: 'MA7', name: 'Mannheim Hafen', city: 'Mannheim' },
  { code: 'RES-HD-ALT', group: 'RESERVIO', name: 'Heidelberg Altstadt', city: 'Heidelberg' },
  { code: 'RES-HD-BHF', group: 'RESERVIO', name: 'Heidelberg Bahnhof', city: 'Heidelberg' },
  { code: 'GH-KA-SUD', group: 'GuestHouse', name: 'Karlsruhe Südstadt', city: 'Karlsruhe' },
  { code: 'GH-S-MIT', group: 'GuestHouse', name: 'Stuttgart Mitte', city: 'Stuttgart' },
  { code: 'BW-FR-CTR', group: 'BestWay', name: 'Frankfurt City Center', city: 'Frankfurt' },
  { code: 'BW-FR-FLU', group: 'BestWay', name: 'Frankfurt Flughafen', city: 'Frankfurt' },
  { code: 'UM-MUC-HBF', group: 'UrbanMotel', name: 'München Hauptbahnhof', city: 'München' },
  { code: 'UM-MUC-OST', group: 'UrbanMotel', name: 'München Ost', city: 'München' }
];

// =============== APPLICATION CONTROLLER ===============
class ReservationApp {
  constructor() {
    this.api = new API(CONFIG.API);
    this.ui = new UIManager();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      // Show loading state
      this.showLoadingOverlay();
      
      // Initialize components (Demo Mode)
try {
  await this.initializeSupabase();
} catch (error) {
  console.log('Continuing in demo mode without database connection');
}
      this.loadStoredData();
      this.initializeEventListeners();
      this.initializeRouting();
      
      // Check authentication
      const session = Storage.get('USER_SESSION');
      if (!session || !this.isSessionValid(session)) {
        this.redirectToAuth();
        return;
      }
      
      state.set('user', session.user);
      
      // Load initial data
      await Promise.all([
        this.loadHotels(),
        this.loadCategories(),
        this.loadRates(),
        this.loadReservations()
      ]);
      
      // Start periodic updates
      this.startPeriodicUpdates();
      
      // Update UI
      this.updateDashboard();
      this.hideLoadingOverlay();

       // Start clock immediately
      this.updateClock();
      
      this.initialized = true;
      this.ui.showToast('System initialized successfully', 'success');
      
    } catch (error) {
      console.error('Initialization failed:', error);
      this.hideLoadingOverlay();
      this.ui.showToast('Failed to initialize system: ' + error.message, 'error');
    }
  }

  async initializeSupabase() {
  try {
    return await this.api.initSupabase();
  } catch (error) {
    console.log('Continuing without Supabase - Demo Mode');
    return null;
  }
}

  loadStoredData() {
    // Load preferences
    const preferences = Storage.get('PREFERENCES') || {};
    if (preferences.theme) {
      document.body.classList.toggle('light-theme', preferences.theme === 'light');
    }
    
    // Load cached data
    const cachedHotels = Storage.get('HOTELS');
    if (cachedHotels) {
      state.set('hotels', cachedHotels);
    } else {
      state.set('hotels', HOTELS);
      Storage.set('HOTELS', HOTELS);
    }
  }

  initializeEventListeners() {
    // Global event delegation
    document.addEventListener('click', this.handleGlobalClick.bind(this));
    document.addEventListener('change', this.handleGlobalChange.bind(this));
    document.addEventListener('submit', this.handleGlobalSubmit.bind(this));
    
    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
    
    // Window events
    window.addEventListener('resize', this.ui.debounce(this.handleResize.bind(this), 250));
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
  }

  initializeRouting() {
    // Simple hash-based routing
    window.addEventListener('hashchange', this.handleRoute.bind(this));
    this.handleRoute();
  }

  handleRoute() {
    const hash = window.location.hash.slice(1);
    const [route, ...params] = hash.split('/');
    
    switch (route) {
      case 'reservations':
        this.showReservationsView();
        break;
      case 'reservation':
        if (params[0]) {
          this.showReservationDetail(params[0]);
        }
        break;
      case 'settings':
        this.showSettingsView();
        break;
      case 'reports':
        this.showReportsView();
        break;
      default:
        this.showDashboard();
    }
  }

  handleGlobalClick(event) {
    const target = event.target;
    
    // Button clicks
    if (target.matches('[data-action]')) {
      const action = target.dataset.action;
      this.handleAction(action, target);
    }
    
    // Modal close
    if (target.matches('.modal-close, [data-close-modal]')) {
      const modal = target.closest('.modal');
      if (modal) {
        this.ui.closeModal(modal.id);
      }
    }
    
    // Table row clicks
    if (target.closest('tbody tr')) {
      const row = target.closest('tbody tr');
      if (row.dataset.id) {
        this.handleTableRowClick(row.dataset.id);
      }
    }
  }

  handleGlobalChange(event) {
    const target = event.target;
    
    // Filter changes
    if (target.matches('[data-filter]')) {
      const filterType = target.dataset.filter;
      const value = target.value;
      this.handleFilterChange(filterType, value);
    }
    
    // Settings changes
    if (target.matches('[data-setting]')) {
      const setting = target.dataset.setting;
      const value = target.type === 'checkbox' ? target.checked : target.value;
      this.handleSettingChange(setting, value);
    }
  }

  handleGlobalSubmit(event) {
    const form = event.target;
    
    if (form.matches('[data-form]')) {
      event.preventDefault();
      const formType = form.dataset.form;
      this.handleFormSubmit(formType, form);
    }
  }

  handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + K: Quick search
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.openQuickSearch();
    }
    
    // Escape: Close modal
    if (event.key === 'Escape') {
      this.ui.closeAllModals();
    }
    
    // Ctrl/Cmd + N: New reservation
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault();
      this.openNewReservationModal();
    }
  }

  handleResize() {
    // Responsive adjustments
    const width = window.innerWidth;
    document.body.classList.toggle('mobile', width < 768);
    document.body.classList.toggle('tablet', width >= 768 && width < 1024);
    document.body.classList.toggle('desktop', width >= 1024);
  }

  handleBeforeUnload(event) {
    // Save state before leaving
    this.saveState();
    
    // Warn if there are unsaved changes
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
  }

  async handleAction(action, element) {
    try {
      switch (action) {
        case 'new-reservation':
          this.openNewReservationModal();
          break;
        case 'refresh':
          await this.loadReservations();
          break;
        case 'export-csv':
          await this.exportToCSV();
          break;
        case 'export-pdf':
          await this.exportToPDF();
          break;
        case 'open-availability':
          this.openAvailabilityModal();
          break;
        case 'open-reports':
          this.openReportsModal();
          break;
        case 'open-settings':
          this.openSettingsModal();
          break;
        case 'logout':
          this.logout();
          break;
        default:
          console.warn('Unknown action:', action);
      }
    } catch (error) {
      console.error('Action failed:', error);
      this.ui.showToast('Action failed: ' + error.message, 'error');
    }
  }

  async handleFilterChange(filterType, value) {
    state.set(`filters.${filterType}`, value);
    await this.loadReservations();
  }

  async handleSettingChange(setting, value) {
    const preferences = Storage.get('PREFERENCES') || {};
    preferences[setting] = value;
    Storage.set('PREFERENCES', preferences);
    
    // Apply setting immediately
    if (setting === 'theme') {
      document.body.classList.toggle('light-theme', value === 'light');
    }
    
    this.ui.showToast('Setting updated', 'success');
  }

  async handleFormSubmit(formType, form) {
    try {
      const validation = this.ui.validateForm(form);
      
      if (!validation.valid) {
        validation.errors.forEach(error => {
          this.ui.showToast(error.message, 'error');
        });
        return;
      }
      
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);
      
      switch (formType) {
        case 'new-reservation':
          await this.createReservation(data);
          break;
        case 'edit-reservation':
          await this.updateReservation(data);
          break;
        case 'channel-settings':
          await this.saveChannelSettings(data);
          break;
        default:
          console.warn('Unknown form type:', formType);
      }
    } catch (error) {
      console.error('Form submission failed:', error);
      this.ui.showToast('Failed to submit form: ' + error.message, 'error');
    }
  }

  // Data loading methods
  async loadHotels() {
    try {
      // In a real app, this would fetch from API
      const hotels = HOTELS;
      state.set('hotels', hotels);
      this.updateHotelSelects();
    } catch (error) {
      console.error('Failed to load hotels:', error);
      throw error;
    }
  }

  async loadCategories() {
    try {
      // Fetch from Supabase or use cached data
      const cached = this.api.getCached('categories');
      if (cached) {
        state.set('categories', cached);
        return;
      }
      
      // Simulated API call - replace with actual Supabase query
      const categories = Storage.get('CATEGORIES') || [];
      state.set('categories', categories);
      this.api.setCached('categories', categories);
    } catch (error) {
      console.error('Failed to load categories:', error);
      throw error;
    }
  }

  async loadRates() {
    try {
      const cached = this.api.getCached('rates');
      if (cached) {
        state.set('rates', cached);
        return;
      }
      
      const rates = Storage.get('RATES') || [];
      state.set('rates', rates);
      this.api.setCached('rates', rates);
    } catch (error) {
      console.error('Failed to load rates:', error);
      throw error;
    }
  }

 async loadReservations() {
  try {
    const loadingElement = document.querySelector('[data-action="refresh"]');
    if (loadingElement) {
      this.ui.setLoading(loadingElement, true);
    }
    
    const filters = state.get('filters') || {};
    const reservations = await this.api.getReservations(filters);
      
      state.set('reservations', reservations);
      this.renderReservationTable();
      this.updateKPIs();
      
      this.ui.setLoading(loadingElement, false);
      this.ui.showToast('Reservations loaded', 'success');
    } catch (error) {
      console.error('Failed to load reservations:', error);
      this.ui.showToast('Failed to load reservations: ' + error.message, 'error');
    }
  }

  // Reservation CRUD operations
  async createReservation(data) {
    try {
      // Generate reservation number
      data.reservation_number = this.generateReservationNumber();
      data.status = 'active';
      data.created_at = new Date().toISOString();
      
      // Create in Supabase
      const reservation = await this.api.createReservation(data);
      
      // Push to HNS if configured
      try {
        await this.api.pushToHNS(reservation);
      } catch (hnsError) {
        console.error('HNS push failed:', hnsError);
        // Don't fail the whole operation if HNS fails
      }
      
      // Update local state
      const reservations = state.get('reservations') || [];
      reservations.unshift(reservation);
      state.set('reservations', reservations);
      
      // Close modal and refresh
      this.ui.closeModal('modalNewReservation');
      this.renderReservationTable();
      this.updateKPIs();
      
      this.ui.showToast('Reservation created successfully', 'success');
      
      // Send confirmation email if configured
      if (data.send_confirmation && data.guest_email) {
        this.sendConfirmationEmail(reservation);
      }
      
      return reservation;
    } catch (error) {
      console.error('Failed to create reservation:', error);
      this.ui.showToast('Failed to create reservation: ' + error.message, 'error');
      throw error;
    }
  }

  async updateReservation(data) {
    try {
      const { id, ...updates } = data;
      updates.updated_at = new Date().toISOString();
      
      const reservation = await this.api.updateReservation(id, updates);
      
      // Update local state
      const reservations = state.get('reservations') || [];
      const index = reservations.findIndex(r => r.id === id);
      if (index !== -1) {
        reservations[index] = reservation;
        state.set('reservations', reservations);
      }
      
      this.ui.closeModal('modalEditReservation');
      this.renderReservationTable();
      this.updateKPIs();
      
      this.ui.showToast('Reservation updated successfully', 'success');
      return reservation;
    } catch (error) {
      console.error('Failed to update reservation:', error);
      this.ui.showToast('Failed to update reservation: ' + error.message, 'error');
      throw error;
    }
  }

  async cancelReservation(id) {
    try {
      if (!confirm('Are you sure you want to cancel this reservation?')) {
        return;
      }
      
      await this.api.updateReservation(id, { 
        status: 'canceled',
        canceled_at: new Date().toISOString()
      });
      
      // Update local state
      const reservations = state.get('reservations') || [];
      const index = reservations.findIndex(r => r.id === id);
      if (index !== -1) {
        reservations[index].status = 'canceled';
        state.set('reservations', reservations);
      }
      
      this.renderReservationTable();
      this.updateKPIs();
      
      this.ui.showToast('Reservation canceled', 'warning');
    } catch (error) {
      console.error('Failed to cancel reservation:', error);
      this.ui.showToast('Failed to cancel reservation: ' + error.message, 'error');
    }
  }

  // UI Rendering Methods
  renderReservationTable() {
    const tbody = document.querySelector('#reservationTable tbody');
    if (!tbody) return;
    
    const reservations = state.get('reservations') || [];
    
    if (reservations.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted">
            No reservations found
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = reservations.map(res => `
      <tr data-id="${res.id}">
        <td>${res.reservation_number}</td>
        <td>${this.getHotelName(res.hotel_code)}</td>
        <td>${this.formatGuestName(res)}</td>
        <td>${this.formatDate(res.arrival)}</td>
        <td>${this.formatDate(res.departure)}</td>
        <td>${res.category || '-'}</td>
        <td>${this.formatCurrency(res.rate_price)}</td>
        <td>
          <span class="pill ${res.status}">
            ${res.status}
          </span>
        </td>
      </tr>
    `).join('');
  }

  updateKPIs() {
    const reservations = state.get('reservations') || [];
    const today = new Date().toISOString().split('T')[0];
    
    // Today's KPIs
    const todayReservations = reservations.filter(r => 
      r.arrival === today && r.status === 'active'
    );
    
    const todayRevenue = todayReservations.reduce((sum, r) => 
      sum + (parseFloat(r.rate_price) || 0), 0
    );
    
    const todayADR = todayReservations.length > 0 
      ? todayRevenue / todayReservations.length 
      : 0;
    
    // Update DOM
    this.updateElement('#tBookings', todayReservations.length);
    this.updateElement('#tRevenue', this.formatCurrency(todayRevenue));
    this.updateElement('#tADR', this.formatCurrency(todayADR));
    
    // Calculate occupancy (simplified - would need room inventory)
    const totalRooms = 50; // Example
    const occupancyPct = (todayReservations.length / totalRooms * 100).toFixed(1);
    this.updateElement('#tOcc', `${occupancyPct}%`);
  }

  updateDashboard() {
    this.updateKPIs();
    this.updateCharts();
    this.updateActivityFeed();
  }

  updateCharts() {
    // Implement chart updates using Chart.js or similar
    // This is a placeholder for chart rendering logic
  }

  updateActivityFeed() {
    // Update recent activity feed
    const reservations = state.get('reservations') || [];
    const recentActivity = reservations
      .slice(0, 5)
      .map(r => ({
        type: 'reservation',
        message: `New reservation: ${r.reservation_number}`,
        time: r.created_at
      }));
    
    // Render activity feed
    const feedElement = document.querySelector('#activityFeed');
    if (feedElement) {
      feedElement.innerHTML = recentActivity.map(activity => `
        <div class="activity-item">
          <span class="activity-message">${activity.message}</span>
          <span class="activity-time text-muted">${this.formatRelativeTime(activity.time)}</span>
        </div>
      `).join('');
    }
  }

  // Utility Methods
  generateReservationNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `RES-${timestamp}-${random}`;
  }

  getHotelName(code) {
    const hotel = state.get('hotels')?.find(h => h.code === code);
    return hotel ? `${hotel.group} - ${hotel.city}` : code;
  }

  formatGuestName(reservation) {
    const first = reservation.guest_first_name || '';
    const last = reservation.guest_last_name || '';
    return `${last}, ${first}`.trim() || 'Guest';
  }

  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  formatCurrency(amount) {
    if (typeof amount !== 'number') {
      amount = parseFloat(amount) || 0;
    }
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }

  updateElement(selector, content) {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = content;
    }
  }

  updateHotelSelects() {
    const hotels = state.get('hotels') || [];
    const selects = document.querySelectorAll('.hotel-select');
    
    selects.forEach(select => {
      select.innerHTML = `
        <option value="">All Hotels</option>
        ${hotels.map(hotel => `
          <option value="${hotel.code}">
            ${hotel.group} - ${hotel.city}
          </option>
        `).join('')}
      `;
    });
  }

  // Session Management
 isSessionValid(session) {
  if (!session || !session.expiresAt) return false;  // expiresAt statt expires_at
  return new Date(session.expiresAt) > new Date();
}

  redirectToAuth() {
    window.location.href = '/auth.html';
  }

  async logout() {
    Storage.clear();
    this.redirectToAuth();
  }

  saveState() {
    // Save current state to localStorage
    Storage.set('APP_STATE', {
      filters: state.get('filters'),
      preferences: Storage.get('PREFERENCES')
    });
  }

  hasUnsavedChanges() {
    // Check for unsaved changes in forms
    const forms = document.querySelectorAll('form[data-form]');
    for (const form of forms) {
      if (form.dataset.changed === 'true') {
        return true;
      }
    }
    return false;
  }

  // Periodic Updates
  startPeriodicUpdates() {
    // Update clock
    setInterval(() => this.updateClock(), 1000);
    
    // Refresh data every 5 minutes
    setInterval(() => this.loadReservations(), 5 * 60 * 1000);
    
    // Check session every minute
    setInterval(() => this.checkSession(), 60 * 1000);
  }

  updateClock() {
    const now = new Date();
    const date = now.toLocaleDateString('de-DE');
    const time = now.toLocaleTimeString('de-DE');
    
    this.updateElement('#dateLocal', date);
    this.updateElement('#clockLocal', time);
  }

  async checkSession() {
    const session = Storage.get('USER_SESSION');
    if (!this.isSessionValid(session)) {
      this.ui.showToast('Session expired. Please login again.', 'warning');
      setTimeout(() => this.redirectToAuth(), 3000);
    }
  }

  // Loading Overlay
  showLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay') || this.createLoadingOverlay();
    overlay.classList.remove('hidden');
  }

  hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  createLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="spinner large"></div>
        <h2>Loading Hotel Reservation System...</h2>
        <p class="text-muted">Please wait while we initialize the application</p>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  // Export functions
  async exportToCSV() {
    try {
      const reservations = state.get('reservations') || [];
      
      const headers = ['Reservation Number', 'Hotel', 'Guest', 'Arrival', 'Departure', 'Category', 'Price', 'Status'];
      const rows = reservations.map(res => [
        res.reservation_number,
        this.getHotelName(res.hotel_code),
        this.formatGuestName(res),
        res.arrival,
        res.departure,
        res.category || '',
        res.rate_price || '0',
        res.status
      ]);
      
      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reservations_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      this.ui.showToast('CSV exported successfully', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      this.ui.showToast('Failed to export CSV', 'error');
    }
  }

  async exportToPDF() {
    // This would require a PDF library like jsPDF
    this.ui.showToast('PDF export coming soon', 'info');
  }

  // Modal Methods
  openNewReservationModal() {
    this.resetForm('formNewReservation');
    this.ui.openModal('modalNewReservation');
  }

  openAvailabilityModal() {
    this.ui.openModal('modalAvailability');
    this.loadAvailability();
  }

  openReportsModal() {
    this.ui.openModal('modalReports');
    this.loadReports();
  }

  openSettingsModal() {
    this.ui.openModal('modalSettings');
    this.loadSettings();
  }

  openQuickSearch() {
    // Implement quick search functionality
    this.ui.showToast('Quick search coming soon', 'info');
  }

  resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
      form.reset();
      form.dataset.changed = 'false';
      form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    }
  }

  async loadAvailability() {
    // Implement availability loading
  }

  async loadReports() {
    // Implement reports loading
  }

  async loadSettings() {
    // Implement settings loading
  }

  async saveChannelSettings(data) {
    Storage.set('CHANNEL_SETTINGS', data);
    this.ui.showToast('Channel settings saved', 'success');
  }

  handleTableRowClick(id) {
    window.location.hash = `#reservation/${id}`;
  }

  showReservationDetail(id) {
    const reservation = state.get('reservations')?.find(r => r.id === id);
    if (!reservation) {
      this.ui.showToast('Reservation not found', 'error');
      return;
    }
    
    // Populate edit modal with reservation data
    this.populateEditForm(reservation);
    this.ui.openModal('modalEditReservation');
  }

  populateEditForm(reservation) {
    const form = document.getElementById('formEditReservation');
    if (!form) return;
    
    // Populate form fields
    Object.entries(reservation).forEach(([key, value]) => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        input.value = value || '';
      }
    });
    
    form.dataset.reservationId = reservation.id;
  }

  showDashboard() {
    // Show dashboard view
    this.updateDashboard();
  }

  showReservationsView() {
    // Show reservations list view
    this.loadReservations();
  }

  showSettingsView() {
    this.openSettingsModal();
  }

  showReportsView() {
    this.openReportsModal();
  }

  async sendConfirmationEmail(reservation) {
    // Implement email sending
    console.log('Sending confirmation email for:', reservation);
  }
}

// =============== INITIALIZATION ===============
// Create global instances
const app = new ReservationApp();
const ui = app.ui;
const api = app.api;

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Export for debugging
window.HRS = {
  app,
  ui,
  api,
  state,
  CONFIG,
  VERSION: CONFIG.VERSION
};

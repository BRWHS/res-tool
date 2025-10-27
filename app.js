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
      pagination: {
        currentPage: 1,
        pageSize: 25,
        totalPages: 1,
        totalItems: 0
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
    if (newValue === oldValue) return;
    
    const callbacks = this.listeners.get(path);
    if (callbacks) {
      callbacks.forEach(callback => callback(newValue, oldValue));
    }
    
    // Notify parent paths
    const pathParts = path.split('.');
    while (pathParts.length > 1) {
      pathParts.pop();
      const parentPath = pathParts.join('.');
      const parentCallbacks = this.listeners.get(parentPath);
      if (parentCallbacks) {
        parentCallbacks.forEach(callback => callback(this.get(parentPath)));
      }
    }
  }
}

const state = new StateManager();

// =============== STORAGE MANAGER ===============
class StorageManager {
  constructor(prefix = CONFIG.STORAGE.PREFIX) {
    this.prefix = prefix;
  }

  set(key, value) {
    try {
      const storageKey = this.prefix + key;
      const serialized = JSON.stringify({
        data: value,
        timestamp: Date.now()
      });
      localStorage.setItem(storageKey, serialized);
    } catch (error) {
      console.error('Storage set failed:', error);
    }
  }

  get(key) {
    try {
      const storageKey = this.prefix + key;
      const item = localStorage.getItem(storageKey);
      if (!item) return null;
      
      const { data, timestamp } = JSON.parse(item);
      
      // Check if cache is expired (optional)
      if (CONFIG.CACHE.TTL && Date.now() - timestamp > CONFIG.CACHE.TTL) {
        this.remove(key);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Storage get failed:', error);
      return null;
    }
  }

  remove(key) {
    try {
      const storageKey = this.prefix + key;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Storage remove failed:', error);
    }
  }

  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Storage clear failed:', error);
    }
  }
}

const Storage = new StorageManager();

// =============== API MANAGER ===============
class API {
  constructor(config) {
    this.config = config;
    this.supabase = null;
    this.cache = new Map();
  }

  async initSupabase() {
    try {
      const { createClient } = supabase;
      this.supabase = createClient(
        this.config.API.SUPABASE_URL,
        this.config.API.SUPABASE_KEY
      );
      
      // Test connection
      const { data, error } = await this.supabase
        .from('reservations')
        .select('count');
      
      if (error) throw error;
      
      console.log('Supabase connected successfully');
      this.updateConnectionStatus('SB', true);
      
      return this.supabase;
    } catch (error) {
      console.error('Supabase connection failed:', error);
      this.updateConnectionStatus('SB', false);
      throw error;
    }
  }

  updateConnectionStatus(type, connected) {
    const indicator = document.querySelector(`[data-tooltip="${type === 'SB' ? 'Supabase Connected' : 'HotelNetSolutions'}"]`);
    if (indicator) {
      indicator.classList.toggle('active', connected);
      indicator.classList.toggle('error', !connected);
    }
  }

  // Cache methods
  getCached(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.config.CACHE.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  setCached(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Reservations API
  async getReservations(filters = {}) {
    try {
      if (!this.supabase) {
        // Demo mode - return sample data
        return this.getDemoReservations();
      }

      let query = this.supabase
        .from('reservations')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.hotel) {
        query = query.eq('hotel_code', filters.hotel);
      }

      if (filters.dateFrom) {
        query = query.gte('arrival', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('departure', filters.dateTo);
      }

      if (filters.search) {
        query = query.or(`guest_last_name.ilike.%${filters.search}%,guest_first_name.ilike.%${filters.search}%,reservation_number.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Failed to get reservations:', error);
      return this.getDemoReservations();
    }
  }

  getDemoReservations() {
    // Return demo data if Supabase is not available
    return [
      {
        id: 1,
        reservation_number: 'RES-2024-001',
        hotel_code: 'MA7-M-DOR',
        guest_first_name: 'Max',
        guest_last_name: 'Mustermann',
        arrival: '2024-11-15',
        departure: '2024-11-17',
        category: 'SUP',
        rate_code: 'STD',
        rate_price: 119,
        status: 'active',
        created_at: '2024-11-10T10:00:00Z'
      },
      {
        id: 2,
        reservation_number: 'RES-2024-002',
        hotel_code: 'RES-HD-ALT',
        guest_first_name: 'Anna',
        guest_last_name: 'Schmidt',
        arrival: '2024-11-20',
        departure: '2024-11-22',
        category: 'DLX',
        rate_code: 'FLEX',
        rate_price: 159,
        status: 'active',
        created_at: '2024-11-11T14:30:00Z'
      }
    ];
  }

  async createReservation(data) {
    try {
      if (!this.supabase) {
        // Demo mode - simulate creation
        return {
          ...data,
          id: Date.now(),
          created_at: new Date().toISOString()
        };
      }

      const { data: reservation, error } = await this.supabase
        .from('reservations')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      return reservation;
    } catch (error) {
      console.error('Failed to create reservation:', error);
      throw error;
    }
  }

  async updateReservation(id, updates) {
    try {
      if (!this.supabase) {
        // Demo mode
        return { id, ...updates };
      }

      const { data, error } = await this.supabase
        .from('reservations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Failed to update reservation:', error);
      throw error;
    }
  }

  async pushToHNS(reservation) {
    // Placeholder for HNS integration
    console.log('HNS push not yet implemented:', reservation);
    return null;
  }
}

// =============== UI MANAGER ===============
class UIManager {
  constructor() {
    this.toastContainer = this.createToastContainer();
  }

  createToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  showToast(message, type = 'info', duration = CONFIG.UI.TOAST_DURATION) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    }[type] || 'fa-info-circle';
    
    toast.innerHTML = `
      <i class="fas ${icon}"></i>
      <span>${message}</span>
    `;
    
    this.toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after duration
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Focus trap
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  closeAllModals() {
    document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
      this.closeModal(modal.id);
    });
  }

  setLoading(element, loading) {
    if (!element) return;
    
    if (loading) {
      element.disabled = true;
      element.classList.add('loading');
      const icon = element.querySelector('i');
      if (icon) {
        icon.className = 'fas fa-spinner fa-spin';
      }
    } else {
      element.disabled = false;
      element.classList.remove('loading');
      const icon = element.querySelector('i');
      if (icon) {
        // Restore original icon - you might need to store this
        icon.className = 'fas fa-sync';
      }
    }
  }

  validateForm(form) {
    const errors = [];
    const requiredInputs = form.querySelectorAll('[required]');
    
    requiredInputs.forEach(input => {
      if (!input.value.trim()) {
        errors.push({
          field: input.name,
          message: `${input.name} ist erforderlich`
        });
        input.classList.add('error');
      } else {
        input.classList.remove('error');
      }
    });
    
    // Validate specific field types
    form.querySelectorAll('[type="email"]').forEach(input => {
      if (input.value && !this.isValidEmail(input.value)) {
        errors.push({
          field: input.name,
          message: 'Ungültige E-Mail-Adresse'
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

// =============== DEMO DATA ===============
const DEMO_CATEGORIES = [
  { 
    id: 1, 
    code: 'STD', 
    name: 'Standard', 
    size: '18m²', 
    beds: '1 Doppelbett', 
    persons: 2, 
    price: 89,
    amenities: ['WLAN', 'TV', 'Bad mit Dusche']
  },
  { 
    id: 2, 
    code: 'SUP', 
    name: 'Superior', 
    size: '24m²', 
    beds: '1 King-Size Bett', 
    persons: 2, 
    price: 119,
    amenities: ['WLAN', 'Smart-TV', 'Bad mit Wanne', 'Minibar']
  },
  { 
    id: 3, 
    code: 'DLX', 
    name: 'Deluxe', 
    size: '32m²', 
    beds: '1 King-Size Bett + Schlafsofa', 
    persons: 3, 
    price: 159,
    amenities: ['WLAN', 'Smart-TV', 'Bad mit Wanne & Dusche', 'Minibar', 'Balkon']
  },
  {
    id: 4,
    code: 'JUN',
    name: 'Junior Suite',
    size: '42m²',
    beds: '1 King-Size Bett',
    persons: 2,
    price: 199,
    amenities: ['WLAN', 'Smart-TV', 'Luxus-Bad', 'Minibar', 'Sitzecke', 'Balkon']
  }
];

const DEMO_RATES = [
  { 
    id: 1, 
    code: 'STD', 
    name: 'Standardrate', 
    price: 89, 
    cancellation: 'Bis 24h vorher kostenlos stornierbar',
    includes: ['Frühstück']
  },
  { 
    id: 2, 
    code: 'FLEX', 
    name: 'Flex Rate', 
    price: 109, 
    cancellation: 'Bis 6h vorher kostenlos stornierbar',
    includes: ['Frühstück', 'Late Check-out']
  },
  { 
    id: 3, 
    code: 'NREF', 
    name: 'Non-Refundable', 
    price: 69, 
    cancellation: 'Nicht stornierbar - 20% günstiger',
    includes: ['Frühstück']
  },
  {
    id: 4,
    code: 'BUSI',
    name: 'Business Rate',
    price: 99,
    cancellation: 'Bis 18h vorher kostenlos stornierbar',
    includes: ['Frühstück', 'WLAN Premium', 'Parkplatz']
  }
];

// =============== APPLICATION CONTROLLER ===============
class ReservationApp {
  constructor() {
    this.api = new API(CONFIG);
    this.ui = new UIManager();
    this.initialized = false;
    this.wizard = null;
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
      let session = Storage.get('USER_SESSION');
      
      // Create demo session if none exists (for development/demo mode)
      if (!session || !this.isSessionValid(session)) {
        console.log('No valid session found - creating demo session');
        session = this.createDemoSession();
        Storage.set('USER_SESSION', session);
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
      
      // Update user display
      this.updateUserDisplay();
      
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
    
    // Page size change
    if (target.id === 'pageSize') {
      this.changePageSize(target.value);
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
        case 'group-reservation':
          this.openGroupReservationModal();
          break;
        case 'refresh':
          await this.loadReservations();
          break;
        case 'refresh-activity':
          this.updateActivityFeed();
          this.ui.showToast('Activity aktualisiert', 'success');
          break;
        case 'refresh-yoy':
          this.updateYoYPerformance();
          this.ui.showToast('YoY Performance aktualisiert', 'success');
          break;
        case 'refresh-operations':
          this.updateTodaysOperations();
          this.ui.showToast('Operationen aktualisiert', 'success');
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
        case 'open-sketch':
          this.openSketchModal();
          break;
        case 'first-page':
          this.changePage('first');
          break;
        case 'prev-page':
          this.changePage('prev');
          break;
        case 'next-page':
          this.changePage('next');
          break;
        case 'last-page':
          this.changePage('last');
          break;
        case 'view-checkins':
          this.viewTodaysCheckins();
          break;
        case 'view-checkouts':
          this.viewTodaysCheckouts();
          break;
        case 'view-inhouse':
          this.viewInhouseGuests();
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
  
  openGroupReservationModal() {
    this.ui.showToast('GruppenResa Feature coming soon...', 'info');
    // TODO: Implement Group Reservation Modal
  }

  // =============== WIZARD MANAGEMENT ===============
  initWizard() {
    this.wizard = {
      currentStep: 1,
      maxSteps: 4,
      data: {}
    };

    // Wizard navigation
    const nextBtn = document.querySelector('[data-wizard-action="next"]');
    const prevBtn = document.querySelector('[data-wizard-action="prev"]');
    const submitBtn = document.querySelector('[data-wizard-action="submit"]');

    // Remove old listeners and add new ones
    if (nextBtn) {
      const newNextBtn = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
      newNextBtn.addEventListener('click', () => this.wizardNext());
    }
    if (prevBtn) {
      const newPrevBtn = prevBtn.cloneNode(true);
      prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
      newPrevBtn.addEventListener('click', () => this.wizardPrev());
    }

    // Initialize first step
    this.updateWizardUI();
  }

  wizardNext() {
    // Validate current step
    const currentStepValid = this.validateWizardStep(this.wizard.currentStep);
    
    if (!currentStepValid) {
      this.ui.showToast('Bitte alle Pflichtfelder ausfüllen', 'error');
      return;
    }

    // Save current step data
    this.saveWizardStep();

    // Load next step
    if (this.wizard.currentStep < this.wizard.maxSteps) {
      this.wizard.currentStep++;
      this.updateWizardUI();
      this.loadWizardStepData();
    }
  }

  wizardPrev() {
    if (this.wizard.currentStep > 1) {
      this.wizard.currentStep--;
      this.updateWizardUI();
    }
  }

  validateWizardStep(step) {
    const content = document.querySelector(`[data-step-content="${step}"]`);
    if (!content) return true;

    const requiredInputs = content.querySelectorAll('[required]');
    let isValid = true;

    requiredInputs.forEach(input => {
      if (!input.value.trim()) {
        input.classList.add('error');
        isValid = false;
      } else {
        input.classList.remove('error');
      }
    });

    // Step-specific validation
    switch(step) {
      case 1:
        // Validate dates
        const arrival = content.querySelector('[name="arrival"]').value;
        const departure = content.querySelector('[name="departure"]').value;
        
        if (arrival && departure && new Date(arrival) >= new Date(departure)) {
          this.ui.showToast('Abreise muss nach Anreise liegen', 'error');
          return false;
        }
        break;
      case 2:
        // Validate category selection
        const form = document.getElementById('formNewReservation');
        const categoryInput = form.querySelector('[name="category"]');
        if (!categoryInput || !categoryInput.value) {
          this.ui.showToast('Bitte eine Kategorie auswählen', 'error');
          return false;
        }
        break;
      case 3:
        // Validate rate selection
        const rateInput = document.getElementById('formNewReservation').querySelector('[name="rate_code"]');
        if (!rateInput || !rateInput.value) {
          this.ui.showToast('Bitte eine Rate auswählen', 'error');
          return false;
        }
        break;
    }

    return isValid;
  }

  saveWizardStep() {
    const stepContent = document.querySelector(`[data-step-content="${this.wizard.currentStep}"]`);
    if (!stepContent) return;

    const inputs = stepContent.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (input.name) {
        this.wizard.data[input.name] = input.value;
      }
    });
    
    // Also save hidden inputs from the form
    const form = document.getElementById('formNewReservation');
    const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
    hiddenInputs.forEach(input => {
      if (input.name) {
        this.wizard.data[input.name] = input.value;
      }
    });
  }

  updateWizardUI() {
    // Update step indicators
    document.querySelectorAll('.wizard-step').forEach((step, index) => {
      const stepNum = index + 1;
      step.classList.remove('active', 'completed');
      
      if (stepNum === this.wizard.currentStep) {
        step.classList.add('active');
      } else if (stepNum < this.wizard.currentStep) {
        step.classList.add('completed');
      }
    });

    // Show/hide step contents
    document.querySelectorAll('[data-step-content]').forEach(content => {
      const stepNum = parseInt(content.dataset.stepContent);
      content.classList.toggle('hidden', stepNum !== this.wizard.currentStep);
    });

    // Update buttons
    const prevBtn = document.querySelector('[data-wizard-action="prev"]');
    const nextBtn = document.querySelector('[data-wizard-action="next"]');
    const submitBtn = document.querySelector('[data-wizard-action="submit"]');

    if (prevBtn) {
      prevBtn.disabled = this.wizard.currentStep === 1;
    }

    if (nextBtn && submitBtn) {
      if (this.wizard.currentStep === this.wizard.maxSteps) {
        nextBtn.classList.add('hidden');
        submitBtn.classList.remove('hidden');
      } else {
        nextBtn.classList.remove('hidden');
        submitBtn.classList.add('hidden');
      }
    }
  }

  loadWizardStepData() {
    const { currentStep } = this.wizard;

    switch(currentStep) {
      case 2:
        this.renderCategoryGrid();
        break;
      case 3:
        this.renderRateGrid();
        break;
      case 4:
        this.renderReservationSummary(this.wizard.data);
        break;
    }
  }

  // =============== CATEGORIES & RATES ===============
  async loadCategories() {
    try {
      // Try to load from storage first
      let categories = Storage.get('CATEGORIES');
      
      // If nothing in storage, use demo data
      if (!categories || categories.length === 0) {
        categories = DEMO_CATEGORIES;
        Storage.set('CATEGORIES', categories);
      }
      
      state.set('categories', categories);
      console.log('Categories loaded:', categories.length);
    } catch (error) {
      console.error('Failed to load categories:', error);
      // Fallback to demo data
      state.set('categories', DEMO_CATEGORIES);
      this.ui.showToast('Kategorien konnten nicht geladen werden, verwende Demo-Daten', 'warning');
    }
  }

  async loadRates() {
    try {
      // Try to load from storage first
      let rates = Storage.get('RATES');
      
      // If nothing in storage, use demo data
      if (!rates || rates.length === 0) {
        rates = DEMO_RATES;
        Storage.set('RATES', rates);
      }
      
      state.set('rates', rates);
      console.log('Rates loaded:', rates.length);
    } catch (error) {
      console.error('Failed to load rates:', error);
      // Fallback to demo data
      state.set('rates', DEMO_RATES);
      this.ui.showToast('Raten konnten nicht geladen werden, verwende Demo-Daten', 'warning');
    }
  }

  renderCategoryGrid() {
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;

    const categories = state.get('categories') || [];

    if (categories.length === 0) {
      grid.innerHTML = `
        <div class="text-center text-muted" style="grid-column: 1/-1; padding: 2rem;">
          <i class="fas fa-bed" style="font-size: 3rem; opacity: 0.3;"></i>
          <p style="margin-top: 1rem;">Keine Kategorien verfügbar</p>
          <p style="margin-top: 0.5rem; font-size: 0.875rem;">Bitte fügen Sie Kategorien in den Einstellungen hinzu.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = categories.map(cat => `
      <div class="category-card glass-morphism" data-category="${cat.code}">
        <div class="category-header">
          <h4>${cat.name}</h4>
          <div class="category-price">
            â‚¬${cat.price}
            <small>/Nacht</small>
          </div>
        </div>
        <div class="category-details">
          <div class="detail-item">
            <i class="fas fa-ruler-combined"></i>
            <span>${cat.size}</span>
          </div>
          <div class="detail-item">
            <i class="fas fa-bed"></i>
            <span>${cat.beds}</span>
          </div>
          <div class="detail-item">
            <i class="fas fa-users"></i>
            <span>Max. ${cat.persons} Personen</span>
          </div>
        </div>
        ${cat.amenities ? `
          <div class="category-amenities" style="margin-bottom: 1rem;">
            ${cat.amenities.map(a => `<span class="badge" style="margin-right: 0.25rem;">${a}</span>`).join('')}
          </div>
        ` : ''}
        <button type="button" class="btn primary btn-select-category" data-category-code="${cat.code}">
          <i class="fas fa-check"></i>
          Auswählen
        </button>
      </div>
    `).join('');

    // Add click handlers
    grid.querySelectorAll('.btn-select-category').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const code = e.currentTarget.dataset.categoryCode;
        this.selectCategory(code);
        
        // Auto-advance to next step
        setTimeout(() => {
          this.wizardNext();
        }, 300);
      });
    });
  }

  selectCategory(code) {
    // Visual feedback
    document.querySelectorAll('.category-card').forEach(card => {
      card.classList.remove('selected');
    });
    const selectedCard = document.querySelector(`[data-category="${code}"]`);
    if (selectedCard) {
      selectedCard.classList.add('selected');
    }

    // Store selection
    const form = document.getElementById('formNewReservation');
    let input = form.querySelector('[name="category"]');
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'category';
      form.appendChild(input);
    }
    input.value = code;
    
    // Update wizard data
    this.wizard.data.category = code;
    
    this.ui.showToast(`Kategorie "${code}" ausgewählt`, 'success');
  }

  renderRateGrid() {
    const grid = document.getElementById('rateGrid');
    if (!grid) return;

    const rates = state.get('rates') || [];
    
    if (rates.length === 0) {
      grid.innerHTML = `
        <div class="text-center text-muted" style="grid-column: 1/-1; padding: 2rem;">
          <i class="fas fa-tag" style="font-size: 3rem; opacity: 0.3;"></i>
          <p style="margin-top: 1rem;">Keine Raten verfügbar</p>
          <p style="margin-top: 0.5rem; font-size: 0.875rem;">Bitte fügen Sie Raten in den Einstellungen hinzu.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = rates.map(rate => `
      <div class="rate-card glass-morphism" data-rate="${rate.code}">
        <div class="rate-header">
          <h4>${rate.name}</h4>
          <div class="rate-price">
            â‚¬${rate.price}
            <small>/Nacht</small>
          </div>
        </div>
        <div class="rate-policy">
          <i class="fas fa-info-circle"></i>
          <span>${rate.cancellation}</span>
        </div>
        ${rate.includes && rate.includes.length > 0 ? `
          <div class="rate-includes" style="margin-bottom: 1rem;">
            <strong style="display: block; margin-bottom: 0.5rem;">Inklusive:</strong>
            ${rate.includes.map(item => `
              <span class="badge" style="margin-right: 0.25rem;">
                <i class="fas fa-check" style="font-size: 0.75rem;"></i> ${item}
              </span>
            `).join('')}
          </div>
        ` : ''}
        <button type="button" class="btn primary btn-select-rate" data-rate-code="${rate.code}" data-rate-price="${rate.price}">
          <i class="fas fa-check"></i>
          Auswählen
        </button>
      </div>
    `).join('');

    // Add click handlers
    grid.querySelectorAll('.btn-select-rate').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const code = e.currentTarget.dataset.rateCode;
        const price = e.currentTarget.dataset.ratePrice;
        this.selectRate(code, price);
        
        // Auto-advance to next step
        setTimeout(() => {
          this.wizardNext();
        }, 300);
      });
    });
  }

  selectRate(code, price) {
    // Visual feedback
    document.querySelectorAll('.rate-card').forEach(card => {
      card.classList.remove('selected');
    });
    const selectedCard = document.querySelector(`[data-rate="${code}"]`);
    if (selectedCard) {
      selectedCard.classList.add('selected');
    }

    // Store selection
    const form = document.getElementById('formNewReservation');
    
    let codeInput = form.querySelector('[name="rate_code"]');
    if (!codeInput) {
      codeInput = document.createElement('input');
      codeInput.type = 'hidden';
      codeInput.name = 'rate_code';
      form.appendChild(codeInput);
    }
    codeInput.value = code;

    let priceInput = form.querySelector('[name="rate_price"]');
    if (!priceInput) {
      priceInput = document.createElement('input');
      priceInput.type = 'hidden';
      priceInput.name = 'rate_price';
      form.appendChild(priceInput);
    }
    priceInput.value = price;
    
    // Update wizard data
    this.wizard.data.rate_code = code;
    this.wizard.data.rate_price = price;
    
    this.ui.showToast(`Rate "${code}" ausgewählt`, 'success');
  }

  renderReservationSummary(data) {
    const content = document.querySelector('[data-step-content="4"]');
    if (!content) return;

    // Add summary section if not exists
    let summarySection = content.querySelector('.reservation-summary');
    if (!summarySection) {
      summarySection = document.createElement('div');
      summarySection.className = 'reservation-summary card';
      summarySection.style.marginBottom = '2rem';
      content.insertBefore(summarySection, content.firstChild);
    }

    const hotel = state.get('hotels')?.find(h => h.code === data.hotel_code);
    const nights = this.calculateNights(data.arrival, data.departure);
    const totalPrice = (data.rate_price || 0) * nights;

    summarySection.innerHTML = `
      <h4>Zusammenfassung</h4>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="label">Hotel:</span>
          <span class="value">${hotel ? hotel.name : data.hotel_code || 'Nicht ausgewählt'}</span>
        </div>
        <div class="summary-item">
          <span class="label">Anreise:</span>
          <span class="value">${data.arrival ? this.formatDate(data.arrival) : 'Nicht ausgewählt'}</span>
        </div>
        <div class="summary-item">
          <span class="label">Abreise:</span>
          <span class="value">${data.departure ? this.formatDate(data.departure) : 'Nicht ausgewählt'}</span>
        </div>
        <div class="summary-item">
          <span class="label">Nächte:</span>
          <span class="value">${nights}</span>
        </div>
        <div class="summary-item">
          <span class="label">Kategorie:</span>
          <span class="value">${data.category || 'Nicht ausgewählt'}</span>
        </div>
        <div class="summary-item">
          <span class="label">Rate:</span>
          <span class="value">${data.rate_code || 'Nicht ausgewählt'}</span>
        </div>
        <div class="summary-item">
          <span class="label">Preis/Nacht:</span>
          <span class="value">${data.rate_price ? this.formatCurrency(data.rate_price) : '0 â‚¬'}</span>
        </div>
        <div class="summary-item highlight">
          <span class="label">Gesamtpreis:</span>
          <span class="value">${this.formatCurrency(totalPrice)}</span>
        </div>
      </div>
    `;
  }

  calculateNights(arrival, departure) {
    if (!arrival || !departure) return 0;
    const arrDate = new Date(arrival);
    const depDate = new Date(departure);
    const diffTime = Math.abs(depDate - arrDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // =============== DATA OPERATIONS ===============
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
      
      // Merge with wizard data
      const finalData = { ...this.wizard?.data, ...data };
      
      switch (formType) {
        case 'new-reservation':
          await this.createReservation(finalData);
          break;
        case 'edit-reservation':
          await this.updateReservation(finalData);
          break;
        case 'channel-settings':
          await this.saveChannelSettings(finalData);
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
      this.updateTodaysOperations();
      
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
      console.log('Creating reservation with data:', data);
      
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
      this.updateTodaysOperations();
      
      this.ui.showToast('Reservierung erfolgreich erstellt!', 'success');
      
      // Send confirmation email if configured
      if (data.send_confirmation && data.guest_email) {
        this.sendConfirmationEmail(reservation);
      }
      
      return reservation;
    } catch (error) {
      console.error('Failed to create reservation:', error);
      this.ui.showToast('Fehler beim Erstellen der Reservierung: ' + error.message, 'error');
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
      
      this.ui.closeModal('modalEditReservation');
      this.renderReservationTable();
      this.updateKPIs();
      
      this.ui.showToast('Reservation canceled', 'success');
    } catch (error) {
      console.error('Failed to cancel reservation:', error);
      this.ui.showToast('Failed to cancel reservation: ' + error.message, 'error');
    }
  }

  generateReservationNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RES-${year}-${random}`;
  }

  // =============== UI UPDATE METHODS ===============
  renderReservationTable() {
    const tbody = document.querySelector('#reservationTable tbody');
    if (!tbody) return;

    const allReservations = state.get('reservations') || [];
    const pagination = state.get('pagination') || { currentPage: 1, pageSize: 25 };
    
    // Update badge count
    const count = document.getElementById('reservationCount');
    if (count) {
      count.textContent = allReservations.length;
    }

    // Calculate pagination
    const totalItems = allReservations.length;
    const totalPages = Math.ceil(totalItems / pagination.pageSize) || 1;
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    const endIndex = Math.min(startIndex + pagination.pageSize, totalItems);
    
    // Update pagination state
    state.set('pagination', {
      ...pagination,
      totalPages,
      totalItems
    });

    // Get current page reservations
    const pageReservations = allReservations.slice(startIndex, endIndex);

    // Update pagination UI
    this.updatePaginationUI(startIndex, endIndex, totalItems, pagination.currentPage, totalPages);

    // Render empty state
    if (allReservations.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted">
            <div style="padding: 2rem;">
              <i class="fas fa-inbox" style="font-size: 3rem; opacity: 0.3;"></i>
              <p style="margin-top: 1rem;">Keine Reservierungen gefunden</p>
              <p style="margin-top: 0.5rem; font-size: 0.875rem;">
                Erstellen Sie eine neue Reservierung um zu starten
              </p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    // Render table rows
    tbody.innerHTML = pageReservations.map(r => {
      const hotel = state.get('hotels')?.find(h => h.code === r.hotel_code);
      const nights = this.calculateNights(r.arrival, r.departure);
      const totalPrice = (r.rate_price || 0) * nights;
      
      return `
        <tr data-id="${r.id}" style="cursor: pointer;">
          <td class="res-nr-cell">${r.reservation_number}</td>
          <td>${hotel ? hotel.name : r.hotel_code}</td>
          <td>${r.guest_first_name || ''} ${r.guest_last_name}</td>
          <td>${this.formatDate(r.arrival)}</td>
          <td>${this.formatDate(r.departure)}</td>
          <td><span class="category-badge">${r.category}</span></td>
          <td class="price-cell">${this.formatCurrency(totalPrice)}</td>
          <td><span class="pill ${r.status}">${this.getStatusLabel(r.status)}</span></td>
        </tr>
      `;
    }).join('');
  }

  updatePaginationUI(startIndex, endIndex, totalItems, currentPage, totalPages) {
    // Update pagination info
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
      if (totalItems === 0) {
        paginationInfo.textContent = 'Zeige 0-0 von 0 Reservierungen';
      } else {
        paginationInfo.textContent = `Zeige ${startIndex + 1}-${endIndex} von ${totalItems} Reservierungen`;
      }
    }

    // Update page display
    const paginationPages = document.getElementById('paginationPages');
    if (paginationPages) {
      paginationPages.textContent = `Seite ${currentPage} von ${totalPages}`;
    }

    // Update button states
    const firstBtn = document.querySelector('[data-action="first-page"]');
    const prevBtn = document.querySelector('[data-action="prev-page"]');
    const nextBtn = document.querySelector('[data-action="next-page"]');
    const lastBtn = document.querySelector('[data-action="last-page"]');

    if (firstBtn) firstBtn.disabled = currentPage === 1;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    if (lastBtn) lastBtn.disabled = currentPage === totalPages;
  }

  changePage(direction) {
    const pagination = state.get('pagination');
    let newPage = pagination.currentPage;

    switch(direction) {
      case 'first':
        newPage = 1;
        break;
      case 'prev':
        newPage = Math.max(1, pagination.currentPage - 1);
        break;
      case 'next':
        newPage = Math.min(pagination.totalPages, pagination.currentPage + 1);
        break;
      case 'last':
        newPage = pagination.totalPages;
        break;
    }

    state.set('pagination', { ...pagination, currentPage: newPage });
    this.renderReservationTable();
  }

  changePageSize(newSize) {
    const pagination = state.get('pagination');
    state.set('pagination', {
      ...pagination,
      pageSize: parseInt(newSize),
      currentPage: 1 // Reset to first page when changing page size
    });
    this.renderReservationTable();
  }

  updateKPIs() {
    const reservations = state.get('reservations') || [];
    
    // Today's performance
    const today = new Date().toISOString().split('T')[0];
    const todayReservations = reservations.filter(r => 
      r.created_at && r.created_at.split('T')[0] === today && r.status === 'active'
    );
    
    const todayRevenue = todayReservations.reduce((sum, r) => {
      const nights = this.calculateNights(r.arrival, r.departure);
      return sum + (r.rate_price || 0) * nights;
    }, 0);
    
    const todayNights = todayReservations.reduce((sum, r) => 
      sum + this.calculateNights(r.arrival, r.departure), 0
    );
    
    const todayADR = todayNights > 0 ? todayRevenue / todayNights : 0;
    
    // Update today's KPIs
    this.updateElement('tBookings', todayReservations.length);
    this.updateElement('tRevenue', this.formatCurrency(todayRevenue));
    this.updateElement('tADR', this.formatCurrency(todayADR));
    this.updateElement('tOcc', '0%'); // Placeholder
    
    // Next 7 days performance
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];
    
    const nextWeekReservations = reservations.filter(r => 
      r.arrival >= today && r.arrival <= nextWeekStr && r.status === 'active'
    );
    
    const nextWeekRevenue = nextWeekReservations.reduce((sum, r) => {
      const nights = this.calculateNights(r.arrival, r.departure);
      return sum + (r.rate_price || 0) * nights;
    }, 0);
    
    const nextWeekNights = nextWeekReservations.reduce((sum, r) => 
      sum + this.calculateNights(r.arrival, r.departure), 0
    );
    
    const nextWeekADR = nextWeekNights > 0 ? nextWeekRevenue / nextWeekNights : 0;
    
    // Update next 7 days KPIs
    this.updateElement('nBookings', nextWeekReservations.length);
    this.updateElement('nRevenue', this.formatCurrency(nextWeekRevenue));
    this.updateElement('nADR', this.formatCurrency(nextWeekADR));
    this.updateElement('nOcc', '0%'); // Placeholder
  }

  updateHotelSelects() {
    const hotels = state.get('hotels') || [];
    document.querySelectorAll('.hotel-select').forEach(select => {
      const currentValue = select.value;
      const hasAllOption = select.querySelector('option[value=""]');
      
      select.innerHTML = hasAllOption ? '<option value="">Alle Hotels</option>' : '<option value="">Bitte wählen...</option>';
      
      hotels.forEach(hotel => {
        const option = document.createElement('option');
        option.value = hotel.code;
        option.textContent = hotel.name;
        select.appendChild(option);
      });
      
      if (currentValue) {
        select.value = currentValue;
      }
    });
  }

  loadHotelsForSelect() {
    // Just update the selects with current hotels
    this.updateHotelSelects();
  }

  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  // =============== MODAL HANDLERS ===============
  openNewReservationModal() {
    this.resetForm('formNewReservation');
    this.ui.openModal('modalNewReservation');
    
    // Initialize wizard
    this.initWizard();
    
    // Load hotels for the first step
    this.loadHotelsForSelect();
    
    // Pre-load categories and rates for better performance
    this.loadCategories();
    this.loadRates();
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
  
  openSketchModal() {
    this.ui.openModal('modalSketch');
  }

  openQuickSearch() {
    // Implement quick search functionality
    this.ui.showToast('Quick search coming soon', 'info');
  }

  resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
      form.reset();
      // Remove hidden inputs for category and rate
      form.querySelectorAll('input[type="hidden"]').forEach(input => {
        if (input.name === 'category' || input.name === 'rate_code' || input.name === 'rate_price') {
          input.remove();
        }
      });
      
      // Reset wizard if it exists
      if (this.wizard) {
        this.wizard = null;
      }
    }
  }

  handleTableRowClick(id) {
    // Open edit modal for this reservation
    console.log('Edit reservation:', id);
    this.ui.showToast('Edit functionality coming soon', 'info');
  }

  // =============== UTILITY METHODS ===============
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatCurrency(amount) {
    if (!amount && amount !== 0) return '0 â‚¬';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  getStatusLabel(status) {
    const labels = {
      active: 'Aktiv',
      done: 'Abgeschlossen',
      canceled: 'Storniert',
      pending: 'Ausstehend'
    };
    return labels[status] || status;
  }

  // =============== LIFECYCLE METHODS ===============
  showLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }
  }

  hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  updateClock() {
    const updateTime = () => {
      const now = new Date();
      
      const dateElement = document.getElementById('dateLocal');
      if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
      
      const clockElement = document.getElementById('clockLocal');
      if (clockElement) {
        clockElement.textContent = now.toLocaleTimeString('de-DE');
      }
    };
    
    updateTime();
    setInterval(updateTime, 1000);
  }
  
  updateUserDisplay() {
    const user = state.get('user');
    const userElement = document.getElementById('currentUser');
    if (userElement && user) {
      userElement.textContent = user.name || user.email || 'User';
    }
  }

  updateDashboard() {
    this.renderReservationTable();
    this.updateKPIs();
    this.updateActivityFeed();
    this.updateYoYPerformance();
  }

  updateActivityFeed() {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;
    
    const reservations = state.get('reservations') || [];
    const recentReservations = reservations.slice(0, 5);
    
    if (recentReservations.length === 0) {
      feed.innerHTML = `
        <div class="text-center text-muted" style="padding: 2rem;">
          <i class="fas fa-history" style="font-size: 2rem; opacity: 0.3;"></i>
          <p style="margin-top: 1rem;">Keine Aktivitäten</p>
        </div>
      `;
      return;
    }
    
    feed.innerHTML = recentReservations.map(r => `
      <div class="activity-item">
        <div class="activity-icon">
          <i class="fas fa-plus-circle"></i>
        </div>
        <div class="activity-content">
          <div class="activity-title">Neue Reservierung: ${r.guest_last_name}</div>
          <div class="activity-meta">${r.reservation_number} · ${this.formatDate(r.created_at)}</div>
        </div>
      </div>
    `).join('');
  }

  updateYoYPerformance() {
    const yoyContainer = document.getElementById('yoyPerformance');
    if (!yoyContainer) return;
    
    const hotels = state.get('hotels') || [];
    const reservations = state.get('reservations') || [];
    
    // Calculate YoY for each hotel
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const lastYear = new Date(today);
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    const lastYearStr = lastYear.toISOString().split('T')[0];
    
    const hotelPerformance = hotels.map(hotel => {
      // Count bookings today
      const todayBookings = reservations.filter(r => 
        r.hotel_code === hotel.code && 
        r.created_at && 
        r.created_at.split('T')[0] === todayStr &&
        r.status === 'active'
      ).length;
      
      // Count bookings same day last year (simulated - in real app would fetch from DB)
      const lastYearBookings = Math.floor(Math.random() * 5); // Demo data
      
      const diff = todayBookings - lastYearBookings;
      const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
      const icon = diff > 0 ? 'fa-arrow-up' : diff < 0 ? 'fa-arrow-down' : 'fa-minus';
      const diffText = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '0';
      
      return {
        hotel,
        todayBookings,
        lastYearBookings,
        diff,
        trend,
        icon,
        diffText
      };
    });
    
    if (hotelPerformance.length === 0) {
      yoyContainer.innerHTML = `
        <div class="text-center text-muted" style="padding: 2rem;">
          <i class="fas fa-chart-line" style="font-size: 2rem; opacity: 0.3;"></i>
          <p style="margin-top: 1rem;">Keine Hotels</p>
        </div>
      `;
      return;
    }
    
    yoyContainer.innerHTML = hotelPerformance.map(perf => `
      <div class="yoy-item">
        <div class="yoy-item-info">
          <div class="yoy-item-name">${perf.hotel.name}</div>
          <div class="yoy-item-meta">${perf.todayBookings} heute · ${perf.lastYearBookings} letztes Jahr</div>
        </div>
        <div class="yoy-item-trend ${perf.trend}">
          <i class="fas ${perf.icon}"></i>
          <span>${perf.diffText}</span>
        </div>
      </div>
    `).join('');
  }

  startPeriodicUpdates() {
    // Refresh data every 5 minutes
    setInterval(() => {
      this.loadReservations();
    }, 5 * 60 * 1000);
  }

  saveState() {
    // Save current state to storage
    const preferences = Storage.get('PREFERENCES') || {};
    Storage.set('PREFERENCES', preferences);
  }

  hasUnsavedChanges() {
    // Check if there are unsaved changes
    return false; // Implement as needed
  }

  isSessionValid(session) {
    if (!session || !session.expiresAt) return false;
    return new Date(session.expiresAt) > new Date();
  }
  
  createDemoSession() {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 hours
    
    return {
      user: {
        id: 'demo-user',
        email: 'demo@hotel-system.de',
        name: 'Demo User',
        role: 'admin'
      },
      token: 'demo-token-' + Date.now(),
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };
  }

  redirectToAuth() {
    window.location.href = 'auth.html';
  }

  logout() {
    if (confirm('Möchten Sie sich wirklich abmelden?')) {
      Storage.remove('USER_SESSION');
      this.redirectToAuth();
    }
  }

  showDashboard() {
    // Implementation
  }

  showReservationsView() {
    // Implementation
  }

  showReservationDetail(id) {
    // Implementation
  }

  showSettingsView() {
    // Implementation
  }

  showReportsView() {
    // Implementation
  }

  loadAvailability() {
    this.ui.showToast('Availability loading coming soon', 'info');
  }

  loadReports() {
    this.ui.showToast('Reports coming soon', 'info');
  }

  loadSettings() {
    this.ui.showToast('Settings coming soon', 'info');
  }

  async exportToCSV() {
    this.ui.showToast('CSV export coming soon', 'info');
  }

  async exportToPDF() {
    this.ui.showToast('PDF export coming soon', 'info');
  }

  async saveChannelSettings(data) {
    this.ui.showToast('Channel settings save coming soon', 'info');
  }

  async sendConfirmationEmail(reservation) {
    this.ui.showToast('Confirmation email sent', 'success');
  }

  // =============== TODAY'S OPERATIONS ===============
  // TODO: Later implement pop-up modals for "Details anzeigen" buttons instead of filtering the table
  
  updateTodaysOperations() {
    const reservations = state.get('reservations') || [];
    const today = new Date().toISOString().split('T')[0];

    // Calculate check-ins today
    const todayCheckins = reservations.filter(r => 
      r.arrival === today && r.status === 'active'
    );

    // Calculate check-outs today
    const todayCheckouts = reservations.filter(r => 
      r.departure === today && r.status === 'active'
    );

    // Calculate in-house guests (arrival <= today, departure > today)
    const inhouseGuests = reservations.filter(r => 
      r.arrival <= today && r.departure > today && r.status === 'active'
    );

    // Update UI
    this.updateElement('todayCheckins', todayCheckins.length);
    this.updateElement('todayCheckouts', todayCheckouts.length);
    this.updateElement('inhouseGuests', inhouseGuests.length);
  }

  viewTodaysCheckins() {
    const today = new Date().toISOString().split('T')[0];
    
    // Update filters to show today's check-ins
    state.set('filters', {
      ...state.get('filters'),
      dateFrom: today,
      dateTo: today,
      status: 'active'
    });
    
    // Update filter UI
    const dateFromInput = document.getElementById('filterDateFrom');
    const dateToInput = document.getElementById('filterDateTo');
    if (dateFromInput) dateFromInput.value = today;
    if (dateToInput) dateToInput.value = today;
    
    this.applyFilters();
    this.ui.showToast('Zeige heutige Check-ins', 'info');
  }

  viewTodaysCheckouts() {
    const today = new Date().toISOString().split('T')[0];
    
    // Update filters to show today's check-outs
    state.set('filters', {
      ...state.get('filters'),
      dateFrom: today,
      dateTo: today,
      status: 'active'
    });
    
    // Update filter UI
    const dateFromInput = document.getElementById('filterDateFrom');
    const dateToInput = document.getElementById('filterDateTo');
    if (dateFromInput) dateFromInput.value = today;
    if (dateToInput) dateToInput.value = today;
    
    this.applyFilters();
    this.ui.showToast('Zeige heutige Check-outs', 'info');
  }

  viewInhouseGuests() {
    const today = new Date().toISOString().split('T')[0];
    
    // Filter for in-house guests
    const reservations = state.get('reservations') || [];
    const inhouseReservations = reservations.filter(r => 
      r.arrival <= today && r.departure > today && r.status === 'active'
    );
    
    // Temporarily set filtered reservations
    state.set('reservations', inhouseReservations);
    this.renderReservationTable();
    
    this.ui.showToast(`${inhouseReservations.length} Gäste im Haus`, 'info');
  }
}

// =============== APPLICATION INITIALIZATION ===============
document.addEventListener('DOMContentLoaded', () => {
  console.log('Hotel Reservation System V2.0 - Initializing...');
  
  window.app = new ReservationApp();
  window.app.init().catch(error => {
    console.error('Failed to initialize app:', error);
  });
});

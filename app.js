/* ================================================
   HOTEL RESERVATION SYSTEM V2.0 - CORE APPLICATION
   ================================================ */

'use strict';

// =============== CONFIGURATION ===============
// Nutze window.HRS_CONFIG falls vorhanden, sonst Fallback
const CONFIG = {
  VERSION: '2.0.0',
  API: {
    SUPABASE_URL: window.HRS_CONFIG?.API?.SUPABASE?.URL || 'https://kcqmcwfbapcuiatwixwm.supabase.co',
    SUPABASE_KEY: window.HRS_CONFIG?.API?.SUPABASE?.ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjcW1jd2ZiYXBjdWlhdHdpeHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2Mzg5MTksImV4cCI6MjA3NzIxNDkxOX0.xy8Iwz1nl8kBbSQio00ogy5sU_cFI2R4CPe5HdqIFDQ',
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
      // Check if Supabase library is loaded
      if (typeof window.supabase === 'undefined') {
        console.warn('Supabase library not loaded - running in Demo Mode');
        this.updateConnectionStatus('SB', false);
        return null;
      }
      
      const { createClient } = window.supabase;
      this.supabase = createClient(
        this.config.API.SUPABASE_URL,
        this.config.API.SUPABASE_KEY
      );
      
      // Test connection
      const { data, error } = await this.supabase
        .from('reservations')
        .select('count');
      
      if (error) throw error;
      
      console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Supabase connected successfully');
      this.updateConnectionStatus('SB', true);
      
      return this.supabase;
    } catch (error) {
      console.warn('ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Supabase connection failed - running in Demo Mode:', error.message);
      this.updateConnectionStatus('SB', false);
      return null;
    }
  }

  updateConnectionStatus(type, connected) {
    // Warte kurz, damit DOM sicher geladen ist
    setTimeout(() => {
      const indicator = document.querySelector(`[data-status-type="${type}"]`);
      
      if (indicator) {
        // Entferne beide Klassen erst
        indicator.classList.remove('active', 'error');
        
        // FÃƒÆ’Ã‚Â¼ge die richtige Klasse hinzu
        if (connected) {
          indicator.classList.add('active');
          // Update tooltip
          if (type === 'SB') {
            indicator.setAttribute('data-tooltip', 'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Supabase Connected');
          } else {
            indicator.setAttribute('data-tooltip', 'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ HotelNetSolutions Connected');
          }
        } else {
          indicator.classList.add('error');
          // Update tooltip
          if (type === 'SB') {
            indicator.setAttribute('data-tooltip', 'ÃƒÂ¢Ã‚ÂÃ…â€™ Supabase - Nicht verbunden');
          } else {
            indicator.setAttribute('data-tooltip', 'ÃƒÂ¢Ã‚ÂÃ…â€™ HotelNetSolutions - Nicht verbunden');
          }
        }
        
        console.log(`ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Connection status updated: ${type} = ${connected ? 'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Connected' : 'ÃƒÂ¢Ã‚ÂÃ…â€™ Disconnected'}`);
      } else {
        console.warn(`ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Status indicator not found for: ${type}`);
      }
    }, 100);
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
        // Demo mode - return data from localStorage or sample data
        let reservations = this.getStoredReservations();
        
        // If no stored reservations, use demo data
        if (!reservations || reservations.length === 0) {
          reservations = this.getDemoReservations();
          this.saveReservationsToStorage(reservations);
        }
        
        // Apply filters
        return this.applyFiltersToReservations(reservations, filters);
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
      return this.getStoredReservations() || this.getDemoReservations();
    }
  }

  getStoredReservations() {
    try {
      const stored = localStorage.getItem('hrs_v2_demo_reservations');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get stored reservations:', error);
      return null;
    }
  }

  saveReservationsToStorage(reservations) {
    try {
      localStorage.setItem('hrs_v2_demo_reservations', JSON.stringify(reservations));
    } catch (error) {
      console.error('Failed to save reservations to storage:', error);
    }
  }

  applyFiltersToReservations(reservations, filters) {
    let filtered = [...reservations];

    // Sort by created_at descending
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    // Apply hotel filter
    if (filters.hotel) {
      filtered = filtered.filter(r => r.hotel_code === filters.hotel);
    }

    // Apply date filters
    if (filters.dateFrom) {
      filtered = filtered.filter(r => r.arrival >= filters.dateFrom);
    }

    if (filters.dateTo) {
      filtered = filtered.filter(r => r.departure <= filters.dateTo);
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(r => 
        (r.guest_last_name && r.guest_last_name.toLowerCase().includes(searchLower)) ||
        (r.guest_first_name && r.guest_first_name.toLowerCase().includes(searchLower)) ||
        (r.reservation_number && r.reservation_number.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }

  getDemoReservations() {
    // Return demo data if Supabase is not available
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    return [
      {
        id: 1,
        reservation_number: 'RES-2024-001',
        hotel_code: 'MA7-M-DOR',
        guest_first_name: 'Max',
        guest_last_name: 'Mustermann',
        guest_email: 'max.mustermann@email.com',
        guest_phone: '+49 89 12345678',
        arrival: formatDate(today),
        departure: formatDate(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)),
        guests_adults: 2,
        guests_children: 0,
        category: 'SUP',
        rate_code: 'STD',
        rate_price: 119,
        total_price: 238,
        status: 'active',
        payment_status: 'pending',
        notes: 'FrÃƒÆ’Ã‚Â¼her Check-in gewÃƒÆ’Ã‚Â¼nscht',
        created_at: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        reservation_number: 'RES-2024-002',
        hotel_code: 'RES-HD-ALT',
        guest_first_name: 'Anna',
        guest_last_name: 'Schmidt',
        guest_email: 'anna.schmidt@example.de',
        guest_phone: '+49 621 987654',
        arrival: formatDate(tomorrow),
        departure: formatDate(new Date(tomorrow.getTime() + 3 * 24 * 60 * 60 * 1000)),
        guests_adults: 2,
        guests_children: 1,
        category: 'DLX',
        rate_code: 'FLEX',
        rate_price: 159,
        total_price: 477,
        status: 'active',
        payment_status: 'paid',
        guest_company: 'Schmidt GmbH',
        created_at: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        reservation_number: 'RES-2024-003',
        hotel_code: 'MA7-M-DOR',
        guest_first_name: 'Thomas',
        guest_last_name: 'Weber',
        guest_email: 'thomas.weber@business.com',
        guest_phone: '+49 89 555-1234',
        arrival: formatDate(nextWeek),
        departure: formatDate(new Date(nextWeek.getTime() + 5 * 24 * 60 * 60 * 1000)),
        guests_adults: 1,
        guests_children: 0,
        category: 'EXE',
        rate_code: 'CORP',
        rate_price: 189,
        total_price: 945,
        status: 'active',
        payment_status: 'partial',
        guest_company: 'TechCorp AG',
        notes: 'Business Gast - Rechnung an Firma',
        created_at: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 4,
        reservation_number: 'RES-2024-004',
        hotel_code: 'RES-HD-ALT',
        guest_first_name: 'Julia',
        guest_last_name: 'MÃƒÆ’Ã‚Â¼ller',
        guest_email: 'julia.mueller@gmail.com',
        arrival: '2024-11-20',
        departure: '2024-11-22',
        guests_adults: 2,
        guests_children: 0,
        category: 'SUP',
        rate_code: 'STD',
        rate_price: 129,
        total_price: 258,
        status: 'pending',
        payment_status: 'pending',
        created_at: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 5,
        reservation_number: 'RES-2024-005',
        hotel_code: 'MA7-M-DOR',
        guest_first_name: 'Michael',
        guest_last_name: 'Fischer',
        guest_email: 'michael.fischer@email.de',
        arrival: '2024-11-05',
        departure: '2024-11-08',
        guests_adults: 2,
        guests_children: 2,
        category: 'FAM',
        rate_code: 'FAM',
        rate_price: 149,
        total_price: 447,
        status: 'done',
        payment_status: 'paid',
        guest_notes: 'Hatten einen schÃƒÆ’Ã‚Â¶nen Aufenthalt',
        created_at: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  async createReservation(data) {
    try {
      if (!this.supabase) {
        // Demo mode - simulate creation and save to localStorage
        const newReservation = {
          ...data,
          id: Date.now(),
          created_at: new Date().toISOString()
        };
        
        // Get existing reservations and add new one
        const reservations = this.getStoredReservations() || [];
        reservations.unshift(newReservation);
        this.saveReservationsToStorage(reservations);
        
        return newReservation;
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
        // Demo mode - update in localStorage
        const reservations = this.getStoredReservations() || [];
        const index = reservations.findIndex(r => r.id === id || r.id === Number(id));
        
        if (index !== -1) {
          reservations[index] = { ...reservations[index], ...updates };
          this.saveReservationsToStorage(reservations);
          return reservations[index];
        }
        
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
          message: 'UngÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼ltige E-Mail-Adresse'
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
  { code: 'GH-KA-SUD', group: 'GuestHouse', name: 'Karlsruhe SÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼dstadt', city: 'Karlsruhe' },
  { code: 'GH-S-MIT', group: 'GuestHouse', name: 'Stuttgart Mitte', city: 'Stuttgart' },
  { code: 'BW-FR-CTR', group: 'BestWay', name: 'Frankfurt City Center', city: 'Frankfurt' },
  { code: 'BW-FR-FLU', group: 'BestWay', name: 'Frankfurt Flughafen', city: 'Frankfurt' },
  { code: 'UM-MUC-HBF', group: 'UrbanMotel', name: 'MÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼nchen Hauptbahnhof', city: 'MÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼nchen' },
  { code: 'UM-MUC-OST', group: 'UrbanMotel', name: 'MÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼nchen Ost', city: 'MÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼nchen' }
];

// =============== DEMO DATA ===============
const DEMO_CATEGORIES = [
  { 
    id: 1, 
    code: 'STD', 
    name: 'Standard', 
    size: '18mÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â²', 
    beds: '1 Doppelbett', 
    persons: 2, 
    price: 89,
    amenities: ['WLAN', 'TV', 'Bad mit Dusche']
  },
  { 
    id: 2, 
    code: 'SUP', 
    name: 'Superior', 
    size: '24mÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â²', 
    beds: '1 King-Size Bett', 
    persons: 2, 
    price: 119,
    amenities: ['WLAN', 'Smart-TV', 'Bad mit Wanne', 'Minibar']
  },
  { 
    id: 3, 
    code: 'DLX', 
    name: 'Deluxe', 
    size: '32mÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â²', 
    beds: '1 King-Size Bett + Schlafsofa', 
    persons: 3, 
    price: 159,
    amenities: ['WLAN', 'Smart-TV', 'Bad mit Wanne & Dusche', 'Minibar', 'Balkon']
  },
  {
    id: 4,
    code: 'JUN',
    name: 'Junior Suite',
    size: '42mÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â²',
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
    includes: ['FrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼hstÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼ck']
  },
  { 
    id: 2, 
    code: 'FLEX', 
    name: 'Flex Rate', 
    price: 109, 
    cancellation: 'Bis 6h vorher kostenlos stornierbar',
    includes: ['FrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼hstÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼ck', 'Late Check-out']
  },
  { 
    id: 3, 
    code: 'NREF', 
    name: 'Non-Refundable', 
    price: 69, 
    cancellation: 'Nicht stornierbar - 20% gÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼nstiger',
    includes: ['FrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼hstÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼ck']
  },
  {
    id: 4,
    code: 'BUSI',
    name: 'Business Rate',
    price: 99,
    cancellation: 'Bis 18h vorher kostenlos stornierbar',
    includes: ['FrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼hstÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼ck', 'WLAN Premium', 'Parkplatz']
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
        case 'cancel-reservation':
          await this.handleCancelReservation();
          break;
        case 'add-trace':
          this.openAddTraceModal();
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
      this.ui.showToast('Bitte alle Pflichtfelder ausfÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼llen', 'error');
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
          this.ui.showToast('Bitte eine Kategorie auswÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤hlen', 'error');
          return false;
        }
        break;
      case 3:
        // Validate rate selection
        const rateInput = document.getElementById('formNewReservation').querySelector('[name="rate_code"]');
        if (!rateInput || !rateInput.value) {
          this.ui.showToast('Bitte eine Rate auswÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤hlen', 'error');
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
          <p style="margin-top: 1rem;">Keine Kategorien verfÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼gbar</p>
          <p style="margin-top: 0.5rem; font-size: 0.875rem;">Bitte fÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼gen Sie Kategorien in den Einstellungen hinzu.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = categories.map(cat => `
      <div class="category-card glass-morphism" data-category="${cat.code}">
        <div class="category-header">
          <h4>${cat.name}</h4>
          <div class="category-price">
            ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬${cat.price}
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
          AuswÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤hlen
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
    
    this.ui.showToast(`Kategorie "${code}" ausgewÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤hlt`, 'success');
  }

  renderRateGrid() {
    const grid = document.getElementById('rateGrid');
    if (!grid) return;

    const rates = state.get('rates') || [];
    
    if (rates.length === 0) {
      grid.innerHTML = `
        <div class="text-center text-muted" style="grid-column: 1/-1; padding: 2rem;">
          <i class="fas fa-tag" style="font-size: 3rem; opacity: 0.3;"></i>
          <p style="margin-top: 1rem;">Keine Raten verfÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼gbar</p>
          <p style="margin-top: 0.5rem; font-size: 0.875rem;">Bitte fÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼gen Sie Raten in den Einstellungen hinzu.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = rates.map(rate => `
      <div class="rate-card glass-morphism" data-rate="${rate.code}">
        <div class="rate-header">
          <h4>${rate.name}</h4>
          <div class="rate-price">
            ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬${rate.price}
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
          AuswÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤hlen
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
    
    this.ui.showToast(`Rate "${code}" ausgewÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤hlt`, 'success');
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
    const category = state.get('categories')?.find(c => c.code === data.category);
    const rate = state.get('rates')?.find(r => r.code === data.rate_code);
    const nights = this.calculateNights(data.arrival, data.departure);
    const totalPrice = (data.rate_price || 0) * nights;

    summarySection.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
        <div style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--primary-500), var(--accent-500)); border-radius: var(--radius-lg); color: white;">
          <i class="fas fa-check"></i>
        </div>
        <h4 style="margin: 0;">Zusammenfassung</h4>
      </div>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="label"><i class="fas fa-hotel" style="margin-right: 0.5rem; color: var(--primary-400);"></i>Hotel:</span>
          <span class="value">${hotel ? hotel.name : data.hotel_code || 'Nicht ausgewÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤hlt'}</span>
        </div>
        <div class="summary-item">
          <span class="label"><i class="fas fa-calendar-plus" style="margin-right: 0.5rem; color: var(--primary-400);"></i>Anreise:</span>
          <span class="value">${data.arrival ? this.formatDate(data.arrival) : 'Nicht ausgewÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤hlt'}</span>
        </div>
        <div class="summary-item">
          <span class="label"><i class="fas fa-calendar-minus" style="margin-right: 0.5rem; color: var(--primary-400);"></i>Abreise:</span>
          <span class="value">${data.departure ? this.formatDate(data.departure) : 'Nicht ausgewÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤hlt'}</span>
        </div>
        <div class="summary-item">
          <span class="label"><i class="fas fa-moon" style="margin-right: 0.5rem; color: var(--primary-400);"></i>NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤chte:</span>
          <span class="value">${nights}</span>
        </div>
        <div class="summary-item">
          <span class="label"><i class="fas fa-bed" style="margin-right: 0.5rem; color: var(--primary-400);"></i>Kategorie:</span>
          <span class="value">${category ? category.name : data.category || 'Nicht ausgewÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤hlt'}</span>
        </div>
        <div class="summary-item">
          <span class="label"><i class="fas fa-tag" style="margin-right: 0.5rem; color: var(--primary-400);"></i>Rate:</span>
          <span class="value">${rate ? rate.name : data.rate_code || 'Nicht ausgewÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤hlt'}</span>
        </div>
        <div class="summary-item">
          <span class="label"><i class="fas fa-euro-sign" style="margin-right: 0.5rem; color: var(--primary-400);"></i>Preis/Nacht:</span>
          <span class="value">${data.rate_price ? this.formatCurrency(data.rate_price) : '0 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬'}</span>
        </div>
        <div class="summary-item highlight">
          <span class="label"><i class="fas fa-wallet" style="margin-right: 0.5rem;"></i>Gesamtpreis:</span>
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
      
      // Store current reservation for email modal
      this.currentReservation = reservation;
      
      // Open email confirmation modal
      this.openConfirmationEmailModal(reservation);
      
      return reservation;
    } catch (error) {
      console.error('Failed to create reservation:', error);
      this.ui.showToast('Fehler beim Erstellen der Reservierung: ' + error.message, 'error');
      throw error;
    }
  }

  async updateReservation(data) {
    try {
      console.log('Updating reservation with data:', data);
      
      // Get ID from currentEditReservation if not in data
      const id = data.id || this.currentEditReservation?.id;
      
      if (!id) {
        throw new Error('Keine Reservierungs-ID gefunden');
      }
      
      // Clean up the data - remove display fields and use actual values
      const cleanData = { ...data };
      
      // Map display fields to actual fields
      if (cleanData.arrival_display) {
        cleanData.arrival = cleanData.arrival_display;
        delete cleanData.arrival_display;
      }
      if (cleanData.departure_display) {
        cleanData.departure = cleanData.departure_display;
        delete cleanData.departure_display;
      }
      if (cleanData.category_display) {
        cleanData.category = cleanData.category_display;
        delete cleanData.category_display;
      }
      if (cleanData.rate_code_display) {
        cleanData.rate_code = cleanData.rate_code_display;
        delete cleanData.rate_code_display;
      }
      
      // Remove ID from updates to avoid sending it as a field
      const { id: _, ...updates } = cleanData;
      updates.updated_at = new Date().toISOString();
      
      // Auto-calculate status based on dates (unless status is canceled)
      if (updates.arrival && updates.departure && updates.status !== 'canceled') {
        updates.status = this.calculateReservationStatus(updates.arrival, updates.departure);
      }
      
      // Ensure all numeric fields are properly formatted
      const numericFields = [
        'guests_adults', 'guests_children', 'total_price',
        'extra_breakfast_price', 'extra_parking_price', 'extra_minibar_price',
        'discount_amount'
      ];
      
      numericFields.forEach(field => {
        if (updates[field] !== undefined && updates[field] !== null && updates[field] !== '') {
          updates[field] = parseFloat(updates[field]) || 0;
        }
      });
      
      console.log('Cleaned update data:', updates);
      
      const reservation = await this.api.updateReservation(id, updates);
      
      // Update local state
      const reservations = state.get('reservations') || [];
      const index = reservations.findIndex(r => r.id === id);
      if (index !== -1) {
        reservations[index] = { ...reservations[index], ...reservation };
        state.set('reservations', reservations);
      }
      
      // Clear current edit reservation
      this.currentEditReservation = null;
      
      this.ui.closeModal('modalEditReservation');
      this.renderReservationTable();
      this.updateKPIs();
      this.updateTodaysOperations();
      
      this.ui.showToast('Reservierung erfolgreich aktualisiert!', 'success');
      return reservation;
    } catch (error) {
      console.error('Failed to update reservation:', error);
      this.ui.showToast('Fehler beim Aktualisieren der Reservierung: ' + error.message, 'error');
      throw error;
    }
  }
  
  calculateReservationStatus(arrival, departure) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const arrivalDate = new Date(arrival);
    arrivalDate.setHours(0, 0, 0, 0);
    
    const departureDate = new Date(departure);
    departureDate.setHours(0, 0, 0, 0);
    
    // If departure is in the past, reservation is done
    if (departureDate < today) {
      return 'done';
    }
    
    // If arrival is today or in the past, and departure is in the future, guest is in house
    if (arrivalDate <= today && departureDate >= today) {
      return 'inhouse';
    }
    
    // If arrival is in the future, reservation is active (pending arrival)
    if (arrivalDate > today) {
      return 'active';
    }
    
    return 'active';
  }

  async cancelReservation(id) {
    try {
      if (!confirm('MÃƒÂ¶chten Sie diese Reservierung wirklich stornieren?')) {
        return;
      }
      
      const currentUser = state.get('user');
      
      await this.api.updateReservation(id, { 
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        canceled_by: currentUser?.name || currentUser?.email || 'System'
      });
      
      // Update local state
      const reservations = state.get('reservations') || [];
      const index = reservations.findIndex(r => r.id === id);
      if (index !== -1) {
        reservations[index].status = 'canceled';
        reservations[index].canceled_at = new Date().toISOString();
        reservations[index].canceled_by = currentUser?.name || currentUser?.email || 'System';
        state.set('reservations', reservations);
      }
      
      this.ui.closeModal('modalEditReservation');
      this.renderReservationTable();
      this.updateKPIs();
      this.updateTodaysOperations();
      
      this.ui.showToast('Reservierung erfolgreich storniert', 'success');
    } catch (error) {
      console.error('Failed to cancel reservation:', error);
      this.ui.showToast('Fehler beim Stornieren der Reservierung: ' + error.message, 'error');
    }
  }

  async handleCancelReservation() {
    if (!this.currentEditReservation) {
      this.ui.showToast('Keine Reservierung zum Stornieren gefunden', 'error');
      return;
    }
    
    await this.cancelReservation(this.currentEditReservation.id);
    this.currentEditReservation = null;
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
      
      select.innerHTML = hasAllOption ? '<option value="">Alle Hotels</option>' : '<option value="">Bitte wÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤hlen...</option>';
      
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
  
  openConfirmationEmailModal(reservation) {
    // Pre-fill the email modal with reservation data
    const emailTo = document.getElementById('confirmEmailTo');
    const emailSubject = document.getElementById('confirmEmailSubject');
    const emailBody = document.getElementById('confirmEmailBody');
    
    if (emailTo && reservation.guest_email) {
      emailTo.value = reservation.guest_email;
    }
    
    if (emailSubject) {
      const hotel = state.get('hotels')?.find(h => h.code === reservation.hotel_code);
      emailSubject.value = `ReservierungsbestÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤tigung - ${hotel?.name || 'Hotel'} - ${reservation.reservation_number}`;
    }
    
    if (emailBody) {
      const hotel = state.get('hotels')?.find(h => h.code === reservation.hotel_code);
      const nights = this.calculateNights(reservation.arrival, reservation.departure);
      
      emailBody.value = `Sehr geehrte/r ${reservation.guest_first_name || ''} ${reservation.guest_last_name || 'Gast'},

vielen Dank fÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼r Ihre Reservierung!

Reservierungsdetails:
ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â

Reservierungsnummer: ${reservation.reservation_number}
Hotel: ${hotel?.name || reservation.hotel_code}
Kategorie: ${reservation.category || 'N/A'}
Rate: ${reservation.rate_code || 'N/A'}

Anreise: ${this.formatDate(reservation.arrival)}
Abreise: ${this.formatDate(reservation.departure)}
NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤chte: ${nights}

${reservation.guest_company ? `Firma: ${reservation.guest_company}\n` : ''}${reservation.notes ? `\nNotizen: ${reservation.notes}\n` : ''}
ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â

Wir freuen uns auf Ihren Besuch!

Mit freundlichen GrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸en
Ihr Reservierungsteam`;
    }
    
    // Open the modal
    this.ui.openModal('modalConfirmationEmail');
    
    // Add event listener for send button
    const sendBtn = document.querySelector('[data-action="send-confirmation"]');
    if (sendBtn) {
      // Remove old listener
      const newSendBtn = sendBtn.cloneNode(true);
      sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
      
      // Add new listener
      newSendBtn.addEventListener('click', () => {
        this.handleSendConfirmationEmail(reservation);
      });
    }
  }

  openQuickSearch() {
    // Implement quick search functionality
    this.ui.showToast('Quick search coming soon', 'info');
  }

  openEditReservationModal(reservation) {
    // Store current reservation being edited
    this.currentEditReservation = reservation;
    
    // Load hotels for select
    this.loadHotelsForEditSelect();
    
    // Fill form with reservation data
    const form = document.getElementById('formEditReservation');
    if (!form) {
      console.error('Edit form not found');
      return;
    }
    
    // Update header
    const resId = document.getElementById('editReservationId');
    const resStatus = document.getElementById('editReservationStatus');
    if (resId) resId.textContent = `#${reservation.reservation_number || reservation.id}`;
    if (resStatus) {
      const statusMap = {
        'pending': 'Ausstehend',
        'active': 'Aktiv',
        'inhouse': 'In House',
        'done': 'Abgeschlossen',
        'canceled': 'Storniert'
      };
      resStatus.textContent = statusMap[reservation.status] || reservation.status;
    }
    
    // Fill all form fields - basic fields with hidden mapping
    const basicFieldsMapping = {
      'id': 'id',
      'reservation_number': 'reservation_number',
      'hotel_code': 'hotel_code',
      'arrival': 'arrival',
      'arrival_display': 'arrival',
      'departure': 'departure', 
      'departure_display': 'departure',
      'guests_adults': 'guests_adults',
      'guests_children': 'guests_children',
      'status': 'status',
      'category': 'category',
      'category_display': 'category',
      'rate_code': 'rate_code',
      'rate_code_display': 'rate_code',
      'total_price': 'total_price',
      'payment_status': 'payment_status',
      'notes': 'notes'
    };
    
    Object.entries(basicFieldsMapping).forEach(([fieldName, dataKey]) => {
      const input = form.querySelector(`[name="${fieldName}"]`);
      if (input && reservation[dataKey] !== undefined && reservation[dataKey] !== null) {
        input.value = reservation[dataKey];
      }
    });
    
    // Fill guest fields - extended
    const guestFields = [
      'guest_title', 'guest_first_name', 'guest_last_name', 'guest_birthdate',
      'guest_nationality', 'guest_language', 'guest_document_number', 'guest_vip',
      'guest_email', 'guest_phone', 'guest_mobile', 'guest_address',
      'guest_company', 'guest_company_address', 'guest_vat_id', 'guest_department',
      'guest_room_preference', 'guest_bed_preference', 'guest_allergies', 'guest_notes'
    ];
    
    guestFields.forEach(field => {
      const input = form.querySelector(`[name="${field}"]`);
      if (input && reservation[field] !== undefined && reservation[field] !== null) {
        input.value = reservation[field];
      }
    });
    
    // Fill pricing extras
    const pricingFields = [
      'extra_breakfast_price', 'extra_parking_price', 'extra_minibar_price',
      'discount_amount', 'discount_reason', 'discount_type'
    ];
    
    pricingFields.forEach(field => {
      const input = form.querySelector(`[name="${field}"]`);
      if (input && reservation[field] !== undefined && reservation[field] !== null) {
        input.value = reservation[field];
      }
    });
    
    // Load categories and rates for the dropdowns
    this.loadCategoriesForEdit(reservation.category);
    this.loadRatesForEdit(reservation.rate_code);
    
    // Disable hotel and status selects
    const hotelSelect = form.querySelector('[name="hotel_code"]');
    const statusSelect = form.querySelector('[name="status"]');
    if (hotelSelect) hotelSelect.disabled = true;
    if (statusSelect) statusSelect.disabled = true;
    
    // Calculate and display nights
    this.updateNightsDisplayCompact(reservation.arrival, reservation.departure);
    
    // Generate night price cards with editable prices
    this.generateEditableNightPrices(reservation);
    
    // Update pricing summary
    this.updatePricingSummaryCompact(reservation);
    
    // Calculate and display breakdown
    this.calculatePricingBreakdown(reservation);
    
    // Load traces (alerts/reminders, not system logs)
    this.loadReservationTracesModern(reservation);
    
    // Initialize tab switching
    this.initEditModalTabsModern();
    
    // Add listeners for date changes - with sync to hidden fields
    const arrivalInput = form.querySelector('[name="arrival_display"]');
    const departureInput = form.querySelector('[name="departure_display"]');
    const arrivalHidden = form.querySelector('[name="arrival"]');
    const departureHidden = form.querySelector('[name="departure"]');
    
    if (arrivalInput && departureInput) {
      const updateDisplay = () => {
        // Sync to hidden fields
        if (arrivalHidden) arrivalHidden.value = arrivalInput.value;
        if (departureHidden) departureHidden.value = departureInput.value;
        
        this.updateNightsDisplayCompact(arrivalInput.value, departureInput.value);
        this.generateEditableNightPrices({
          ...reservation,
          arrival: arrivalInput.value,
          departure: departureInput.value
        });
        this.calculatePricingBreakdown(reservation);
      };
      arrivalInput.addEventListener('change', updateDisplay);
      departureInput.addEventListener('change', updateDisplay);
    }
    
    // Add listeners for category and rate changes - with sync to hidden fields
    const categorySelect = form.querySelector('[name="category_display"]');
    const rateSelect = form.querySelector('[name="rate_code_display"]');
    const categoryHidden = form.querySelector('[name="category"]');
    const rateHidden = form.querySelector('[name="rate_code"]');
    
    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        const newCategory = e.target.value;
        if (categoryHidden) categoryHidden.value = newCategory;
        if (newCategory) {
          reservation.category = newCategory;
          this.recalculatePriceOnCategoryChange(reservation, newCategory);
        }
      });
    }
    
    if (rateSelect) {
      rateSelect.addEventListener('change', (e) => {
        const newRate = e.target.value;
        if (rateHidden) rateHidden.value = newRate;
        if (newRate) {
          reservation.rate_code = newRate;
          this.recalculatePriceOnRateChange(reservation, newRate);
        }
      });
    }
    
    // Add listeners for pricing changes
    this.initPricingChangeListeners(form, reservation);
    
    // Open the modal
    this.ui.openModal('modalEditReservation');
  }
  
  loadCategoriesForEdit(selectedCategory) {
    const categories = state.get('categories') || [];
    const select = document.querySelector('[name="category_display"]');
    
    if (select) {
      select.innerHTML = '<option value="">Wählen...</option>';
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.code;
        option.textContent = `${cat.code} - ${cat.name}`;
        option.selected = cat.code === selectedCategory;
        select.appendChild(option);
      });
    }
  }
  
  loadRatesForEdit(selectedRate) {
    const rates = state.get('rates') || [];
    const select = document.querySelector('[name="rate_code_display"]');
    
    if (select) {
      select.innerHTML = '<option value="">Wählen...</option>';
      rates.forEach(rate => {
        const option = document.createElement('option');
        option.value = rate.code;
        option.textContent = `${rate.code} - ${rate.name}`;
        option.selected = rate.code === selectedRate;
        select.appendChild(option);
      });
    }
  }
  
  updateNightsDisplayCompact(arrival, departure) {
    if (!arrival || !departure) return;
    
    const arrivalDate = new Date(arrival);
    const departureDate = new Date(departure);
    const nights = Math.ceil((departureDate - arrivalDate) / (1000 * 60 * 60 * 24));
    
    const nightsDisplay = document.getElementById('nightsCountCompact');
    if (nightsDisplay) {
      nightsDisplay.textContent = nights > 0 ? nights : 0;
    }
  }
  
  generateEditableNightPrices(reservation) {
    const container = document.getElementById('nightPriceGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!reservation.arrival || !reservation.departure) {
      container.innerHTML = '<p class="text-center text-muted">Keine Daten verfÃƒÂ¼gbar</p>';
      return;
    }
    
    const arrivalDate = new Date(reservation.arrival);
    const departureDate = new Date(reservation.departure);
    const nights = Math.ceil((departureDate - arrivalDate) / (1000 * 60 * 60 * 24));
    const pricePerNight = reservation.rate_price || 0;
    
    if (nights <= 0) {
      container.innerHTML = '<p class="text-center text-muted">UngÃƒÂ¼ltige Daten</p>';
      return;
    }
    
    // Generate editable card for each night
    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(arrivalDate);
      currentDate.setDate(currentDate.getDate() + i);
      
      const card = document.createElement('div');
      card.className = 'night-price-card';
      card.innerHTML = `
        <div class="night-card-header-compact">
          <span class="night-num"><i class="fas fa-moon"></i> Nacht ${i + 1}</span>
          <span class="night-date-compact">${this.formatDate(currentDate.toISOString().split('T')[0])}</span>
        </div>
        <input 
          type="number" 
          class="night-price-input" 
          data-night-index="${i}"
          value="${pricePerNight.toFixed(2)}" 
          step="0.01" 
          min="0"
          placeholder="0.00"
        />
      `;
      
      const input = card.querySelector('.night-price-input');
      input.addEventListener('change', () => {
        this.updateTotalFromNightPrices();
      });
      
      container.appendChild(card);
    }
  }
  
  updateTotalFromNightPrices() {
    const inputs = document.querySelectorAll('.night-price-input');
    let total = 0;
    
    inputs.forEach(input => {
      const value = parseFloat(input.value) || 0;
      total += value;
    });
    
    // Update total price field
    const totalInput = document.querySelector('[name="total_price"]');
    if (totalInput) {
      totalInput.value = total.toFixed(2);
    }
    
    // Recalculate breakdown
    this.calculatePricingBreakdown(this.currentEditReservation);
  }
  
  updatePricingSummaryCompact(reservation) {
    const catSelect = document.getElementById('priceCatSelect');
    const rateSelect = document.getElementById('priceRateSelect');
    const totalEl = document.getElementById('priceTotal');
    
    // FÃ¼lle Kategorie-Dropdown
    if (catSelect) {
      const categories = state.get('categories') || [];
      catSelect.innerHTML = '<option value="">Kategorie wÃ¤hlen...</option>';
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.code;
        option.textContent = `${cat.code} - ${cat.name}`;
        option.selected = cat.code === reservation.category;
        catSelect.appendChild(option);
      });
    }
    
    // FÃ¼lle Rate-Dropdown
    if (rateSelect) {
      const rates = state.get('rates') || [];
      rateSelect.innerHTML = '<option value="">Rate wÃ¤hlen...</option>';
      rates.forEach(rate => {
        const option = document.createElement('option');
        option.value = rate.code;
        option.textContent = `${rate.code} - ${rate.name}`;
        option.selected = rate.code === reservation.rate_code;
        rateSelect.appendChild(option);
      });
    }
    
    // Update Total
    if (totalEl) {
      const total = reservation.total_price || 0;
      totalEl.textContent = `${parseFloat(total).toFixed(2)} â‚¬`;
    }
  }
  
  initPricingChangeListeners(form, reservation) {
    const extrasInputs = [
      'extra_breakfast_price',
      'extra_parking_price',
      'extra_minibar_price',
      'discount_amount'
    ];
    
    extrasInputs.forEach(fieldName => {
      const input = form.querySelector(`[name="${fieldName}"]`);
      if (input) {
        input.addEventListener('input', () => {
          this.calculatePricingBreakdown(reservation);
        });
      }
    });
    
    // Add listeners for category and rate changes
    const catSelect = document.getElementById('priceCatSelect');
    const rateSelect = document.getElementById('priceRateSelect');
    
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        const newCategory = e.target.value;
        if (newCategory) {
          reservation.category = newCategory;
          // Update the main form field
          const mainCatField = form.querySelector('[name="category"]');
          if (mainCatField) mainCatField.value = newCategory;
          
          // Recalculate prices based on new category
          this.recalculatePriceOnCategoryChange(reservation, newCategory);
        }
      });
    }
    
    if (rateSelect) {
      rateSelect.addEventListener('change', (e) => {
        const newRate = e.target.value;
        if (newRate) {
          reservation.rate_code = newRate;
          // Update the main form field
          const mainRateField = form.querySelector('[name="rate_code"]');
          if (mainRateField) mainRateField.value = newRate;
          
          // Recalculate prices based on new rate
          this.recalculatePriceOnRateChange(reservation, newRate);
        }
      });
    }
  }
  
  calculatePricingBreakdown(reservation) {
    // Get accommodation price from night inputs or total
    let accommodation = 0;
    const nightInputs = document.querySelectorAll('.night-price-input');
    if (nightInputs.length > 0) {
      nightInputs.forEach(input => {
        accommodation += parseFloat(input.value) || 0;
      });
    } else {
      accommodation = parseFloat(document.querySelector('[name="total_price"]')?.value) || 0;
    }
    
    // Get extras
    const breakfast = parseFloat(document.querySelector('[name="extra_breakfast_price"]')?.value) || 0;
    const parking = parseFloat(document.querySelector('[name="extra_parking_price"]')?.value) || 0;
    const minibar = parseFloat(document.querySelector('[name="extra_minibar_price"]')?.value) || 0;
    const extras = breakfast + parking + minibar;
    
    // Get discount
    const discount = parseFloat(document.querySelector('[name="discount_amount"]')?.value) || 0;
    
    // Calculate subtotal
    const subtotal = accommodation + extras - discount;
    
    // Calculate tax (7% for hotels in Germany)
    const taxRate = 0.07;
    const tax = subtotal * taxRate;
    
    // Calculate total
    const total = subtotal + tax;
    
    // Update breakdown display
    document.getElementById('breakdownAccommodation').textContent = `${accommodation.toFixed(2)} Ã¢â€šÂ¬`;
    document.getElementById('breakdownExtras').textContent = `${extras.toFixed(2)} Ã¢â€šÂ¬`;
    document.getElementById('breakdownDiscount').textContent = discount > 0 ? `-${discount.toFixed(2)} Ã¢â€šÂ¬` : `0,00 Ã¢â€šÂ¬`;
    document.getElementById('breakdownSubtotal').textContent = `${subtotal.toFixed(2)} Ã¢â€šÂ¬`;
    document.getElementById('breakdownTax').textContent = `${tax.toFixed(2)} Ã¢â€šÂ¬`;
    document.getElementById('breakdownTotal').textContent = `${total.toFixed(2)} Ã¢â€šÂ¬`;
    
    // Also update the main total field
    const totalInput = document.querySelector('[name="total_price"]');
    if (totalInput) {
      totalInput.value = total.toFixed(2);
    }
    
    // Update summary header
    document.getElementById('priceTotal').textContent = `${total.toFixed(2)} â‚¬`;
  }
  
  recalculatePriceOnCategoryChange(reservation, newCategory) {
    // Get the new category details
    const categories = state.get('categories') || [];
    const category = categories.find(c => c.code === newCategory);
    
    if (!category) return;
    
    // Get the current rate
    const rates = state.get('rates') || [];
    const rate = rates.find(r => r.code === reservation.rate_code);
    
    if (!rate) return;
    
    // Calculate new base price
    const basePrice = parseFloat(category.base_price) || 0;
    const rateMultiplier = parseFloat(rate.price_multiplier) || 1.0;
    const nightCount = this.calculateNights(reservation.arrival, reservation.departure);
    
    const newTotalPrice = basePrice * rateMultiplier * nightCount;
    
    // Update the reservation
    reservation.total_price = newTotalPrice;
    
    // Update night price inputs if they exist
    const nightInputs = document.querySelectorAll('.night-price-input');
    if (nightInputs.length > 0) {
      const pricePerNight = newTotalPrice / nightCount;
      nightInputs.forEach(input => {
        input.value = pricePerNight.toFixed(2);
      });
    }
    
    // Recalculate breakdown
    this.calculatePricingBreakdown(reservation);
    
    console.log(`Category changed to ${newCategory}, new price: ${newTotalPrice.toFixed(2)} â‚¬`);
  }
  
  recalculatePriceOnRateChange(reservation, newRate) {
    // Get the new rate details
    const rates = state.get('rates') || [];
    const rate = rates.find(r => r.code === newRate);
    
    if (!rate) return;
    
    // Get the current category
    const categories = state.get('categories') || [];
    const category = categories.find(c => c.code === reservation.category);
    
    if (!category) return;
    
    // Calculate new base price
    const basePrice = parseFloat(category.base_price) || 0;
    const rateMultiplier = parseFloat(rate.price_multiplier) || 1.0;
    const nightCount = this.calculateNights(reservation.arrival, reservation.departure);
    
    const newTotalPrice = basePrice * rateMultiplier * nightCount;
    
    // Update the reservation
    reservation.total_price = newTotalPrice;
    
    // Update night price inputs if they exist
    const nightInputs = document.querySelectorAll('.night-price-input');
    if (nightInputs.length > 0) {
      const pricePerNight = newTotalPrice / nightCount;
      nightInputs.forEach(input => {
        input.value = pricePerNight.toFixed(2);
      });
    }
    
    // Recalculate breakdown
    this.calculatePricingBreakdown(reservation);
    
    console.log(`Rate changed to ${newRate}, new price: ${newTotalPrice.toFixed(2)} â‚¬`);
  }
  
  calculateNights(arrival, departure) {
    if (!arrival || !departure) return 0;
    const arrivalDate = new Date(arrival);
    const departureDate = new Date(departure);
    const diffTime = Math.abs(departureDate - arrivalDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  
  loadReservationTracesModern(reservation) {
    const container = document.getElementById('tracesListModern');
    const emptyState = document.getElementById('tracesEmpty');
    
    if (!container || !emptyState) return;
    
    // In real app, fetch traces from database
    // For now, create example traces (alerts/reminders, not system logs)
    const traces = reservation.traces || [];
    
    if (traces.length === 0) {
      container.style.display = 'none';
      emptyState.classList.remove('hidden');
      return;
    }
    
    container.style.display = 'flex';
    emptyState.classList.add('hidden');
    
    container.innerHTML = traces.map(trace => {
      const typeIcons = {
        'reminder': 'fa-bell',
        'alert': 'fa-exclamation-triangle',
        'note': 'fa-sticky-note',
        'request': 'fa-star'
      };
      
      const typeColors = {
        'reminder': 'primary',
        'alert': 'error',
        'note': 'success',
        'request': 'warning'
      };
      
      return `
        <div class="trace-card trace-${trace.type || 'note'}">
          <div class="trace-header-row">
            <span class="trace-type-badge">
              <i class="fas ${typeIcons[trace.type] || 'fa-sticky-note'}"></i>
              ${trace.type || 'note'}
            </span>
            <span class="trace-datetime">${trace.datetime || 'Kein Datum'}</span>
          </div>
          <div class="trace-message">${trace.message || 'Keine Nachricht'}</div>
          <div class="trace-actions">
            <button class="trace-btn" data-action="edit-trace" data-trace-id="${trace.id}">
              <i class="fas fa-edit"></i> Bearbeiten
            </button>
            <button class="trace-btn" data-action="delete-trace" data-trace-id="${trace.id}">
              <i class="fas fa-trash"></i> LÃƒÂ¶schen
            </button>
            ${trace.type === 'reminder' ? `
              <button class="trace-btn" data-action="complete-trace" data-trace-id="${trace.id}">
                <i class="fas fa-check"></i> Erledigt
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
  
  initEditModalTabsModern() {
    const modal = document.getElementById('modalEditReservation');
    if (!modal) return;
    
    const tabButtons = modal.querySelectorAll('.tab-btn');
    const tabPanels = modal.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;
        
        // Remove active class from all
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanels.forEach(panel => panel.classList.remove('active'));
        
        // Add active class to clicked
        button.classList.add('active');
        const targetPanel = modal.querySelector(`[data-tab-panel="${targetTab}"]`);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }
      });
    });
  }
  
  openAddTraceModal() {
    if (!this.currentEditReservation) {
      this.ui.showToast('Keine Reservierung ausgewÃƒÂ¤hlt', 'error');
      return;
    }
    
    // Set default datetime to now
    const datetimeInput = document.querySelector('#formAddTrace [name="trace_datetime"]');
    if (datetimeInput) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      datetimeInput.value = now.toISOString().slice(0, 16);
    }
    
    // Setup form submit handler
    const form = document.getElementById('formAddTrace');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        this.handleAddTrace(form);
      };
    }
    
    this.ui.openModal('modalAddTrace');
  }
  
  async handleAddTrace(form) {
    const formData = new FormData(form);
    const traceData = {
      type: formData.get('trace_type'),
      datetime: formData.get('trace_datetime'),
      message: formData.get('trace_message'),
      reservation_id: this.currentEditReservation.id,
      created_at: new Date().toISOString(),
      created_by: state.get('user')?.email || 'System'
    };
    
    try {
      // In real app, save to database
      // For now, add to current reservation
      if (!this.currentEditReservation.traces) {
        this.currentEditReservation.traces = [];
      }
      
      traceData.id = Date.now(); // Simple ID for demo
      this.currentEditReservation.traces.push(traceData);
      
      // Update local state
      const reservations = state.get('reservations') || [];
      const index = reservations.findIndex(r => r.id === this.currentEditReservation.id);
      if (index !== -1) {
        reservations[index].traces = this.currentEditReservation.traces;
        state.set('reservations', reservations);
      }
      
      // Reload traces in edit modal
      this.loadReservationTracesModern(this.currentEditReservation);
      
      // Close add trace modal
      this.ui.closeModal('modalAddTrace');
      form.reset();
      
      this.ui.showToast('Trace erfolgreich hinzugefÃƒÂ¼gt', 'success');
    } catch (error) {
      console.error('Failed to add trace:', error);
      this.ui.showToast('Fehler beim HinzufÃƒÂ¼gen des Trace', 'error');
    }
  }

  loadHotelsForEditSelect() {
    const select = document.querySelector('#modalEditReservation .hotel-select');
    if (!select) return;
    
    const hotels = state.get('hotels') || [];
    
    // Clear existing options except first
    while (select.options.length > 1) {
      select.remove(1);
    }
    
    // Add hotel options
    hotels.forEach(hotel => {
      const option = document.createElement('option');
      option.value = hotel.code;
      option.textContent = `${hotel.name} (${hotel.code})`;
      select.appendChild(option);
    });
  }

  initEditModalTabs() {
    const modal = document.getElementById('modalEditReservation');
    if (!modal) return;
    
    const tabButtons = modal.querySelectorAll('.tab-button');
    const tabPanes = modal.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;
        
        // Remove active class from all buttons and panes
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.add('hidden'));
        
        // Add active class to clicked button and corresponding pane
        button.classList.add('active');
        const targetPane = modal.querySelector(`[data-tab-content="${targetTab}"]`);
        if (targetPane) {
          targetPane.classList.remove('hidden');
        }
      });
    });
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
    
    // Convert id to number if it's a string number
    const numId = isNaN(id) ? id : Number(id);
    
    const reservations = state.get('reservations') || [];
    // Try to find by both string and number comparison
    const reservation = reservations.find(r => r.id === id || r.id === numId);
    
    if (reservation) {
      this.openEditReservationModal(reservation);
    } else {
      console.error('Reservation not found. ID:', id, 'Available IDs:', reservations.map(r => r.id));
      this.ui.showToast('Reservierung nicht gefunden', 'error');
    }
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
    if (!amount && amount !== 0) return '0 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬';
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
          <p style="margin-top: 1rem;">Keine AktivitÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ten</p>
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
          <div class="activity-meta">${r.reservation_number} ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· ${this.formatDate(r.created_at)}</div>
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
          <div class="yoy-item-meta">${perf.todayBookings} heute ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· ${perf.lastYearBookings} letztes Jahr</div>
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
    // Add logout parameter to prevent immediate redirect back to dashboard
    window.location.replace('/auth.html?logout=true');
  }

  async logout() {
    if (confirm('MÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¶chten Sie sich wirklich abmelden?')) {
      console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ App logout initiated...');
      
      // Use the proper auth logout function if available
      if (window.HRS_AUTH && typeof window.HRS_AUTH.logout === 'function') {
        console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Using HRS_AUTH.logout()');
        await window.HRS_AUTH.logout();
      } else {
        // Fallback: Manual logout
        console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â Fallback logout (HRS_AUTH not available)');
        Storage.remove('USER_SESSION');
        localStorage.removeItem('hrs_v2_session');
        localStorage.removeItem('hrs_v2_login_attempts');
        sessionStorage.clear();
        
        // CRITICAL: Add logout parameter to prevent immediate redirect back
        window.location.replace('/auth.html?logout=true');
      }
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

  async handleSendConfirmationEmail(reservation) {
    try {
      const emailTo = document.getElementById('confirmEmailTo').value;
      const emailSubject = document.getElementById('confirmEmailSubject').value;
      const emailBody = document.getElementById('confirmEmailBody').value;
      
      if (!emailTo) {
        this.ui.showToast('Bitte geben Sie eine E-Mail-Adresse ein', 'error');
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTo)) {
        this.ui.showToast('Bitte geben Sie eine gÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼ltige E-Mail-Adresse ein', 'error');
        return;
      }
      
      // Send confirmation email
      await this.sendConfirmationEmail({
        to: emailTo,
        subject: emailSubject,
        body: emailBody,
        reservation: reservation
      });
      
      // Close modal
      this.ui.closeModal('modalConfirmationEmail');
      
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
      this.ui.showToast('Fehler beim Senden der E-Mail: ' + error.message, 'error');
    }
  }

  async sendConfirmationEmail(data) {
    try {
      // In a production environment, this would call an email API
      // For now, we'll simulate sending an email
      console.log('Sending confirmation email:', data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.ui.showToast(`BestÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤tigungs-E-Mail erfolgreich an ${data.to} gesendet!`, 'success');
      
      // Here you would integrate with your email service:
      // - SendGrid
      // - Mailgun
      // - AWS SES
      // - Or your custom email API
      
      return true;
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
      throw error;
    }
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
    
    this.ui.showToast(`${inhouseReservations.length} GÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ste im Haus`, 'info');
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

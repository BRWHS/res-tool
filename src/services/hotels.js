/**
 * Hotels Service
 * Manages hotel data and configurations
 */

import { EventBus } from '../core/eventBus.js';

class HotelsService {
  constructor() {
    this.hotels = [];
    this.categories = new Map();
    this.rates = new Map();
    this.initialized = false;
  }

  /**
   * Initialize with data from localStorage or defaults
   */
  async initialize() {
    if (this.initialized) return;

    // Load from localStorage
    this.loadFromStorage();

    // If no hotels, create defaults
    if (this.hotels.length === 0) {
      this.createDefaults();
    }

    this.initialized = true;
    EventBus.emit('hotels:initialized', this.hotels);
  }

  /**
   * Load data from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('restool_hotels');
      if (stored) {
        const data = JSON.parse(stored);
        this.hotels = data.hotels || [];
        
        // Rebuild maps
        data.categories?.forEach(cat => {
          this.categories.set(cat.id, cat);
        });
        
        data.rates?.forEach(rate => {
          this.rates.set(rate.id, rate);
        });
      }
    } catch (error) {
      console.error('Error loading hotels from storage:', error);
    }
  }

  /**
   * Save data to localStorage
   */
  saveToStorage() {
    try {
      const data = {
        hotels: this.hotels,
        categories: Array.from(this.categories.values()),
        rates: Array.from(this.rates.values())
      };
      localStorage.setItem('restool_hotels', JSON.stringify(data));
      EventBus.emit('hotels:saved');
    } catch (error) {
      console.error('Error saving hotels to storage:', error);
    }
  }

  /**
   * Create default hotels and categories
   */
  createDefaults() {
    // Default hotels
    this.hotels = [
      {
        id: 'hotel-1',
        name: 'Grand Hotel Berlin',
        code: 'GHB',
        rooms: 120,
        address: 'Unter den Linden 1, 10117 Berlin',
        active: true
      },
      {
        id: 'hotel-2',
        name: 'City Hotel München',
        code: 'CHM',
        rooms: 80,
        address: 'Marienplatz 5, 80331 München',
        active: true
      }
    ];

    // Default categories
    const defaultCategories = [
      {
        id: 'cat-standard',
        name: 'Standard',
        description: 'Komfortables Standardzimmer mit allen Annehmlichkeiten',
        basePrice: 89,
        size: 22,
        capacity: 2
      },
      {
        id: 'cat-superior',
        name: 'Superior',
        description: 'Geräumiges Superior-Zimmer mit erhöhtem Komfort',
        basePrice: 129,
        size: 28,
        capacity: 2
      },
      {
        id: 'cat-deluxe',
        name: 'Deluxe',
        description: 'Luxuriöses Deluxe-Zimmer mit Premium-Ausstattung',
        basePrice: 189,
        size: 35,
        capacity: 3
      },
      {
        id: 'cat-suite',
        name: 'Suite',
        description: 'Exklusive Suite mit separatem Wohnbereich',
        basePrice: 299,
        size: 50,
        capacity: 4
      }
    ];

    defaultCategories.forEach(cat => {
      this.categories.set(cat.id, cat);
    });

    // Default rates
    const defaultRates = [
      {
        id: 'rate-standard',
        name: 'Standardrate',
        type: 'standard',
        description: 'Flexible Buchung mit kostenfreier Stornierung',
        cancellationPolicy: 'Kostenfreie Stornierung bis 24h vor Anreise',
        categories: ['cat-standard', 'cat-superior', 'cat-deluxe', 'cat-suite'],
        multiplier: 1.0
      },
      {
        id: 'rate-nonrefundable',
        name: 'Non-Refundable',
        type: 'special',
        description: 'Nicht stornierbar, 15% günstiger',
        cancellationPolicy: 'Keine Stornierung möglich',
        categories: ['cat-standard', 'cat-superior', 'cat-deluxe', 'cat-suite'],
        multiplier: 0.85
      },
      {
        id: 'rate-breakfast',
        name: 'Mit Frühstück',
        type: 'package',
        description: 'Inkl. reichhaltigem Frühstücksbuffet',
        cancellationPolicy: 'Kostenfreie Stornierung bis 24h vor Anreise',
        categories: ['cat-standard', 'cat-superior', 'cat-deluxe', 'cat-suite'],
        multiplier: 1.15,
        extras: ['Frühstücksbuffet']
      }
    ];

    defaultRates.forEach(rate => {
      this.rates.set(rate.id, rate);
    });

    this.saveToStorage();
  }

  /**
   * Get all hotels
   */
  getAll() {
    return this.hotels;
  }

  /**
   * Get active hotels
   */
  getActive() {
    return this.hotels.filter(h => h.active);
  }

  /**
   * Get hotel by ID
   */
  getById(id) {
    return this.hotels.find(h => h.id === id);
  }

  /**
   * Get categories
   */
  getCategories() {
    return Array.from(this.categories.values());
  }

  /**
   * Get category by ID
   */
  getCategoryById(id) {
    return this.categories.get(id);
  }

  /**
   * Get rates
   */
  getRates() {
    return Array.from(this.rates.values());
  }

  /**
   * Get rate by ID
   */
  getRateById(id) {
    return this.rates.get(id);
  }

  /**
   * Get rates for a specific category
   */
  getRatesForCategory(categoryId) {
    return this.getRates().filter(rate => 
      rate.categories.includes(categoryId)
    );
  }

  /**
   * Calculate price for category and rate
   */
  calculatePrice(categoryId, rateId = 'rate-standard') {
    const category = this.getCategoryById(categoryId);
    const rate = this.getRateById(rateId);

    if (!category || !rate) return 0;

    return Math.round(category.basePrice * rate.multiplier);
  }

  /**
   * Add new hotel
   */
  addHotel(hotelData) {
    const hotel = {
      id: 'hotel-' + Date.now(),
      ...hotelData,
      active: true
    };

    this.hotels.push(hotel);
    this.saveToStorage();
    EventBus.emit('hotels:added', hotel);

    return hotel;
  }

  /**
   * Update hotel
   */
  updateHotel(id, updates) {
    const index = this.hotels.findIndex(h => h.id === id);
    if (index === -1) return null;

    this.hotels[index] = { ...this.hotels[index], ...updates };
    this.saveToStorage();
    EventBus.emit('hotels:updated', this.hotels[index]);

    return this.hotels[index];
  }

  /**
   * Delete hotel
   */
  deleteHotel(id) {
    const index = this.hotels.findIndex(h => h.id === id);
    if (index === -1) return false;

    this.hotels.splice(index, 1);
    this.saveToStorage();
    EventBus.emit('hotels:deleted', id);

    return true;
  }

  /**
   * Add category
   */
  addCategory(categoryData) {
    const category = {
      id: 'cat-' + Date.now(),
      ...categoryData
    };

    this.categories.set(category.id, category);
    this.saveToStorage();
    EventBus.emit('categories:added', category);

    return category;
  }

  /**
   * Update category
   */
  updateCategory(id, updates) {
    const category = this.categories.get(id);
    if (!category) return null;

    const updated = { ...category, ...updates };
    this.categories.set(id, updated);
    this.saveToStorage();
    EventBus.emit('categories:updated', updated);

    return updated;
  }

  /**
   * Delete category
   */
  deleteCategory(id) {
    if (!this.categories.has(id)) return false;

    this.categories.delete(id);
    this.saveToStorage();
    EventBus.emit('categories:deleted', id);

    return true;
  }

  /**
   * Add rate
   */
  addRate(rateData) {
    const rate = {
      id: 'rate-' + Date.now(),
      ...rateData
    };

    this.rates.set(rate.id, rate);
    this.saveToStorage();
    EventBus.emit('rates:added', rate);

    return rate;
  }

  /**
   * Update rate
   */
  updateRate(id, updates) {
    const rate = this.rates.get(id);
    if (!rate) return null;

    const updated = { ...rate, ...updates };
    this.rates.set(id, updated);
    this.saveToStorage();
    EventBus.emit('rates:updated', updated);

    return updated;
  }

  /**
   * Delete rate
   */
  deleteRate(id) {
    if (!this.rates.has(id)) return false;

    this.rates.delete(id);
    this.saveToStorage();
    EventBus.emit('rates:deleted', id);

    return true;
  }
}

export const Hotels = new HotelsService();
export default Hotels;

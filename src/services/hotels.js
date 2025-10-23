/**
 * Hotels Service - V1 Compatible
 * Manages hotel data and configurations using V1 structure
 */

import { EventBus } from '../core/eventBus.js';

class HotelsService {
  constructor() {
    this.hotels = [];
    this.categories = [];
    this.rates = [];
    this.initialized = false;
  }

  /**
   * Initialize with V1 hotel data
   */
  async initialize() {
    if (this.initialized) return;

    // V1 Hotels (from your working version)
    this.hotels = [
      { group: 'MASEVEN', name: 'MASEVEN München Dornach', code: 'MA7-M-DOR' },
      { group: 'MASEVEN', name: 'MASEVEN München Trudering', code: 'MA7-M-TRU' },
      { group: 'MASEVEN', name: 'MASEVEN Frankfurt', code: 'MA7-FRA' },
      { group: 'MASEVEN', name: 'MASEVEN Stuttgart', code: 'MA7-STR' },
      { group: 'Fidelity', name: 'Fidelity Robenstein', code: 'FID-ROB' },
      { group: 'Fidelity', name: 'Fidelity Struck', code: 'FID-STR' },
      { group: 'Fidelity', name: 'Fidelity Doerr', code: 'FID-DOE' },
      { group: 'Fidelity', name: 'Fidelity Gr. Baum', code: 'FID-GRB' },
      { group: 'Fidelity', name: 'Fidelity Landskron', code: 'FID-LAN' },
      { group: 'Fidelity', name: 'Fidelity Pürgl', code: 'FID-PUE' },
      { group: 'Fidelity', name: 'Fidelity Seppl', code: 'FID-SEP' },
      { group: 'Tante Alma', name: 'Tante Alma Bonn', code: 'TAL-BON' },
      { group: 'Tante Alma', name: 'Tante Alma Köln', code: 'TAL-KOE' },
      { group: 'Tante Alma', name: 'Tante Alma Erfurt', code: 'TAL-ERF' },
      { group: 'Tante Alma', name: 'Tante Alma Mannheim', code: 'TAL-MAN' },
      { group: 'Tante Alma', name: 'Tante Alma Mülheim', code: 'TAL-MUE' },
      { group: 'Tante Alma', name: 'Tante Alma Sonnen', code: 'TAL-SON' },
      { group: 'Delta by Marriot', name: 'Delta by Marriot Offenbach', code: 'DBM-OF' },
      { group: 'Villa Viva', name: 'Villa Viva Hamburg', code: 'VV-HH' }
    ];

    // V1 Categories
    this.categories = [
      { 
        name: 'Standard',
        size: '18–22 m²',
        beds: 'Queen (160)',
        note: 'Komfortabel, ruhig'
      },
      { 
        name: 'Superior',
        size: '22–28 m²',
        beds: 'King (180)/Twin',
        note: 'Mehr Platz, Sitzecke'
      },
      { 
        name: 'Suite',
        size: '35–45 m²',
        beds: 'King (180)',
        note: 'Separater Wohnbereich'
      }
    ];

    // V1 Rates
    this.rates = [
      { name: 'Flex exkl. Frühstück', price: 89 },
      { name: 'Flex inkl. Frühstück', price: 109 },
      { name: 'Non-Refundable', price: 79 },
      { name: 'Business Rate', price: 129 }
    ];

    this.initialized = true;
    EventBus.emit('hotels:initialized', this.hotels);
  }

  /**
   * Get all hotels
   */
  getAll() {
    return this.hotels;
  }

  /**
   * Get hotel by code
   */
  getByCode(code) {
    return this.hotels.find(h => h.code === code);
  }

  /**
   * Get display name for hotel (V1 format: "Group - City")
   */
  getDisplayName(hotel) {
    if (!hotel) return '—';
    
    const brandPrefixes = ['MASEVEN', 'Fidelity', 'Tante Alma', 'Delta by Marriot', 'Villa Viva'];
    let city = hotel.name;
    
    for (const prefix of brandPrefixes) {
      if (city.startsWith(prefix + ' ')) {
        city = city.slice(prefix.length + 1);
        break;
      }
    }
    
    return `${hotel.group} - ${city}`;
  }

  /**
   * Get categories
   */
  getCategories() {
    return this.categories;
  }

  /**
   * Get category by name
   */
  getCategoryByName(name) {
    return this.categories.find(c => c.name === name);
  }

  /**
   * Get rates
   */
  getRates() {
    return this.rates;
  }

  /**
   * Get rate by name
   */
  getRateByName(name) {
    return this.rates.find(r => r.name === name);
  }

  /**
   * Get rates for hotel (all for now, can be customized per hotel)
   */
  getRatesForHotel(hotelCode) {
    return this.rates;
  }

  /**
   * Group hotels by group
   */
  getGrouped() {
    const grouped = {};
    
    this.hotels.forEach(hotel => {
      if (!grouped[hotel.group]) {
        grouped[hotel.group] = [];
      }
      grouped[hotel.group].push(hotel);
    });
    
    return grouped;
  }

  /**
   * Get unique groups
   */
  getGroups() {
    const groups = new Set(this.hotels.map(h => h.group));
    return Array.from(groups);
  }
}

export const Hotels = new HotelsService();
export default Hotels;

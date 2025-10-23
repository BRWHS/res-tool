/**
 * Reservations Service
 * Handles all reservation-related operations
 * NOW WITH LOCALSTORAGE FALLBACK!
 */

import { query, insert, update, remove, TABLES, subscribe } from '../core/supabase.js';
import { EventBus } from '../core/eventBus.js';

const STORAGE_KEY = 'restool_reservations';

class ReservationsService {
  constructor() {
    this.cache = new Map();
    this.unsubscribe = null;
    this.useLocalStorage = false;
  }

  /**
   * Initialize real-time subscriptions
   */
  initialize() {
    // Try to determine if we should use localStorage
    this.checkStorageMode();
    
    if (!this.useLocalStorage) {
      this.unsubscribe = subscribe(TABLES.RESERVATIONS, (payload) => {
        EventBus.emit('reservations:updated', payload);
        this.invalidateCache();
      });
    }
  }

  /**
   * Check if we should use localStorage (if Supabase is unavailable)
   */
  async checkStorageMode() {
    try {
      const testQuery = await query(TABLES.RESERVATIONS, { limit: 1 });
      this.useLocalStorage = !!testQuery.error;
      
      if (this.useLocalStorage) {
        console.log('[Reservations] Using localStorage fallback');
        // Initialize localStorage if empty
        if (!localStorage.getItem(STORAGE_KEY)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        }
      }
    } catch (error) {
      console.log('[Reservations] Supabase unavailable, using localStorage');
      this.useLocalStorage = true;
      if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      }
    }
  }

  /**
   * Get all reservations from localStorage
   */
  getFromLocalStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return JSON.parse(data) || [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  }

  /**
   * Save to localStorage
   */
  saveToLocalStorage(reservations) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
      EventBus.emit('reservations:updated');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  /**
   * Get all reservations with optional filters
   */
  async getAll(filters = {}) {
    // LocalStorage mode
    if (this.useLocalStorage) {
      let reservations = this.getFromLocalStorage();
      
      // Apply filters
      if (filters.hotel) {
        reservations = reservations.filter(r => r.hotel === filters.hotel);
      }
      if (filters.status) {
        reservations = reservations.filter(r => r.status === filters.status);
      }
      
      // Sort by created_at desc
      reservations.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
      
      return { data: reservations, error: null };
    }

    // Supabase mode
    const cacheKey = JSON.stringify(filters);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const options = {
      order: { column: 'created_at', ascending: false }
    };

    if (filters.hotel) {
      options.filters = { hotel: filters.hotel };
    }

    if (filters.status) {
      options.filters = { ...options.filters, status: filters.status };
    }

    if (filters.dateFrom || filters.dateTo) {
      // Custom date filtering would go here
    }

    const result = await query(TABLES.RESERVATIONS, options);
    
    if (result.data) {
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Get reservation by ID
   */
  async getById(id) {
    if (this.useLocalStorage) {
      const reservations = this.getFromLocalStorage();
      return reservations.find(r => r.id === id) || null;
    }

    const result = await query(TABLES.RESERVATIONS, {
      filters: { id },
      limit: 1
    });

    return result.data?.[0] || null;
  }

  /**
   * Get reservations for a specific date range
   */
  async getByDateRange(startDate, endDate, hotelId = null) {
    if (this.useLocalStorage) {
      let reservations = this.getFromLocalStorage();
      
      reservations = reservations.filter(r => {
        const checkin = r.checkin;
        const checkout = r.checkout;
        return checkin >= startDate && checkout <= endDate;
      });
      
      if (hotelId) {
        reservations = reservations.filter(r => r.hotel === hotelId);
      }
      
      return { data: reservations, error: null };
    }

    try {
      let query = `
        checkin >= '${startDate}' 
        AND checkout <= '${endDate}'
      `;

      if (hotelId) {
        query += ` AND hotel = '${hotelId}'`;
      }

      const { data, error } = await window.supabase
        .from(TABLES.RESERVATIONS)
        .select('*')
        .or(query)
        .order('checkin', { ascending: true });

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Create new reservation
   */
  async create(reservationData) {
    try {
      // Validate required fields
      const required = ['hotel', 'category', 'checkin', 'checkout', 'firstname', 'lastname'];
      const missing = required.filter(field => !reservationData[field]);
      
      if (missing.length > 0) {
        throw new Error(`Pflichtfelder fehlen: ${missing.join(', ')}`);
      }

      // Calculate nights and total
      const checkin = new Date(reservationData.checkin);
      const checkout = new Date(reservationData.checkout);
      const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));

      const data = {
        id: 'res-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        ...reservationData,
        nights,
        total: (reservationData.price || 0) * nights,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // LocalStorage mode
      if (this.useLocalStorage) {
        const reservations = this.getFromLocalStorage();
        reservations.push(data);
        this.saveToLocalStorage(reservations);
        
        EventBus.emit('reservations:created', data);
        this.invalidateCache();
        
        return { data: [data], error: null };
      }

      // Supabase mode
      const result = await insert(TABLES.RESERVATIONS, data);
      
      if (result.error) throw result.error;

      EventBus.emit('reservations:created', result.data[0]);
      this.invalidateCache();

      return result;
    } catch (error) {
      console.error('Create reservation error:', error);
      return { data: null, error };
    }
  }

  /**
   * Update existing reservation
   */
  async update(id, updates) {
    try {
      // LocalStorage mode
      if (this.useLocalStorage) {
        const reservations = this.getFromLocalStorage();
        const index = reservations.findIndex(r => r.id === id);
        
        if (index === -1) throw new Error('Reservation not found');
        
        const current = reservations[index];
        
        // Recalculate if dates or price changed
        if (updates.checkin || updates.checkout || updates.price) {
          const checkin = new Date(updates.checkin || current.checkin);
          const checkout = new Date(updates.checkout || current.checkout);
          const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
          const price = updates.price || current.price || 0;

          updates.nights = nights;
          updates.total = price * nights;
        }

        updates.updated_at = new Date().toISOString();
        
        reservations[index] = { ...current, ...updates };
        this.saveToLocalStorage(reservations);
        
        EventBus.emit('reservations:updated', reservations[index]);
        this.invalidateCache();
        
        return { data: [reservations[index]], error: null };
      }

      // Supabase mode
      const current = await this.getById(id);
      if (!current) throw new Error('Reservation not found');

      // Recalculate if dates or price changed
      if (updates.checkin || updates.checkout || updates.price) {
        const checkin = new Date(updates.checkin || current.checkin);
        const checkout = new Date(updates.checkout || current.checkout);
        const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
        const price = updates.price || current.price || 0;

        updates.nights = nights;
        updates.total = price * nights;
      }

      updates.updated_at = new Date().toISOString();

      const result = await update(TABLES.RESERVATIONS, id, updates);
      
      if (result.error) throw result.error;

      EventBus.emit('reservations:updated', result.data[0]);
      this.invalidateCache();

      return result;
    } catch (error) {
      console.error('Update reservation error:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete reservation
   */
  async delete(id) {
    if (this.useLocalStorage) {
      const reservations = this.getFromLocalStorage();
      const filtered = reservations.filter(r => r.id !== id);
      this.saveToLocalStorage(filtered);
      
      EventBus.emit('reservations:deleted', id);
      this.invalidateCache();
      
      return { error: null };
    }

    const result = await remove(TABLES.RESERVATIONS, id);
    
    if (!result.error) {
      EventBus.emit('reservations:deleted', id);
      this.invalidateCache();
    }

    return result;
  }

  /**
   * Cancel reservation (soft delete)
   */
  async cancel(id) {
    return this.update(id, { 
      status: 'canceled',
      canceled_at: new Date().toISOString()
    });
  }

  /**
   * Search reservations
   */
  async search(query) {
    if (this.useLocalStorage) {
      const searchTerm = query.toLowerCase();
      let reservations = this.getFromLocalStorage();
      
      reservations = reservations.filter(r => {
        const searchFields = [
          r.firstname,
          r.lastname,
          r.email,
          r.phone
        ].map(f => (f || '').toLowerCase());
        
        return searchFields.some(field => field.includes(searchTerm));
      });
      
      return { data: reservations, error: null };
    }

    try {
      const searchTerm = query.toLowerCase();
      
      const { data, error } = await window.supabase
        .from(TABLES.RESERVATIONS)
        .select('*')
        .or(
          `firstname.ilike.%${searchTerm}%,` +
          `lastname.ilike.%${searchTerm}%,` +
          `email.ilike.%${searchTerm}%,` +
          `phone.ilike.%${searchTerm}%`
        )
        .order('created_at', { ascending: false })
        .limit(50);

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Get statistics for a date range
   */
  async getStats(startDate, endDate, hotelId = null) {
    try {
      const { data } = await this.getByDateRange(startDate, endDate, hotelId);
      
      if (!data) return null;

      const stats = {
        totalReservations: data.length,
        totalRevenue: data.reduce((sum, r) => sum + (r.total || 0), 0),
        totalNights: data.reduce((sum, r) => sum + (r.nights || 0), 0),
        averagePrice: 0,
        statusBreakdown: {
          active: data.filter(r => r.status === 'active').length,
          completed: data.filter(r => r.status === 'completed').length,
          canceled: data.filter(r => r.status === 'canceled').length
        }
      };

      stats.averagePrice = stats.totalNights > 0 
        ? stats.totalRevenue / stats.totalNights 
        : 0;

      return stats;
    } catch (error) {
      console.error('Get stats error:', error);
      return null;
    }
  }

  /**
   * Get today's arrivals
   */
  async getTodayArrivals(hotelId = null) {
    const today = new Date().toISOString().split('T')[0];
    return this.getByDateRange(today, today, hotelId);
  }

  /**
   * Get today's departures
   */
  async getTodayDepartures(hotelId = null) {
    const today = new Date().toISOString().split('T')[0];
    
    if (this.useLocalStorage) {
      let reservations = this.getFromLocalStorage();
      
      reservations = reservations.filter(r => {
        const checkout = r.checkout?.split('T')[0];
        return checkout === today;
      });
      
      if (hotelId) {
        reservations = reservations.filter(r => r.hotel === hotelId);
      }
      
      return { data: reservations, error: null };
    }

    try {
      let query = window.supabase
        .from(TABLES.RESERVATIONS)
        .select('*')
        .eq('checkout', today);

      if (hotelId) {
        query = query.eq('hotel', hotelId);
      }

      return await query.order('checkout', { ascending: true });
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Invalidate cache
   */
  invalidateCache() {
    this.cache.clear();
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.cache.clear();
  }
}

export const Reservations = new ReservationsService();
export default Reservations;

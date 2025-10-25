/**
 * Reservations Service
 * Handles all reservation-related operations
 */

import { query, insert, update, remove, TABLES, subscribe } from '../core/supabase.js';
import { EventBus } from '../core/eventBus.js';

class ReservationsService {
  constructor() {
    this.cache = new Map();
    this.unsubscribe = null;
  }

  /**
   * Initialize real-time subscriptions
   */
  initialize() {
    this.unsubscribe = subscribe(TABLES.RESERVATIONS, (payload) => {
      EventBus.emit('reservations:updated', payload);
      this.invalidateCache();
    });
  }

  /**
   * Get all reservations with optional filters
   */
  async getAll(filters = {}) {
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
        ...reservationData,
        nights,
        total: (reservationData.price || 0) * nights,
        status: 'active',
        created_at: new Date().toISOString()
      };

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
      // Recalculate if dates or price changed
      if (updates.checkin || updates.checkout || updates.price) {
        const current = await this.getById(id);
        if (!current) throw new Error('Reservation not found');

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

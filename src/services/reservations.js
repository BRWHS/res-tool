/**
 * Reservations Service - V1 Schema Compatible
 * Handles all reservation-related operations using the correct V1 database schema
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
    try {
      this.unsubscribe = subscribe(TABLES.RESERVATIONS, (payload) => {
        EventBus.emit('reservations:updated', payload);
        this.invalidateCache();
      });
    } catch (error) {
      console.warn('Real-time subscription failed:', error);
    }
  }

  /**
   * Generate reservation number like V1
   */
  generateReservationNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return `RES-${year}${month}${day}-${rand}`;
  }

  /**
   * Get all reservations with filters (V1 compatible)
   */
  async getAll(filters = {}) {
    try {
      const selectCols = 'id,reservation_number,guest_first_name,guest_last_name,arrival,departure,hotel_name,hotel_code,category,rate_name,rate_price,status,created_at,guests,guests_adults,guests_children';
      
      let q = window.supabase
        .from(TABLES.RESERVATIONS)
        .select(selectCols, { count: 'exact' })
        .order('arrival', { ascending: true });

      // Apply filters
      if (filters.hotel_code) {
        q = q.eq('hotel_code', filters.hotel_code);
      }
      
      if (filters.status === 'active') {
        const today = new Date().toISOString().split('T')[0];
        q = q.gte('arrival', today).neq('status', 'canceled');
      } else if (filters.status === 'done') {
        const today = new Date().toISOString().split('T')[0];
        q = q.lt('arrival', today).neq('status', 'canceled');
      } else if (filters.status === 'canceled') {
        q = q.eq('status', 'canceled');
      }

      if (filters.search) {
        q = q.ilike('guest_last_name', `%${filters.search}%`);
      }

      const { data, error, count } = await q;

      if (error) throw error;

      return { data: data || [], error: null, count: count || 0 };
    } catch (error) {
      console.error('Get all reservations error:', error);
      return { data: [], error, count: 0 };
    }
  }

  /**
   * Get reservation by ID
   */
  async getById(id) {
    try {
      const { data, error } = await window.supabase
        .from(TABLES.RESERVATIONS)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get by ID error:', error);
      return null;
    }
  }

  /**
   * Create new reservation (V1 schema)
   */
  async create(reservationData) {
    try {
      // Validate required fields
      const required = ['hotel_code', 'arrival', 'departure', 'guest_first_name', 'guest_last_name', 'category', 'rate_name'];
      const missing = required.filter(field => !reservationData[field]);
      
      if (missing.length > 0) {
        throw new Error(`Pflichtfelder fehlen: ${missing.join(', ')}`);
      }

      // Calculate nights
      const arrivalDate = new Date(reservationData.arrival);
      const departureDate = new Date(reservationData.departure);
      const nights = Math.ceil((departureDate - arrivalDate) / (1000 * 60 * 60 * 24));

      // Build payload with V1 schema
      const payload = {
        reservation_number: this.generateReservationNumber(),
        status: 'active',
        
        // Hotel info
        hotel_code: reservationData.hotel_code,
        hotel_name: reservationData.hotel_name,
        
        // Dates
        arrival: reservationData.arrival,
        departure: reservationData.departure,
        
        // Guests
        guests: (reservationData.guests_adults || 1) + (reservationData.guests_children || 0),
        guests_adults: reservationData.guests_adults || 1,
        guests_children: reservationData.guests_children || 0,
        
        // Room & Rate
        category: reservationData.category,
        rate_name: reservationData.rate_name,
        rate_price: Number(reservationData.rate_price) || 0,
        
        // Guest details
        guest_first_name: reservationData.guest_first_name,
        guest_last_name: reservationData.guest_last_name,
        guest_email: reservationData.guest_email || null,
        guest_phone: reservationData.guest_phone || null,
        guest_street: reservationData.guest_street || null,
        guest_postal_code: reservationData.guest_postal_code || null,
        guest_city: reservationData.guest_city || null,
        
        // Company info (optional)
        company_name: reservationData.company_name || null,
        company_vat: reservationData.company_vat || null,
        company_postal_code: reservationData.company_postal_code || null,
        company_address: reservationData.company_address || null,
        
        // Channel & Notes
        channel: reservationData.channel || 'Direct',
        notes: reservationData.notes || null,
        
        // Timestamps
        created_at: new Date().toISOString()
      };

      const { data, error } = await window.supabase
        .from(TABLES.RESERVATIONS)
        .insert(payload)
        .select();

      if (error) throw error;

      EventBus.emit('reservations:created', data[0]);
      this.invalidateCache();

      return { data, error: null };
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
      const payload = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await window.supabase
        .from(TABLES.RESERVATIONS)
        .update(payload)
        .eq('id', id)
        .select();

      if (error) throw error;

      EventBus.emit('reservations:updated', data[0]);
      this.invalidateCache();

      return { data, error: null };
    } catch (error) {
      console.error('Update reservation error:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete reservation
   */
  async delete(id) {
    try {
      const { error } = await window.supabase
        .from(TABLES.RESERVATIONS)
        .delete()
        .eq('id', id);

      if (error) throw error;

      EventBus.emit('reservations:deleted', id);
      this.invalidateCache();

      return { error: null };
    } catch (error) {
      console.error('Delete reservation error:', error);
      return { error };
    }
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
  async search(searchTerm) {
    try {
      const { data, error } = await window.supabase
        .from(TABLES.RESERVATIONS)
        .select('*')
        .or(
          `guest_first_name.ilike.%${searchTerm}%,` +
          `guest_last_name.ilike.%${searchTerm}%,` +
          `guest_email.ilike.%${searchTerm}%,` +
          `reservation_number.ilike.%${searchTerm}%`
        )
        .order('arrival', { ascending: false })
        .limit(50);

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Search error:', error);
      return { data: [], error };
    }
  }

  /**
   * Get statistics for a date range
   */
  async getStats(startDate, endDate, hotelCode = null) {
    try {
      let q = window.supabase
        .from(TABLES.RESERVATIONS)
        .select('*')
        .gte('arrival', startDate)
        .lte('arrival', endDate)
        .neq('status', 'canceled');

      if (hotelCode) {
        q = q.eq('hotel_code', hotelCode);
      }

      const { data, error } = await q;

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          totalReservations: 0,
          totalRevenue: 0,
          totalNights: 0,
          averagePrice: 0
        };
      }

      // Calculate stats
      const stats = {
        totalReservations: data.length,
        totalRevenue: 0,
        totalNights: 0,
        averagePrice: 0
      };

      data.forEach(res => {
        const nights = this.calculateNights(res.arrival, res.departure);
        const price = res.rate_price || 0;
        const total = nights * price;
        
        stats.totalRevenue += total;
        stats.totalNights += nights;
      });

      stats.averagePrice = stats.totalNights > 0 
        ? stats.totalRevenue / stats.totalNights 
        : 0;

      return stats;
    } catch (error) {
      console.error('Get stats error:', error);
      return {
        totalReservations: 0,
        totalRevenue: 0,
        totalNights: 0,
        averagePrice: 0
      };
    }
  }

  /**
   * Calculate nights between dates
   */
  calculateNights(arrival, departure) {
    const start = new Date(arrival);
    const end = new Date(departure);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get today's arrivals
   */
  async getTodayArrivals(hotelCode = null) {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      let q = window.supabase
        .from(TABLES.RESERVATIONS)
        .select('*')
        .eq('arrival', today)
        .neq('status', 'canceled');

      if (hotelCode) {
        q = q.eq('hotel_code', hotelCode);
      }

      const { data, error } = await q;
      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }

  /**
   * Get today's departures
   */
  async getTodayDepartures(hotelCode = null) {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      let q = window.supabase
        .from(TABLES.RESERVATIONS)
        .select('*')
        .eq('departure', today)
        .neq('status', 'canceled');

      if (hotelCode) {
        q = q.eq('hotel_code', hotelCode);
      }

      const { data, error } = await q;
      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
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

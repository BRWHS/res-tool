/**
 * Supabase Core Module
 * Handles database connection and configuration
 */

const SUPABASE_URL = 'https://kytuiodojfcaggkvizto.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5dHVpb2RvamZjYWdna3ZpenRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzA0NjgsImV4cCI6MjA3MDQwNjQ2OH0.YobQZnCQ7LihWtewynoCJ6ZTjqetkGwh82Nd2mmmhLU';

// Initialize Supabase client
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database tables
export const TABLES = {
  RESERVATIONS: 'reservations',
  AVAILABILITY: 'availability',
  USERS: 'app_users',
  HOTELS: 'hotels',
  CATEGORIES: 'categories',
  RATES: 'rates'
};

// Check connection status
export async function checkConnection() {
  try {
    const { data, error } = await supabase
      .from(TABLES.RESERVATIONS)
      .select('count')
      .limit(1);
    
    return !error;
  } catch (err) {
    console.error('Supabase connection error:', err);
    return false;
  }
}

// Generic query helper
export async function query(table, options = {}) {
  try {
    let query = supabase.from(table).select(options.select || '*');
    
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    if (options.order) {
      query = query.order(options.order.column, { 
        ascending: options.order.ascending !== false 
      });
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.range) {
      query = query.range(options.range.from, options.range.to);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error(`Query error on ${table}:`, error);
    return { data: null, error };
  }
}

// Insert helper
export async function insert(table, data) {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select();
    
    if (error) throw error;
    return { data: result, error: null };
  } catch (error) {
    console.error(`Insert error on ${table}:`, error);
    return { data: null, error };
  }
}

// Update helper
export async function update(table, id, data) {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { data: result, error: null };
  } catch (error) {
    console.error(`Update error on ${table}:`, error);
    return { data: null, error };
  }
}

// Delete helper
export async function remove(table, id) {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error(`Delete error on ${table}:`, error);
    return { error };
  }
}

// Real-time subscription helper
export function subscribe(table, callback, filters = {}) {
  const channel = supabase
    .channel(`${table}_changes`)
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table,
        ...filters 
      },
      callback
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}

export default supabase;

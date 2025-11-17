/* =============================================
   SUPABASE REST API CLIENT - OHNE CDN!
   Direkte HTTP-Anfragen an Supabase
   Keine externe Library nötig!
   ============================================= */

class SupabaseClient {
  constructor(url, anonKey) {
    this.url = url;
    this.anonKey = anonKey;
    this.headers = {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  // SELECT query
  from(table) {
    return new SupabaseTableBuilder(this.url, table, this.headers);
  }
}

class SupabaseTableBuilder {
  constructor(url, table, headers) {
    this.url = url;
    this.table = table;
    this.headers = { ...headers };
  }

  select(columns = '*', options = {}) {
    return new SupabaseQueryBuilder(this.url, this.table, this.headers, columns, options);
  }

  insert(records) {
    return new SupabaseInsertBuilder(this.url, this.table, this.headers, records);
  }

  update(updates) {
    return new SupabaseUpdateBuilder(this.url, this.table, this.headers, [], updates);
  }
}

class SupabaseQueryBuilder {
  constructor(url, table, headers, columns = '*', options = {}) {
    this.url = url;
    this.table = table;
    this.headers = { ...headers };
    this.selectColumns = columns;
    this.filters = [];
    this.orderBy = null;
    this.limitValue = null;
    this.isCount = options.count || false;
    this.isHeadOnly = options.head || false;
    
    if (this.isCount) {
      this.headers['Prefer'] = 'count=exact';
    }
  }

  select(columns = '*', options = {}) {
    this.selectColumns = columns;
    if (options.count) {
      this.isCount = true;
      this.headers = { ...this.headers, 'Prefer': 'count=exact' };
    }
    if (options.head) {
      this.isHeadOnly = true;
    }
    // Return Promise for chaining
    return this;
  }

  eq(column, value) {
    this.filters.push(`${column}=eq.${encodeURIComponent(value)}`);
    return this;
  }

  gte(column, value) {
    this.filters.push(`${column}=gte.${encodeURIComponent(value)}`);
    return this;
  }

  lte(column, value) {
    this.filters.push(`${column}=lte.${encodeURIComponent(value)}`);
    return this;
  }

  ilike(column, value) {
    this.filters.push(`${column}=ilike.${encodeURIComponent(value)}`);
    return this;
  }

  or(query) {
    this.filters.push(`or=(${query})`);
    return this;
  }

  order(column, options = {}) {
    const direction = options.ascending ? 'asc' : 'desc';
    this.orderBy = `${column}.${direction}`;
    return this;
  }

  limit(count) {
    this.limitValue = count;
    return this;
  }

  // Make it thenable so it works with await
  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  catch(reject) {
    return this.execute().catch(reject);
  }

  async execute() {
    try {
      let url = `${this.url}/rest/v1/${this.table}`;
      
      // Add select columns
      const params = new URLSearchParams();
      params.append('select', this.selectColumns);
      
      // Add filters
      if (this.filters.length > 0) {
        this.filters.forEach(filter => {
          const [key, value] = filter.split('=');
          params.append(key, value);
        });
      }
      
      // Add order
      if (this.orderBy) {
        params.append('order', this.orderBy);
      }
      
      // Add limit
      if (this.limitValue) {
        params.append('limit', this.limitValue);
      }
      
      url += '?' + params.toString();
      
      const method = this.isHeadOnly ? 'HEAD' : 'GET';
      
      const response = await fetch(url, {
        method: method,
        headers: this.headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Supabase error: ${response.status} - ${errorText}`);
      }
      
      let data = null;
      let count = null;
      
      // Get count from header
      if (this.isCount) {
        const contentRange = response.headers.get('content-range');
        if (contentRange) {
          count = parseInt(contentRange.split('/')[1]);
        }
      }
      
      // Get data (if not HEAD)
      if (!this.isHeadOnly) {
        data = await response.json();
      }
      
      return { data, error: null, count };
    } catch (error) {
      console.error('Supabase query error:', error);
      return { data: null, error: error, count: null };
    }
  }

  // INSERT query
  async insert(records) {
    return new SupabaseInsertBuilder(this.url, this.table, this.headers, records);
  }

  // UPDATE query
  async update(updates) {
    return new SupabaseUpdateBuilder(this.url, this.table, this.headers, this.filters, updates);
  }
}

class SupabaseInsertBuilder {
  constructor(url, table, headers, records) {
    this.url = url;
    this.table = table;
    this.headers = headers;
    this.records = Array.isArray(records) ? records : [records];
    this.shouldSelect = false;
    this.shouldReturnSingle = false;
  }

  select(columns = '*') {
    this.shouldSelect = true;
    return this;
  }

  single() {
    this.shouldReturnSingle = true;
    return this;
  }

  // Make it thenable
  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  catch(reject) {
    return this.execute().catch(reject);
  }

  async execute() {
    try {
      const url = `${this.url}/rest/v1/${this.table}`;
      
      // Copy headers and ensure Prefer header is set for returning data
      const requestHeaders = { ...this.headers };
      // Supabase needs "return=representation" to return inserted data
      requestHeaders['Prefer'] = 'return=representation';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(this.records)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorObj;
        try {
          errorObj = JSON.parse(errorText);
        } catch (e) {
          errorObj = { message: errorText };
        }
        throw errorObj;
      }
      
      let data = await response.json();
      
      // Return single record if requested
      if (this.shouldReturnSingle && Array.isArray(data)) {
        data = data[0];
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Supabase insert error:', error);
      return { 
        data: null, 
        error: {
          message: error.message || 'Insert failed',
          details: error.details || '',
          hint: error.hint || '',
          code: error.code || ''
        }
      };
    }
  }
}

class SupabaseUpdateBuilder {
  constructor(url, table, headers, filters, updates) {
    this.url = url;
    this.table = table;
    this.headers = headers;
    this.filters = filters;
    this.updates = updates;
    this.shouldSelect = false;
    this.shouldReturnSingle = false;
  }

  select(columns = '*') {
    this.shouldSelect = true;
    return this;
  }

  single() {
    this.shouldReturnSingle = true;
    return this;
  }

  eq(column, value) {
    this.filters.push(`${column}=eq.${encodeURIComponent(value)}`);
    return this;
  }

  // Make it thenable
  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  catch(reject) {
    return this.execute().catch(reject);
  }

  async execute() {
    try {
      let url = `${this.url}/rest/v1/${this.table}`;
      
      // Add filters
      if (this.filters.length > 0) {
        const params = new URLSearchParams();
        this.filters.forEach(filter => {
          const [key, value] = filter.split('=');
          params.append(key, value);
        });
        url += '?' + params.toString();
      }
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify(this.updates)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Supabase error: ${response.status} - ${errorText}`);
      }
      
      let data = await response.json();
      
      // Return single record if requested
      if (this.shouldReturnSingle && Array.isArray(data)) {
        data = data[0];
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Supabase update error:', error);
      return { data: null, error: error };
    }
  }
}

// Globale Funktion für Kompatibilität
function createSupabaseClient(url, anonKey) {
  return new SupabaseClient(url, anonKey);
}

// Export für window
if (typeof window !== 'undefined') {
  window.supabase = {
    createClient: createSupabaseClient
  };
  console.log('✅ Supabase REST API Client loaded (CDN-free version)');
}

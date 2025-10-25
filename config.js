/* ================================================
   HOTEL RESERVATION SYSTEM V2.0 - CONFIGURATION
   ================================================ */

const HRS_CONFIG = {
  // =============== SYSTEM INFO ===============
  SYSTEM: {
    NAME: 'Hotel Reservation System',
    VERSION: '2.0.0',
    ENVIRONMENT: 'production', // development | staging | production
    DEBUG: false,
    LANGUAGE: 'de' // de | en
  },

  // =============== API ENDPOINTS ===============
  API: {
    // Supabase Configuration
    SUPABASE: {
      URL: 'https://ncrczhlwqwqirvdgbrfb.supabase.co',
      ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jcmN6aGx3cXdxaXJ2ZGdicmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0MTMyNDAsImV4cCI6MjA1MTk4OTI0MH0.jYNGgg6jT0-tSsWnWnWsZOW5Y-n0hHD2eI82ktl2YzA',
      TABLES: {
        RESERVATIONS: 'reservations',
        HOTELS: 'hotels',
        CATEGORIES: 'categories',
        RATES: 'rates',
        USERS: 'users',
        GROUPS: 'groups',
        AVAILABILITY: 'availability'
      }
    },

    // HotelNetSolutions Configuration
    HNS: {
      ENABLED: true,
      MODE: 'test', // test | live
      ENDPOINTS: {
        TEST: 'https://test-api.hotelnetsolutions.de/v1',
        LIVE: 'https://api.hotelnetsolutions.de/v1'
      },
      API_KEY: '', // Wird von Ihrer Chefin nach Budget-Freigabe bereitgestellt
      API_SECRET: '',
      TIMEOUT: 15000, // 15 Sekunden
      RETRY_COUNT: 3,
      RETRY_DELAY: 1000, // 1 Sekunde
      
      // Hotel Mapping (Local Code -> HNS ID)
      HOTEL_MAPPING: {
        'MA7-M-DOR': 'HNS_MA7_DOR',
        'MA7-M-HAF': 'HNS_MA7_HAF',
        'RES-HD-ALT': 'HNS_RES_ALT',
        'RES-HD-BHF': 'HNS_RES_BHF',
        'GH-KA-SUD': 'HNS_GH_SUD',
        'GH-S-MIT': 'HNS_GH_MIT',
        'BW-FR-CTR': 'HNS_BW_CTR',
        'BW-FR-FLU': 'HNS_BW_FLU',
        'UM-MUC-HBF': 'HNS_UM_HBF',
        'UM-MUC-OST': 'HNS_UM_OST'
      },
      
      // Auto-Sync Settings
      AUTO_SYNC: {
        ENABLED: false,
        INTERVAL: 5 * 60 * 1000, // 5 Minuten
        PUSH_NEW_RESERVATIONS: true,
        PULL_AVAILABILITY: true,
        PULL_RATES: false
      }
    }
  },

  // =============== HOTELS ===============
  HOTELS: [
    {
      code: 'MA7-M-DOR',
      group: 'MA7',
      name: 'Mannheim Dorfplatz',
      city: 'Mannheim',
      address: 'Dorfplatz 1, 68169 Mannheim',
      phone: '+49 621 123456',
      email: 'dorfplatz@ma7-hotels.de',
      rooms: 45,
      active: true
    },
    {
      code: 'MA7-M-HAF',
      group: 'MA7',
      name: 'Mannheim Hafen',
      city: 'Mannheim',
      address: 'Hafenstraße 12, 68159 Mannheim',
      phone: '+49 621 234567',
      email: 'hafen@ma7-hotels.de',
      rooms: 60,
      active: true
    },
    {
      code: 'RES-HD-ALT',
      group: 'RESERVIO',
      name: 'Heidelberg Altstadt',
      city: 'Heidelberg',
      address: 'Hauptstraße 50, 69117 Heidelberg',
      phone: '+49 6221 345678',
      email: 'altstadt@reservio-hotels.de',
      rooms: 35,
      active: true
    },
    {
      code: 'RES-HD-BHF',
      group: 'RESERVIO',
      name: 'Heidelberg Bahnhof',
      city: 'Heidelberg',
      address: 'Bahnhofstraße 5, 69115 Heidelberg',
      phone: '+49 6221 456789',
      email: 'bahnhof@reservio-hotels.de',
      rooms: 50,
      active: true
    },
    {
      code: 'GH-KA-SUD',
      group: 'GuestHouse',
      name: 'Karlsruhe Südstadt',
      city: 'Karlsruhe',
      address: 'Südliche Waldstraße 20, 76137 Karlsruhe',
      phone: '+49 721 567890',
      email: 'suedstadt@guesthouse-hotels.de',
      rooms: 40,
      active: true
    },
    {
      code: 'GH-S-MIT',
      group: 'GuestHouse',
      name: 'Stuttgart Mitte',
      city: 'Stuttgart',
      address: 'Königstraße 100, 70173 Stuttgart',
      phone: '+49 711 678901',
      email: 'mitte@guesthouse-hotels.de',
      rooms: 55,
      active: true
    },
    {
      code: 'BW-FR-CTR',
      group: 'BestWay',
      name: 'Frankfurt City Center',
      city: 'Frankfurt',
      address: 'Zeil 50, 60313 Frankfurt',
      phone: '+49 69 789012',
      email: 'center@bestway-hotels.de',
      rooms: 80,
      active: true
    },
    {
      code: 'BW-FR-FLU',
      group: 'BestWay',
      name: 'Frankfurt Flughafen',
      city: 'Frankfurt',
      address: 'Flughafenstraße 1, 60549 Frankfurt',
      phone: '+49 69 890123',
      email: 'airport@bestway-hotels.de',
      rooms: 120,
      active: true
    },
    {
      code: 'UM-MUC-HBF',
      group: 'UrbanMotel',
      name: 'München Hauptbahnhof',
      city: 'München',
      address: 'Bahnhofplatz 10, 80335 München',
      phone: '+49 89 901234',
      email: 'hauptbahnhof@urbanmotel.de',
      rooms: 65,
      active: true
    },
    {
      code: 'UM-MUC-OST',
      group: 'UrbanMotel',
      name: 'München Ost',
      city: 'München',
      address: 'Ostbahnhofstraße 15, 81667 München',
      phone: '+49 89 012345',
      email: 'ost@urbanmotel.de',
      rooms: 48,
      active: true
    }
  ],

  // =============== UI SETTINGS ===============
  UI: {
    THEME: 'dark', // dark | light | auto
    PRIMARY_COLOR: '#6366f1',
    ACCENT_COLOR: '#06b6d4',
    
    // Animation Settings
    ANIMATIONS: {
      ENABLED: true,
      DURATION: 250,
      EASING: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },
    
    // Table Settings
    TABLE: {
      ITEMS_PER_PAGE: 25,
      PAGINATION_ENABLED: true,
      VIRTUAL_SCROLLING: false,
      EXPORT_ENABLED: true
    },
    
    // Date/Time Format
    FORMATS: {
      DATE: 'DD.MM.YYYY',
      TIME: 'HH:mm',
      DATETIME: 'DD.MM.YYYY HH:mm',
      CURRENCY: 'EUR',
      LOCALE: 'de-DE'
    },
    
    // Toast Notifications
    TOAST: {
      POSITION: 'top-right', // top-left | top-right | bottom-left | bottom-right
      DURATION: 3000,
      MAX_STACK: 3
    }
  },

  // =============== FEATURES ===============
  FEATURES: {
    // Feature Flags
    MULTI_LANGUAGE: true,
    DARK_MODE: true,
    OFFLINE_MODE: false,
    PWA_ENABLED: false,
    
    // Module Activation
    MODULES: {
      RESERVATIONS: true,
      AVAILABILITY: true,
      REPORTING: true,
      GROUPS: true,
      CHANNEL_MANAGER: true,
      EMAIL_CONFIRMATIONS: true,
      SMS_NOTIFICATIONS: false,
      PAYMENT_PROCESSING: false,
      HOUSEKEEPING: false,
      MAINTENANCE: false
    },
    
    // Advanced Features
    ADVANCED: {
      AI_PREDICTIONS: false,
      DYNAMIC_PRICING: false,
      REVENUE_MANAGEMENT: false,
      CUSTOMER_SCORING: false
    }
  },

  // =============== SECURITY ===============
  SECURITY: {
    // Session Settings
    SESSION: {
      DURATION: 8 * 60 * 60 * 1000, // 8 hours
      REMEMBER_ME_DURATION: 30 * 24 * 60 * 60 * 1000, // 30 days
      IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes
      CONCURRENT_SESSIONS: true
    },
    
    // Password Policy
    PASSWORD: {
      MIN_LENGTH: 8,
      REQUIRE_UPPERCASE: true,
      REQUIRE_LOWERCASE: true,
      REQUIRE_NUMBER: true,
      REQUIRE_SPECIAL: true,
      EXPIRES_DAYS: 90,
      HISTORY_COUNT: 5
    },
    
    // Login Security
    LOGIN: {
      MAX_ATTEMPTS: 5,
      LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
      CAPTCHA_AFTER_ATTEMPTS: 3,
      TWO_FACTOR_AUTH: false
    },
    
    // API Security
    API: {
      RATE_LIMIT: 100, // requests per minute
      CORS_ENABLED: true,
      ALLOWED_ORIGINS: ['https://res-tool.vercel.app', 'http://localhost:3000']
    }
  },

  // =============== PERFORMANCE ===============
  PERFORMANCE: {
    // Caching
    CACHE: {
      ENABLED: true,
      TTL: 5 * 60 * 1000, // 5 minutes
      MAX_SIZE: 100,
      STRATEGY: 'LRU' // LRU | FIFO | LFU
    },
    
    // Data Loading
    LAZY_LOADING: true,
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 100,
    
    // Optimization
    COMPRESSION: true,
    MINIFICATION: true,
    IMAGE_OPTIMIZATION: true
  },

  // =============== LOGGING ===============
  LOGGING: {
    ENABLED: true,
    LEVEL: 'info', // debug | info | warn | error
    CONSOLE: true,
    REMOTE: false,
    REMOTE_ENDPOINT: '',
    
    // Activity Tracking
    TRACK_USER_ACTIVITY: true,
    TRACK_API_CALLS: true,
    TRACK_ERRORS: true,
    TRACK_PERFORMANCE: false
  },

  // =============== EMAIL ===============
  EMAIL: {
    ENABLED: false, // Wird nach Budget-Freigabe aktiviert
    PROVIDER: 'sendgrid', // sendgrid | mailgun | smtp
    FROM_ADDRESS: 'reservations@hotel-system.de',
    FROM_NAME: 'Hotel Reservation System',
    
    // Templates
    TEMPLATES: {
      CONFIRMATION: 'default',
      CANCELLATION: 'default',
      REMINDER: 'default',
      INVOICE: 'default'
    },
    
    // SMTP Settings (falls SMTP verwendet wird)
    SMTP: {
      HOST: '',
      PORT: 587,
      SECURE: false,
      USER: '',
      PASSWORD: ''
    }
  },

  // =============== REPORTS ===============
  REPORTS: {
    // Default Settings
    DEFAULT_PERIOD: 30, // days
    DEFAULT_COMPARISON: 'previous_period',
    
    // Export Options
    EXPORT: {
      PDF: true,
      EXCEL: true,
      CSV: true,
      JSON: false
    },
    
    // Scheduled Reports
    SCHEDULED: {
      ENABLED: false,
      DAILY_AT: '09:00',
      WEEKLY_ON: 'monday',
      MONTHLY_ON: 1
    }
  },

  // =============== INTEGRATIONS ===============
  INTEGRATIONS: {
    // Google Analytics
    GOOGLE_ANALYTICS: {
      ENABLED: false,
      TRACKING_ID: ''
    },
    
    // Payment Providers
    PAYMENT: {
      STRIPE: {
        ENABLED: false,
        PUBLIC_KEY: '',
        SECRET_KEY: ''
      },
      PAYPAL: {
        ENABLED: false,
        CLIENT_ID: '',
        SECRET: ''
      }
    },
    
    // External Systems
    EXTERNAL: {
      PMS: null, // Opera | Protel | Mews | etc.
      CRM: null, // Salesforce | HubSpot | etc.
      ACCOUNTING: null // SAP | Datev | etc.
    }
  },

  // =============== DEVELOPMENT ===============
  DEVELOPMENT: {
    // Dev Tools
    ENABLE_DEV_TOOLS: false,
    MOCK_DATA: false,
    API_DELAY: 0,
    
    // Testing
    TEST_MODE: false,
    TEST_USERS: [],
    
    // Debugging
    DEBUG_API: false,
    DEBUG_STATE: false,
    DEBUG_PERFORMANCE: false
  }
};

// =============== ENVIRONMENT OVERRIDES ===============
// Override settings based on environment
if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  
  // Development environment
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    HRS_CONFIG.SYSTEM.ENVIRONMENT = 'development';
    HRS_CONFIG.SYSTEM.DEBUG = true;
    HRS_CONFIG.API.HNS.MODE = 'test';
    HRS_CONFIG.LOGGING.LEVEL = 'debug';
    HRS_CONFIG.DEVELOPMENT.ENABLE_DEV_TOOLS = true;
  }
  
  // Staging environment
  else if (hostname.includes('staging') || hostname.includes('test')) {
    HRS_CONFIG.SYSTEM.ENVIRONMENT = 'staging';
    HRS_CONFIG.API.HNS.MODE = 'test';
    HRS_CONFIG.LOGGING.LEVEL = 'info';
  }
  
  // Production environment
  else {
    HRS_CONFIG.SYSTEM.ENVIRONMENT = 'production';
    HRS_CONFIG.API.HNS.MODE = 'live';
    HRS_CONFIG.LOGGING.LEVEL = 'error';
  }
}

// =============== EXPORT ===============
// Make config globally available
window.HRS_CONFIG = HRS_CONFIG;

// Freeze config to prevent modifications
Object.freeze(HRS_CONFIG);
/* ================================================
   HOTEL RESERVATION SYSTEM V2.0 - AUTHENTICATION
   ================================================ */

'use strict';

// =============== AUTH CONFIGURATION ===============
const AUTH_CONFIG = {
  SESSION_DURATION: 8 * 60 * 60 * 1000, // 8 hours
  REMEMBER_DURATION: 30 * 24 * 60 * 60 * 1000, // 30 days
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  PASSWORD_MIN_LENGTH: 8,
  REQUIRE_2FA: false,
  SESSION_KEY: 'hrs_v2_userSession',
  ATTEMPTS_KEY: 'hrs_v2_login_attempts'
};

// =============== AUTH MANAGER ===============
class AuthManager {
  constructor() {
    this.session = null;
    this.attempts = this.loadAttempts();
    this.initializeAuth();
  }

 // Initialize authentication
initializeAuth() {
  // Check if we're on auth page
  const isAuthPage = window.location.pathname.includes('auth.html') || 
                    window.location.pathname.includes('login') ||
                    window.location.pathname === '/' ||  // Root als auth page
                    !window.location.pathname.includes('.html');  // Kein HTML = root
  
  // Load existing session
  this.loadSession();
  
  // Redirect logic - angepasst für Demo
  if (!isAuthPage && !this.isAuthenticated()) {
    console.log('Not authenticated, redirecting to login...');
    this.redirectToLogin();
  } else if (isAuthPage && this.isAuthenticated()) {
    console.log('Already authenticated, redirecting to dashboard...');
    this.redirectToDashboard();
  }
  
  // Setup auto-logout
  if (this.isAuthenticated()) {
    this.setupAutoLogout();
    this.refreshSession();
  }
}

  // Load session from storage
  loadSession() {
    try {
      const stored = localStorage.getItem(AUTH_CONFIG.SESSION_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        if (this.isSessionValid(session)) {
          this.session = session;
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
    return false;
  }

  // Save session to storage
  saveSession(session) {
    try {
      localStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify(session));
      this.session = session;
      return true;
    } catch (error) {
      console.error('Failed to save session:', error);
      return false;
    }
  }

  // Check if session is valid
  isSessionValid(session) {
    if (!session || !session.expiresAt) return false;
    return new Date(session.expiresAt) > new Date();
  }

  // Check authentication status
  isAuthenticated() {
    return this.session && this.isSessionValid(this.session);
  }

 // Login with credentials
async login(email, password, remember = false) {
  try {
    // Check lockout
    if (this.isLockedOut()) {
      const remainingTime = this.getRemainingLockoutTime();
      throw new Error(`Account locked. Try again in ${Math.ceil(remainingTime / 60000)} minutes.`);
    }

    // Validate input
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Validate email format
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // DEMO LOGIN - Temporär für Entwicklung
    if (email === 'demo@hotel.de' && password === 'Demo1234!') {
      // Create demo session
      const duration = remember ? AUTH_CONFIG.REMEMBER_DURATION : AUTH_CONFIG.SESSION_DURATION;
      const session = {
        user: {
          id: 'demo-user-001',
          email: email,
          name: 'Demo User',
          role: 'admin'
        },
        token: 'demo-token-' + Date.now(),
        expiresAt: new Date(Date.now() + duration).toISOString(),
        createdAt: new Date().toISOString(),
        remember: remember
      };

      // Save session
      this.saveSession(session);
      this.clearAttempts();

      // Log activity (simplified for demo)
      console.log('Demo login successful:', session);

      return { success: true, user: session.user };
    } else {
      // Für alle anderen Login-Versuche
      this.recordFailedAttempt();
      throw new Error('Invalid credentials. Please use demo@hotel.de / Demo1234!');
    }

  } catch (error) {
    console.error('Login failed:', error);
    return { success: false, error: error.message };
  }
}

  // Logout
  async logout() {
    try {
      // Clear session
      this.session = null;
      localStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
      
      // Sign out from Supabase
      const { createClient } = window.supabase;
      const supabaseClient = createClient(
        'https://ncrczhlwqwqirvdgbrfb.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jcmN6aGx3cXdxaXJ2ZGdicmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0MTMyNDAsImV4cCI6MjA1MTk4OTI0MH0.jYNGgg6jT0-tSsWnWnWsZOW5Y-n0hHD2eI82ktl2YzA'
      );
      
      await supabaseClient.auth.signOut();
      
      // Log activity
      await this.logActivity('logout', {});
      
      // Redirect to login
      this.redirectToLogin();
      
      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Register new user
  async register(email, password, name, role = 'user') {
    try {
      // Validate input
      if (!email || !password || !name) {
        throw new Error('All fields are required');
      }

      // Validate email
      if (!this.isValidEmail(email)) {
        throw new Error('Invalid email format');
      }

      // Validate password strength
      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.message);
      }

      // Initialize Supabase
      const { createClient } = window.supabase;
      const supabaseClient = createClient(
        'https://ncrczhlwqwqirvdgbrfb.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jcmN6aGx3cXdxaXJ2ZGdicmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0MTMyNDAsImV4cCI6MjA1MTk4OTI0MH0.jYNGgg6jT0-tSsWnWnWsZOW5Y-n0hHD2eI82ktl2YzA'
      );

      // Create user
      const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            name: name,
            role: role
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Log activity
      await this.logActivity('register', { email, name, role });

      return { 
        success: true, 
        message: 'Registration successful. Please check your email for verification.' 
      };

    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Password reset request
  async requestPasswordReset(email) {
    try {
      if (!email) {
        throw new Error('Email is required');
      }

      if (!this.isValidEmail(email)) {
        throw new Error('Invalid email format');
      }

      // Initialize Supabase
      const { createClient } = window.supabase;
      const supabaseClient = createClient(
        'https://ncrczhlwqwqirvdgbrfb.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jcmN6aGx3cXdxaXJ2ZGdicmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0MTMyNDAsImV4cCI6MjA1MTk4OTI0MH0.jYNGgg6jT0-tSsWnWnWsZOW5Y-n0hHD2eI82ktl2YzA'
      );

      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth.html?mode=reset'
      });

      if (error) {
        throw new Error(error.message);
      }

      // Log activity
      await this.logActivity('password_reset_request', { email });

      return { 
        success: true, 
        message: 'Password reset link sent to your email' 
      };

    } catch (error) {
      console.error('Password reset failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Update password
  async updatePassword(newPassword) {
    try {
      // Validate password
      const validation = this.validatePassword(newPassword);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // Initialize Supabase
      const { createClient } = window.supabase;
      const supabaseClient = createClient(
        'https://ncrczhlwqwqirvdgbrfb.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jcmN6aGx3cXdxaXJ2ZGdicmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0MTMyNDAsImV4cCI6MjA1MTk4OTI0MH0.jYNGgg6jT0-tSsWnWnWsZOW5Y-n0hHD2eI82ktl2YzA'
      );

      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(error.message);
      }

      // Log activity
      await this.logActivity('password_update', {});

      return { 
        success: true, 
        message: 'Password updated successfully' 
      };

    } catch (error) {
      console.error('Password update failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Refresh session
  refreshSession() {
    if (!this.isAuthenticated()) return;
    
    // Update expiry time
    const duration = this.session.remember 
      ? AUTH_CONFIG.REMEMBER_DURATION 
      : AUTH_CONFIG.SESSION_DURATION;
    
    this.session.expiresAt = new Date(Date.now() + duration).toISOString();
    this.saveSession(this.session);
  }

  // Setup auto-logout
  setupAutoLogout() {
    // Clear existing timer
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
    }

    // Calculate time until expiry
    const expiresAt = new Date(this.session.expiresAt);
    const now = new Date();
    const timeUntilExpiry = expiresAt - now;

    // Set timer for auto-logout
    if (timeUntilExpiry > 0) {
      this.logoutTimer = setTimeout(() => {
        this.showSessionExpiredModal();
        this.logout();
      }, timeUntilExpiry);
    }

    // Refresh session on activity
    document.addEventListener('click', () => this.refreshSession(), { once: true });
    document.addEventListener('keypress', () => this.refreshSession(), { once: true });
  }

  // Show session expired modal
  showSessionExpiredModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Session Expired</h2>
        </div>
        <div class="modal-body">
          <p>Your session has expired. Please log in again to continue.</p>
        </div>
        <div class="modal-footer">
          <button class="btn primary" onclick="window.location.href='/auth.html'">
            Go to Login
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Validate email format
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Validate password strength
  validatePassword(password) {
    const errors = [];
    
    if (password.length < AUTH_CONFIG.PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${AUTH_CONFIG.PASSWORD_MIN_LENGTH} characters`);
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*)');
    }
    
    return {
      valid: errors.length === 0,
      message: errors.join('. ')
    };
  }

  // Login attempt tracking
  loadAttempts() {
    try {
      const stored = localStorage.getItem(AUTH_CONFIG.ATTEMPTS_KEY);
      return stored ? JSON.parse(stored) : { count: 0, lastAttempt: null };
    } catch {
      return { count: 0, lastAttempt: null };
    }
  }

  recordFailedAttempt() {
    this.attempts.count++;
    this.attempts.lastAttempt = Date.now();
    localStorage.setItem(AUTH_CONFIG.ATTEMPTS_KEY, JSON.stringify(this.attempts));
  }

  clearAttempts() {
    this.attempts = { count: 0, lastAttempt: null };
    localStorage.removeItem(AUTH_CONFIG.ATTEMPTS_KEY);
  }

  isLockedOut() {
    if (this.attempts.count < AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
      return false;
    }
    
    const timeSinceLastAttempt = Date.now() - this.attempts.lastAttempt;
    if (timeSinceLastAttempt > AUTH_CONFIG.LOCKOUT_DURATION) {
      this.clearAttempts();
      return false;
    }
    
    return true;
  }

  getRemainingLockoutTime() {
    if (!this.isLockedOut()) return 0;
    const elapsed = Date.now() - this.attempts.lastAttempt;
    return AUTH_CONFIG.LOCKOUT_DURATION - elapsed;
  }

  // Activity logging
  async logActivity(action, details) {
    try {
      const activity = {
        action,
        details,
        timestamp: new Date().toISOString(),
        user: this.session?.user?.email || 'anonymous',
        ip: await this.getClientIP(),
        userAgent: navigator.userAgent
      };
      
      // Store locally for now (can be sent to server)
      const activities = JSON.parse(localStorage.getItem('hrs_v2_activities') || '[]');
      activities.push(activity);
      
      // Keep only last 100 activities
      if (activities.length > 100) {
        activities.shift();
      }
      
      localStorage.setItem('hrs_v2_activities', JSON.stringify(activities));
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

 // Redirect helpers
redirectToLogin() {
  // Prüfe verschiedene mögliche Pfade
  if (window.location.pathname.includes('index.html')) {
    window.location.href = '/auth.html';
  } else {
    window.location.href = 'auth.html';
  }
}

redirectToDashboard() {
  // Prüfe verschiedene mögliche Pfade
  if (window.location.pathname.includes('auth.html')) {
    window.location.href = '/index.html';
  } else {
    window.location.href = 'index.html';
  }
}

  // Get current user
  getCurrentUser() {
    return this.session?.user || null;
  }

  // Check user role
  hasRole(role) {
    return this.session?.user?.role === role;
  }

  // Check user permission
  hasPermission(permission) {
    const rolePermissions = {
      admin: ['*'],
      manager: ['view', 'create', 'edit', 'delete', 'report'],
      user: ['view', 'create', 'edit'],
      viewer: ['view']
    };
    
    const userRole = this.session?.user?.role || 'viewer';
    const permissions = rolePermissions[userRole] || [];
    
    return permissions.includes('*') || permissions.includes(permission);
  }
}

// =============== AUTH UI CONTROLLER ===============
class AuthUIController {
  constructor(authManager) {
    this.auth = authManager;
    this.initializeUI();
  }

  initializeUI() {
    // Only initialize if on auth page
    if (!window.location.pathname.includes('auth')) return;
    
    this.setupEventListeners();
    this.checkURLParams();
    this.updateUI();
  }

  setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }

    // Reset form
    const resetForm = document.getElementById('resetForm');
    if (resetForm) {
      resetForm.addEventListener('submit', (e) => this.handleReset(e));
    }

    // Toggle between forms
    const toggleLinks = document.querySelectorAll('[data-toggle-auth]');
    toggleLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const mode = e.target.dataset.toggleAuth;
        this.switchMode(mode);
      });
    });

    // Password visibility toggle
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.togglePasswordVisibility(e));
    });

    // Real-time password strength
    const passwordInputs = document.querySelectorAll('input[type="password"][data-strength]');
    passwordInputs.forEach(input => {
      input.addEventListener('input', (e) => this.updatePasswordStrength(e));
    });
  }

  async handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.email.value;
    const password = form.password.value;
    const remember = form.remember?.checked || false;
    
    // Show loading
    this.setLoading(form, true);
    this.clearErrors();
    
    // Attempt login
    const result = await this.auth.login(email, password, remember);
    
    if (result.success) {
      this.showSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 1000);
    } else {
      this.showError(result.error);
      this.setLoading(form, false);
    }
  }

  async handleRegister(event) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.email.value;
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;
    const name = form.name.value;
    
    // Validate passwords match
    if (password !== confirmPassword) {
      this.showError('Passwords do not match');
      return;
    }
    
    // Show loading
    this.setLoading(form, true);
    this.clearErrors();
    
    // Attempt registration
    const result = await this.auth.register(email, password, name);
    
    if (result.success) {
      this.showSuccess(result.message);
      setTimeout(() => {
        this.switchMode('login');
      }, 2000);
    } else {
      this.showError(result.error);
    }
    
    this.setLoading(form, false);
  }

  async handleReset(event) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.email.value;
    
    // Show loading
    this.setLoading(form, true);
    this.clearErrors();
    
    // Request reset
    const result = await this.auth.requestPasswordReset(email);
    
    if (result.success) {
      this.showSuccess(result.message);
      form.reset();
    } else {
      this.showError(result.error);
    }
    
    this.setLoading(form, false);
  }

  switchMode(mode) {
    // Hide all forms
    document.querySelectorAll('.auth-form').forEach(form => {
      form.classList.add('hidden');
    });
    
    // Show selected form
    const targetForm = document.getElementById(`${mode}Form`);
    if (targetForm) {
      targetForm.classList.remove('hidden');
    }
    
    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('mode', mode);
    window.history.pushState({}, '', url);
    
    this.clearErrors();
  }

  togglePasswordVisibility(event) {
    const button = event.currentTarget;
    const input = button.previousElementSibling;
    
    if (input.type === 'password') {
      input.type = 'text';
      button.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
      input.type = 'password';
      button.innerHTML = '<i class="fas fa-eye"></i>';
    }
  }

  updatePasswordStrength(event) {
    const password = event.target.value;
    const validation = this.auth.validatePassword(password);
    const strengthBar = event.target.parentElement.querySelector('.password-strength');
    
    if (!strengthBar) return;
    
    // Calculate strength percentage
    let strength = 0;
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 10;
    if (/[!@#$%^&*]/.test(password)) strength += 10;
    
    // Update bar
    strengthBar.style.width = `${strength}%`;
    
    // Update color
    if (strength < 40) {
      strengthBar.className = 'password-strength weak';
    } else if (strength < 70) {
      strengthBar.className = 'password-strength medium';
    } else {
      strengthBar.className = 'password-strength strong';
    }
    
    // Show validation errors
    const errorContainer = event.target.parentElement.querySelector('.password-errors');
    if (errorContainer) {
      if (!validation.valid) {
        errorContainer.innerHTML = validation.message.split('. ').map(err => 
          `<li>${err}</li>`
        ).join('');
        errorContainer.classList.remove('hidden');
      } else {
        errorContainer.classList.add('hidden');
      }
    }
  }

  checkURLParams() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    
    if (mode) {
      this.switchMode(mode);
    }
  }

  updateUI() {
    // Update user info if logged in
    const user = this.auth.getCurrentUser();
    if (user) {
      const userElement = document.getElementById('currentUser');
      if (userElement) {
        userElement.textContent = user.name || user.email;
      }
    }
    
    // Update lockout status
    if (this.auth.isLockedOut()) {
      const remainingTime = Math.ceil(this.auth.getRemainingLockoutTime() / 60000);
      this.showError(`Too many failed attempts. Try again in ${remainingTime} minutes.`);
      
      // Disable forms
      document.querySelectorAll('form button[type="submit"]').forEach(btn => {
        btn.disabled = true;
      });
    }
  }

  setLoading(form, isLoading) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    
    if (isLoading) {
      button.disabled = true;
      button.dataset.originalText = button.innerHTML;
      button.innerHTML = '<span class="spinner"></span> Loading...';
    } else {
      button.disabled = false;
      button.innerHTML = button.dataset.originalText || 'Submit';
    }
  }

  showError(message) {
    const alerts = document.querySelectorAll('.alert-error');
    alerts.forEach(alert => {
      alert.textContent = message;
      alert.classList.remove('hidden');
    });
  }

  showSuccess(message) {
    const alerts = document.querySelectorAll('.alert-success');
    alerts.forEach(alert => {
      alert.textContent = message;
      alert.classList.remove('hidden');
    });
  }

  clearErrors() {
    document.querySelectorAll('.alert').forEach(alert => {
      alert.classList.add('hidden');
    });
  }
}

// =============== INITIALIZATION ===============
// Create global auth instance
const authManager = new AuthManager();
const authUI = new AuthUIController(authManager);

// Export for use in other modules
window.HRS_AUTH = {
  manager: authManager,
  ui: authUI,
  login: authManager.login.bind(authManager),
  logout: authManager.logout.bind(authManager),
  getCurrentUser: authManager.getCurrentUser.bind(authManager),
  hasPermission: authManager.hasPermission.bind(authManager),
  hasRole: authManager.hasRole.bind(authManager)
};

/**
 * Authentication Service
 * Handles user authentication with Supabase Auth
 */

import { supabase } from './supabase.js';
import { EventBus } from './eventBus.js';

// Demo credentials (for fallback)
const DEMO_USERS = [
  {
    email: 'admin@restool.de',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin'
  }
];

class AuthService {
  constructor() {
    this.currentUser = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Check for existing session with timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );
      
      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])
        .catch(err => {
          console.warn('Supabase session check failed, using demo mode:', err.message);
          return { data: { session: null } };
        });
      
      if (session) {
        this.currentUser = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email,
          role: session.user.user_metadata?.role || 'user'
        };
        EventBus.emit('auth:login', this.currentUser);
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          this.currentUser = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email,
            role: session.user.user_metadata?.role || 'user'
          };
          EventBus.emit('auth:login', this.currentUser);
        } else if (event === 'SIGNED_OUT') {
          this.currentUser = null;
          EventBus.emit('auth:logout');
        }
      });

      this.initialized = true;
   } catch (error) {
      console.error('Auth initialization error:', error);
      this.initialized = true; // Mark as initialized even on error
    }
  }

  async login(email, password) {
    try {
      // Try Supabase Auth first
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Fallback to demo login
        const demoUser = DEMO_USERS.find(
          u => u.email === email && u.password === password
        );

        if (demoUser) {
          this.currentUser = {
            id: 'demo-' + Date.now(),
            email: demoUser.email,
            name: demoUser.name,
            role: demoUser.role,
            isDemo: true
          };
          
          // Store demo user in localStorage
          localStorage.setItem('demo_user', JSON.stringify(this.currentUser));
          
          EventBus.emit('auth:login', this.currentUser);
          return { success: true, user: this.currentUser };
        }

        throw new Error('Ungültige Anmeldedaten');
      }

      this.currentUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email,
        role: data.user.user_metadata?.role || 'user'
      };

      EventBus.emit('auth:login', this.currentUser);
      return { success: true, user: this.currentUser };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  async logout() {
    try {
      if (this.currentUser?.isDemo) {
        localStorage.removeItem('demo_user');
        this.currentUser = null;
        EventBus.emit('auth:logout');
        return { success: true };
      }

      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;

      this.currentUser = null;
      EventBus.emit('auth:logout');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }

  async signup(email, password, name) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'user'
          }
        }
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: error.message };
    }
  }

  async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateProfile(updates) {
    try {
      if (this.currentUser?.isDemo) {
        this.currentUser = { ...this.currentUser, ...updates };
        localStorage.setItem('demo_user', JSON.stringify(this.currentUser));
        EventBus.emit('auth:profile-updated', this.currentUser);
        return { success: true };
      }

      const { error } = await supabase.auth.updateUser({
        data: updates
      });

      if (error) throw error;

      this.currentUser = { ...this.currentUser, ...updates };
      EventBus.emit('auth:profile-updated', this.currentUser);
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: error.message };
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  hasRole(role) {
    return this.currentUser?.role === role;
  }

  async checkDemoSession() {
    const demoUser = localStorage.getItem('demo_user');
    if (demoUser) {
      try {
        this.currentUser = JSON.parse(demoUser);
        EventBus.emit('auth:login', this.currentUser);
        return true;
      } catch (error) {
        localStorage.removeItem('demo_user');
      }
    }
    return false;
  }
}

export const Auth = new AuthService();
export default Auth;

/**
 * Toast Notification System
 * Modern notifications für V1.5
 */

(function() {
  if (window.__TOAST_SYSTEM__) return;
  window.__TOAST_SYSTEM__ = true;

  class ToastService {
    constructor() {
      this.container = null;
      this.toasts = [];
      this.autoHideDelay = 5000;
      this.init();
    }

    init() {
      // Warten bis DOM ready ist
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.createContainer());
      } else {
        this.createContainer();
      }
    }

    createContainer() {
      // Container erstellen
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }

    show(message, options = {}) {
      const {
        type = 'info',
        title = null,
        duration = this.autoHideDelay,
        icon = null
      } = options;

      const toast = this.createToast(message, type, title, icon);
      this.container.appendChild(toast);
      this.toasts.push(toast);

      // Trigger animation
      requestAnimationFrame(() => {
        toast.classList.add('show');
      });

      // Auto-hide
      if (duration > 0) {
        setTimeout(() => {
          this.hide(toast);
        }, duration);
      }

      return toast;
    }

    success(message, title = 'Erfolg') {
      return this.show(message, { 
        type: 'success', 
        title,
        icon: '✓'
      });
    }

    error(message, title = 'Fehler') {
      return this.show(message, { 
        type: 'error', 
        title,
        icon: '✕',
        duration: 7000
      });
    }

    warning(message, title = 'Warnung') {
      return this.show(message, { 
        type: 'warning', 
        title,
        icon: '⚠'
      });
    }

    info(message, title = 'Info') {
      return this.show(message, { 
        type: 'info', 
        title,
        icon: 'ℹ'
      });
    }

    createToast(message, type, title, icon) {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;

      const content = document.createElement('div');
      content.className = 'toast-content';

      if (icon) {
        const iconEl = document.createElement('div');
        iconEl.className = 'toast-icon';
        iconEl.textContent = icon;
        content.appendChild(iconEl);
      }

      const messageContainer = document.createElement('div');
      messageContainer.className = 'toast-message';

      if (title) {
        const titleEl = document.createElement('div');
        titleEl.className = 'toast-title';
        titleEl.textContent = title;
        messageContainer.appendChild(titleEl);
      }

      const descEl = document.createElement('div');
      descEl.className = 'toast-description';
      descEl.textContent = message;
      messageContainer.appendChild(descEl);

      content.appendChild(messageContainer);
      toast.appendChild(content);

      // Click to dismiss
      toast.addEventListener('click', () => {
        this.hide(toast);
      });

      return toast;
    }

    hide(toast) {
      if (!toast || !toast.parentNode) return;

      toast.classList.remove('show');
      
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        const index = this.toasts.indexOf(toast);
        if (index > -1) {
          this.toasts.splice(index, 1);
        }
      }, 200);
    }

    hideAll() {
      this.toasts.forEach(toast => this.hide(toast));
    }

    // Promise-Wrapper für async operations
    async promise(promise, messages = {}) {
      const {
        loading = 'Lädt...',
        success = 'Erfolgreich!',
        error = 'Ein Fehler ist aufgetreten'
      } = messages;

      const loadingToast = this.info(loading, null);

      try {
        const result = await promise;
        this.hide(loadingToast);
        this.success(success);
        return result;
      } catch (err) {
        this.hide(loadingToast);
        this.error(error + ': ' + (err.message || 'Unbekannter Fehler'));
        throw err;
      }
    }
  }

  // Global instance
  window.toast = new ToastService();

  console.log('✓ Toast System initialized');
})();

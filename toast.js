/**
 * Toast Notification System
 * Shows beautiful toast notifications for user feedback
 */

class ToastService {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.autoHideDelay = 5000;
  }

  initialize() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
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
      duration: 7000 // Errors stay longer
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

    toast.style.animation = 'slideOut 0.3s ease-out';
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      const index = this.toasts.indexOf(toast);
      if (index > -1) {
        this.toasts.splice(index, 1);
      }
    }, 300);
  }

  hideAll() {
    this.toasts.forEach(toast => this.hide(toast));
  }

  // Convenience method for async operations
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
      this.error(error + ': ' + err.message);
      throw err;
    }
  }
}

// Add CSS animation for slide out
const style = document.createElement('style');
style.textContent = `
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

export const Toast = new ToastService();
export default Toast;

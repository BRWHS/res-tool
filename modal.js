/**
 * Modal Manager
 * Handles modal dialogs and their lifecycle
 */

class ModalManagerClass {
  constructor() {
    this.activeModals = [];
    this.backdrop = null;
  }

  initialize() {
    this.backdrop = document.getElementById('modal-backdrop');
    
    if (!this.backdrop) {
      this.backdrop = document.createElement('div');
      this.backdrop.id = 'modal-backdrop';
      this.backdrop.className = 'modal-backdrop';
      document.body.appendChild(this.backdrop);
    }

    // Backdrop click closes top modal
    this.backdrop.addEventListener('click', () => {
      if (this.activeModals.length > 0) {
        this.close(this.activeModals[this.activeModals.length - 1]);
      }
    });

    // ESC key closes top modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModals.length > 0) {
        this.close(this.activeModals[this.activeModals.length - 1]);
      }
    });

    // Setup close buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = btn.closest('.modal');
        if (modal) {
          this.close(modal.id);
        }
      });
    });
  }

  open(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`Modal not found: ${modalId}`);
      return;
    }

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Show backdrop
    this.backdrop.classList.add('active');

    // Show modal
    modal.classList.add('active');

    // Add to stack
    this.activeModals.push(modalId);

    // Focus first input
    const firstInput = modal.querySelector('input, select, textarea, button');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }

    // Emit event
    this.emit('modal:opened', modalId);
  }

  close(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Remove from stack
    const index = this.activeModals.indexOf(modalId);
    if (index > -1) {
      this.activeModals.splice(index, 1);
    }

    // Hide modal
    modal.classList.remove('active');

    // If no more modals, hide backdrop and restore scroll
    if (this.activeModals.length === 0) {
      this.backdrop.classList.remove('active');
      document.body.style.overflow = '';
    }

    // Emit event
    this.emit('modal:closed', modalId);
  }

  closeAll() {
    [...this.activeModals].forEach(modalId => this.close(modalId));
  }

  isOpen(modalId) {
    return this.activeModals.includes(modalId);
  }

  emit(event, data) {
    const customEvent = new CustomEvent(event, { detail: data });
    document.dispatchEvent(customEvent);
  }

  on(event, callback) {
    document.addEventListener(event, (e) => callback(e.detail));
  }
}

export const ModalManager = new ModalManagerClass();
export default ModalManager;

/**
 * Formatters
 * Utility functions for formatting data
 */

/**
 * Format date to German format
 */
export function formatDate(date) {
  if (!date) return '-';
  
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}.${month}.${year}`;
}

/**
 * Format date to ISO format (YYYY-MM-DD)
 */
export function formatDateISO(date) {
  if (!date) return '';
  
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Format datetime to German format
 */
export function formatDateTime(date) {
  if (!date) return '-';
  
  const d = new Date(date);
  const dateStr = formatDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${dateStr} ${hours}:${minutes}`;
}

/**
 * Format time
 */
export function formatTime(date) {
  if (!date) return '-';
  
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * Format currency (Euro)
 */
export function formatCurrency(amount, showDecimals = true) {
  if (amount === null || amount === undefined) return '0 €';
  
  const num = Number(amount);
  
  if (isNaN(num)) return '0 €';
  
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  }).format(num);
}

/**
 * Format number
 */
export function formatNumber(number, decimals = 0) {
  if (number === null || number === undefined) return '0';
  
  const num = Number(number);
  
  if (isNaN(num)) return '0';
  
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
}

/**
 * Format percentage
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined) return '0%';
  
  const num = Number(value);
  
  if (isNaN(num)) return '0%';
  
  return formatNumber(num, decimals) + '%';
}

/**
 * Format phone number
 */
export function formatPhone(phone) {
  if (!phone) return '';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Format German phone numbers
  if (digits.startsWith('49') && digits.length >= 10) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  
  if (digits.startsWith('0') && digits.length >= 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  
  return phone;
}

/**
 * Parse date from German format
 */
export function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Check if already in ISO format
  if (dateStr.includes('-')) {
    return new Date(dateStr);
  }
  
  // Parse German format (DD.MM.YYYY)
  const parts = dateStr.split('.');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  
  return new Date(year, month, day);
}

/**
 * Calculate nights between two dates
 */
export function calculateNights(checkin, checkout) {
  if (!checkin || !checkout) return 0;
  
  const start = new Date(checkin);
  const end = new Date(checkout);
  
  const diff = end - start;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get relative time (e.g., "vor 2 Stunden")
 */
export function getRelativeTime(date) {
  if (!date) return '';
  
  const now = new Date();
  const then = new Date(date);
  const diff = now - then;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (years > 0) return `vor ${years} Jahr${years > 1 ? 'en' : ''}`;
  if (months > 0) return `vor ${months} Monat${months > 1 ? 'en' : ''}`;
  if (days > 0) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  if (hours > 0) return `vor ${hours} Stunde${hours > 1 ? 'n' : ''}`;
  if (minutes > 0) return `vor ${minutes} Minute${minutes > 1 ? 'n' : ''}`;
  return 'gerade eben';
}

/**
 * Truncate text
 */
export function truncate(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Format file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export default {
  formatDate,
  formatDateISO,
  formatDateTime,
  formatTime,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatPhone,
  parseDate,
  calculateNights,
  getRelativeTime,
  truncate,
  capitalize,
  formatFileSize
};

/**
 * Format utilities for common data transformations
 */

/**
 * Strip consecutive duplicate words from a display name.
 * Handles a legacy register-flow bug where single-word names were stored as
 * `first_name = last_name`, producing display strings like "Juan Juan".
 *
 * dedupeName("homelander homelander") → "homelander"
 * dedupeName("Juan Dela Cruz")        → "Juan Dela Cruz"
 */
export function dedupeName(name: string | null | undefined): string {
  if (!name) return '';
  const words  = name.trim().split(/\s+/).filter(Boolean);
  const unique: string[] = [];
  for (const w of words) {
    if (unique[unique.length - 1]?.toLowerCase() !== w.toLowerCase()) unique.push(w);
  }
  return unique.join(' ');
}

export const formatters = {
  /**
   * Format date to readable string
   */
  date: (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  },

  /**
   * Format date and time
   */
  dateTime: (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  /**
   * Format currency
   */
  currency: (amount: number, currency = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  },

  /**
   * Format phone number
   */
  phone: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  },

  /**
   * Capitalize first letter
   */
  capitalize: (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
   * Truncate string with ellipsis
   */
  truncate: (str: string, length: number): string => {
    return str.length > length ? `${str.substring(0, length)}...` : str;
  },
} as const;

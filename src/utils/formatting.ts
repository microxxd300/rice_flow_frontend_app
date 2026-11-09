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

/**
 * Season label for a farm cycle. The sowing day decides it, by the rule the planting guide
 * uses (Wet May-October, Dry November-April across the new year): "Wet 2026", "Dry 2026-27".
 * Without a sowing day it falls back on the cycle's own { season: 'wet', year: 2026 }.
 */
export function seasonLabel(cycle: { season?: string | null; year?: number | string | null; planting_date?: string | null } | null | undefined): string {
  const sown = /^(\d{4})-(\d{2})/.exec(String(cycle?.planting_date ?? ''));
  if (sown) {
    const year = Number(sown[1]);
    const month = Number(sown[2]);
    if (month >= 5 && month <= 10) return `Wet ${year}`;
    const start = month >= 11 ? year : year - 1;
    return `Dry ${start}-${String(start + 1).slice(-2)}`;
  }
  const season = String(cycle?.season ?? '').replace(/^./, c => c.toUpperCase());
  return `${season} ${cycle?.year ?? ''}`.trim();
}

/** 'Dry Season 2026-27' in the app's language; the server and seasonLabel give it in English. */
export function seasonInLanguage(label: string, tr: { recCondDry: string; recCondWet: string }): string {
  return label.replace('Dry Season', tr.recCondDry).replace('Wet Season', tr.recCondWet);
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

/**
 * How a suitability class reads in the app: "Highly Suitable [S1]", name first, code after.
 * The server sends "S1 - Highly Suitable" (and older results may say just "S1"); both
 * read the same here. Names follow the FAO classes the RSI engine uses (scoring.py).
 */
const CLASS_NAMES: Record<string, string> = {
  S1: 'Highly Suitable',
  S2: 'Moderately Suitable',
  S3: 'Marginally Suitable',
  N1: 'Currently Not Suitable',
  N2: 'Not Suitable',
};

/** "S1", "S2"... from a class the server sent, or '' when there is none. */
export function suitabilityCode(cls?: string | null): string {
  const m = /\b(S[1-3]|N[12])\b/i.exec(cls ?? '');
  return m ? m[1].toUpperCase() : '';
}

/** "Highly Suitable" for "S1", or '' for an unknown code. */
export const suitabilityName = (code: string): string => CLASS_NAMES[code] ?? '';

/** The key under a table that shows only codes: "S1 = Highly Suitable · S2 = Moderately Suitable" */
export function suitabilityLegend(classes: (string | null | undefined)[]): string {
  const codes = [...new Set(classes.map(c => suitabilityCode(c)).filter(Boolean))]
    .sort((a, b) => Object.keys(CLASS_NAMES).indexOf(a) - Object.keys(CLASS_NAMES).indexOf(b));
  return codes.map(code => `${code} = ${CLASS_NAMES[code]}`).join(' · ');
}

/** "Highly Suitable [S1]" */
export function suitabilityText(cls?: string | null): string {
  const code = suitabilityCode(cls);
  return code ? `${CLASS_NAMES[code]} [${code}]` : (cls?.trim() || '—');
}

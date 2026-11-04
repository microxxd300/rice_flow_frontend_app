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

/** "Highly Suitable [S1]" */
export function suitabilityText(cls?: string | null): string {
  const code = suitabilityCode(cls);
  return code ? `${CLASS_NAMES[code]} [${code}]` : (cls?.trim() || '—');
}

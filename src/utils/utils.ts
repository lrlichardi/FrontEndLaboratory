

export function capitalize(text?: string | null): string {
  const s = String(text ?? '').trim().toLocaleLowerCase('es-AR');
  return s ? s.charAt(0).toLocaleUpperCase('es-AR') + s.slice(1) : '';
}

// Extrae TODOS los tokens de 5–7 dígitos (incluye repetidos)
export const grabAllCodes = (raw: string): string[] =>
  (raw.match(/\d{5,7}/g) || []).map(s => s.trim());

// Devuelve únicos preservando orden
export const uniqueCodes = (arr: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of arr) if (!seen.has(c)) { seen.add(c); out.push(c); }
  return out;
};

export function capitalize(text?: string | null): string {
  const s = String(text ?? '').trim().toLocaleLowerCase('es-AR');
  return s ? s.charAt(0).toLocaleUpperCase('es-AR') + s.slice(1) : '';
}
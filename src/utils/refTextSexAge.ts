// src/utils/refTextSexAge.ts
export type SexLike = 'F' | 'M' | string | null | undefined;

export const SEX_AGE_FILTER_KEYS = new Set<string>([
  // 👉 Agregá acá los itemDef.key (o labels) que SÍ deben filtrar por sexo+edad
  //   // 'NEUTROFILOS_SEGMENTADOS',
  //   // 'LINFOCITOS',
  `TESTOSTERONA_TOTAL`, 'CPK', 'PROLACTINA', 'URICEMIA'
]);
export const SEX_AGE_FILTER_EXAM_NAMES = new Set<string>([
  // 👉 O por nombre de estudio (si corresponde, ej. 'HEMOGRAMA')
  'HEMOGRAMA', 'FERREMIA', 'FERRITINA',
]);

export function normalizeSex(sex?: SexLike): 'F' | 'M' | '' {
  if (!sex) return '';
  const v = String(sex).trim().toLowerCase();
  if (['f', 'fem', 'femenino', 'female', 'mujer'].includes(v)) return 'F';
  if (['m', 'masculino', 'male', 'varon', 'hombre'].includes(v)) return 'M';
  return '';
}

export function needsSexFilter(refText?: string | null): boolean {
  if (!refText) return false;
  const t = String(refText);
  return /\bF\s*:/.test(t) && /\bM\s*:/.test(t);
}

export function ageYearsToMonths(ageYears: number): number {
  return Math.max(0, Math.round(ageYears * 12));
}

function splitBySex(text: string): { F?: string; M?: string } {
  const parts = [...text.matchAll(/\b([FM])\s*:\s*([^]+?)(?=\b[FM]\s*:|$)/gi)];
  const out: { F?: string; M?: string } = {};
  for (const [, tag, block] of parts) {
    out[(tag as string).toUpperCase() as 'F' | 'M'] = String(block).trim();
  }
  return out;
}

type AgeRange = { min: number; max: number; line: string; valueText: string };

// Convierte "1 - 5 años", "6 - 11 años", "18 - 30 años", "45 - 66 años", "Adultas", "Adultos" a meses.
function parseAgeLabelToRangeMonths(t: string): { min: number; max: number } | null {
  const s = t.toLowerCase().replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();

  // Adultos/Adultas -> desde 18 años a infinito
  if (/\badult/.test(s)) return { min: 18 * 12, max: Number.POSITIVE_INFINITY };

  // Rango "A - B (años|meses|días)"
  const m = s.match(/(\d+)\s*-\s*(\d+)\s*(años|anios|meses|d[ií]as)/i);
  if (!m) return null;

  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  const unit = m[3].toLowerCase();

  const toMonths = (n: number) =>
    unit.startsWith('mes') ? n :
      unit.startsWith('d') ? Math.round(n / 30) :
        n * 12;

  return { min: toMonths(a), max: toMonths(b) };
}

// De un bloque (F o M), obtener líneas con rango de edad + texto de valores
function parseRanges(block: string): AgeRange[] {
  const lines = block
    .replace(/[()]/g, ' ')
    .replace(/[–—−]/g, '-')                // normaliza guiones raros
    .split(/(?:\n|;|·|\r|\/)+/)            // ← agrega "/" como separador
    .map(l => l.trim())
    .filter(Boolean);

  const ranges: AgeRange[] = [];
  for (const line of lines) {
    // "1 - 5 años 0.02 - 0.25" | "Adultas < 0.10 - 1.0"
    const m = line.match(/^(.*?(?:años|anios|meses|d[ií]as|adult[oa]s?))\s+(.+)$/i);
    if (!m) continue;

    const label = m[1].trim();

    // limpia separadores al inicio/fin del bloque de valores
    let values = m[2].trim().replace(/^[;,:/\-–—\s]+|[;,:/\-–—\s]+$/g, '');

    const ar = parseAgeLabelToRangeMonths(label);
    if (ar) {
      ranges.push({
        min: ar.min,
        max: ar.max,
        line,
        valueText: values
      });
    }
  }
  return ranges;
}

// Dado sexo+edad, devuelve el texto de referencia más adecuado
export function refTextBySexAndAge(
  refText: string | null | undefined,
  sex: SexLike,
  ageYears: number
): string {
  if (!refText) return '';
  const t = String(refText).replace(/\s+/g, ' ').trim();
  const s = normalizeSex(sex);

  if (!s) return t;

  // Si no tiene F: y M:, no filtramos
  if (!needsSexFilter(t)) return t;

  const blocks = splitBySex(t);
  const block = (s === 'F' ? blocks.F : blocks.M) ?? '';
  if (!block) return t;

  // Intentar matchear por edad
  const list = parseRanges(block);

  if (list.length === 0) {
    // no hay rangos legibles -> devolvemos el bloque entero
    return block.trim();
  }

  const ageM = ageYearsToMonths(ageYears);
  const found = list.find(r => ageM >= r.min && ageM <= r.max);
  return (found?.valueText || block || t).trim();
}

/** Decide si aplicamos la lógica sexo+edad para este ítem concreto (whitelist) */
export function shouldApplySexAgeFilter(opts: {
  itemKey?: string | null;
  itemLabel?: string | null;
  examName?: string | null;
}): boolean {
  const { itemKey, itemLabel, examName } = opts;
  if (itemKey && SEX_AGE_FILTER_KEYS.has(itemKey)) return true;

  // también permitir por label exactamente (si no tienes key todavía)
  if (itemLabel && SEX_AGE_FILTER_KEYS.has(itemLabel)) return true;
  if (examName && SEX_AGE_FILTER_EXAM_NAMES.has(examName.toUpperCase())) return true;

  return false;
}

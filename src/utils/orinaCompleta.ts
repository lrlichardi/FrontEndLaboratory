// src/utils/urine.ts
export const URINE_CODE = '660711' as const;

export const urinePrefixTitle: Record<'EF'|'EQ'|'EM', string> = {
  EF: 'Examen Físico',
  EQ: 'Examen Químico',
  EM: 'Examen microscópico de sedimento (x400)',
};

// Tipo mínimo para no acoplarte a TestOrder
export type MiniAnalyte = {
  id: string;
  valueNum?: number | null;
  valueText?: string | null;
  unit?: string | null;
  itemDef: {
    key?: string | null;
    label?: string | null;
    unit?: string | null;
    sortOrder?: number | null;
  };
  // opcional si querés usarlo en chips, etc.
  status?: string | null;
};

export type UrineGroups<T extends MiniAnalyte = MiniAnalyte> = {
  EF: T[]; EQ: T[]; EM: T[]; OTHER: T[];
};

export function isUrineExamCode(code?: string | null): boolean {
  return (code ?? '') === URINE_CODE;
}

export function getUrinePrefix(key?: string | null): 'EF'|'EQ'|'EM'|null {
  const k = String(key ?? '');
  const m = /^([A-Z]{2})_/.exec(k);
  if (!m) return null;
  const pref = m[1] as 'EF'|'EQ'|'EM';
  return pref === 'EF' || pref === 'EQ' || pref === 'EM' ? pref : null;
}

export function groupUrineAnalytes<T extends MiniAnalyte = MiniAnalyte>(
  analytes: T[]
): UrineGroups<T> {
  const g: UrineGroups<T> = { EF: [], EQ: [], EM: [], OTHER: [] };
  for (const a of analytes) {
    const p = getUrinePrefix(a.itemDef?.key);
    if (!p) g.OTHER.push(a);
    else g[p].push(a);
  }
  const bySort = (x: T, y: T) =>
    (x.itemDef?.sortOrder ?? 0) - (y.itemDef?.sortOrder ?? 0);
  g.EF.sort(bySort); g.EQ.sort(bySort); g.EM.sort(bySort); g.OTHER.sort(bySort);
  return g;
}

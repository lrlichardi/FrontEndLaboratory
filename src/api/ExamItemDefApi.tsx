const BASE_URL = import.meta.env.VITE_API_URL
import {type ExamType} from './OrderApi'

export type ExamItemDef = {
  id: string;
  key: string;
  label: string;
  unit?: string | null;
  kind: string;
  sortOrder: number;
  refText?: string | null;
  method?: string | null;
};

export async function createExamItemDef(input: {
  code: string; key: string; label: string; unit?: string; kind?: string; sortOrder?: number; refText?: string | null; method?: string;
}): Promise<ExamItemDef> {
  const r = await fetch(`${BASE_URL}/exam-item-def`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function updateExamItemDef(id: string, patch: Partial<Pick<ExamItemDef, 'key' | 'label' | 'unit' | 'kind' | 'sortOrder' | 'refText' | 'method'>>): Promise<ExamItemDef> {
  const r = await fetch(`${BASE_URL}/exam-item-def/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function deleteExamItemDef(id: string): Promise<void> {
  const r = await fetch(`${BASE_URL}/exam-item-def/${id}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(await r.text());
}

export async function fetchExamItemsByCode(code: string): Promise<{ examType: ExamType; items: ExamItemDef[] }> {
  const r = await fetch(`${BASE_URL}/exam-item-def?code=${encodeURIComponent(code)}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
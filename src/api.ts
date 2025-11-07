const BASE_URL = import.meta.env.VITE_API_URL

export type Patient = {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  birthDate: string; // ISO date
  sex: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  obraSocial?: string | null;
  NumberObraSocial?: Number | null;
  createdAt: string;
  updatedAt: string;
};

export type ListResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listPatients(query = '', page = 1, pageSize = 20): Promise<ListResponse<Patient>> {
  const url = new URL(`${BASE_URL}/patients`);
  if (query) url.searchParams.set('query', query);
  url.searchParams.set('page', String(page));
  url.searchParams.set('pageSize', String(pageSize));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Error cargando pacientes');
  return res.json();
}

export async function createPatient(data: Partial<Patient>): Promise<Patient> {
  const res = await fetch(`${BASE_URL}/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('No se pudo crear el paciente');
  return res.json();
}

export async function updatePatient(id: string, data: Partial<Patient>): Promise<Patient> {
  const res = await fetch(`${BASE_URL}/patients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  console.log(res);
  if (!res.ok) throw new Error('No se pudo actualizar el paciente');
  return res.json();
}

export async function deletePatient(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/patients/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('No se pudo eliminar el paciente');
}


export type ExamType = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  unit?: string | null;
  refRange?: string | null;
};

export type Result = {
  id: string;
  orderItemId: string;
  value: string;
  observedAt: string;
  unit?: string | null;
  refRange?: string | null;
};

export async function listOrders(patientId: string): Promise<TestOrder[]> {
  const url = new URL(`${BASE_URL}/orders`);
  url.searchParams.set('patientId', patientId);
  const r = await fetch(url.toString());
  if (!r.ok) throw new Error('Error cargando análisis');
  return r.json();
}

export async function createOrder(payload: {
  patientId: string;
  orderNumber?: string;
  title?: string;
  doctorName?: string;
  examCodes: string[];
  notes?: string;
}): Promise<TestOrder> {
  const resp = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error('No se pudo crear el análisis');
  return resp.json();
}

export async function upsertOrderItemResult(orderItemId: string, payload: {
  value: string; unit?: string; refRange?: string;
}) {
  const r = await fetch(`${BASE_URL}/order-items/${orderItemId}/result`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error('No se pudo guardar el resultado');
  return r.json();
}

export type Nomen = { codigo: number | string; determinacion: string; ub: number };
// Para autocompletar nomenclador
export async function getNomencladorAll(): Promise<Nomen[]> {
  const r = await fetch(`${BASE_URL}/nomenclador/all`);
  if (!r.ok) throw new Error('No se pudo cargar el nomenclador');
  const { rows } = await r.json();
  return rows as Nomen[];
}

import { OrderStatus } from './utils/status';

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const r = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!r.ok) throw new Error('No se pudo actualizar el estado');
  return r.json();
}

export async function deleteOrder(orderId: string) {
  const r = await fetch(`${BASE_URL}/orders/${orderId}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(await r.text());
}

export async function getPatient(id: string): Promise<Patient> {
  const r = await fetch(`${BASE_URL}/patients/${id}`);
  if (!r.ok) throw new Error('No se pudo cargar el paciente');
  return r.json();
}

export async function fetchExamItemsByCode(code: string): Promise<{ examType: ExamType; items: ExamItemDef[] }> {
  const r = await fetch(`${BASE_URL}/exam-item-def?code=${encodeURIComponent(code)}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createExamItemDef(input: {
  code: string; key: string; label: string; unit?: string; kind?: string; sortOrder?: number; refText?: string | null;
}): Promise<ExamItemDef> {
  const r = await fetch(`${BASE_URL}/exam-item-def`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function updateExamItemDef(id: string, patch: Partial<Pick<ExamItemDef, 'key' | 'label' | 'unit' | 'kind' | 'sortOrder' | 'refText'>>): Promise<ExamItemDef> {
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

export type ExamItemDef = { id: string; key: string; label: string; unit?: string | null; kind: string; sortOrder: number; refText?: string | null; };

export type OrderItemAnalyte = {
  id: string;
  orderItemId: string;
  itemDefId: string;
  valueNum?: number | null;
  valueText?: string | null;
  unit?: string | null;
  status: string;
  itemDef: ExamItemDef;
};

export type OrderItem = {
  id: string;
  examTypeId: string;
  examType: { code: string; name: string };
  analytes: OrderItemAnalyte[];
};

export interface TestOrder {
  id: string;
  orderNumber: string;
  title?: string;
  createdAt: string;
  notes?: string;
  patientId: string;
  patient: Patient;  
  doctorId?: string;
  doctor?: { fullName?: string | null } | null;   
  items: OrderItem[];
}

export async function getOrder(id: string): Promise<TestOrder> {
  const r = await fetch(`${BASE_URL}/orders/${id}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// export async function updateOrderAnalyte(orderItemId: string, analyteId: string, value: string | number | null) {
//   const r = await fetch(`${BASE_URL}/orders/order-items/${orderItemId}/analytes/${analyteId}`, {
//     method: 'PUT',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ value }),
//   });
//   if (!r.ok) throw new Error(await r.text());
//   return r.json();
// }

export async function updateAnalytesBulk(orderId: string, updates: {
  orderItemId: string; analyteId: string; value: string | number | null;
}[]) {
  const r = await fetch(`${BASE_URL}/orders/${orderId}/analytes/bulk`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// api.ts
export async function generateOrderReport(orderId: string): Promise<Blob> {
  const response = await fetch(`${BASE_URL}/orders/${orderId}/report`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Error generando el informe');
  }

  return await response.blob();
}
const BASE_URL = import.meta.env.VITE_API_URL
import { type Patient } from './PatientApi'
import { type ExamItemDef } from './ExamItemDefApi';
import { OrderStatus } from '../utils/status';

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

export type OrderItemAnalyte = {
    id: string;
    orderItemId: string;
    itemDefId: string;
    valueNum?: number | null;
    valueText?: string | null;
    unit?: string | null;
    status: string;
    itemDef: ExamItemDef;
    method?: string | null;
};

export type OrderItem = {
    id: string;
    examTypeId: string;
    examType: { code: string; name: string };
    analytes: OrderItemAnalyte[];
};

export interface TestOrder {
    id: string;
    orderNumber: string | null;
    title?: string | null;
    createdAt: string;
    notes?: string | null;
    patientId: string;
    patient: Patient;
    doctorId?: string;
    doctor?: { fullName?: string | null } | null;
    items: OrderItem[];
}

export type Nomen = {
    codigo: number | string;
    determinacion: string;
    ub: number
};

export async function listOrders(patientId: string): Promise<TestOrder[]> {
    const url = new URL(`${BASE_URL}/orders`);
    url.searchParams.set('patientId', patientId);
    const r = await fetch(url.toString());
    if (!r.ok) throw new Error('Error cargando análisis');
    return r.json();
}

export async function getOrder(id: string): Promise<TestOrder> {
    const r = await fetch(`${BASE_URL}/orders/${id}`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function createOrder(payload: {
    patientId: string;
    orderNumber?: string | null;
    title?: string | null;
    doctorId?: string;
    examCodes: string[];
    methodPay: string | null,
}): Promise<TestOrder> {
    const resp = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error('No se pudo crear el análisis');
    return resp.json()

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

export async function deleteOrderItem(itemId: string): Promise<void> {
    const r = await fetch(`${BASE_URL}/orders/items/${itemId}`, {
        method: 'DELETE'
    });
    if (!r.ok) throw new Error('No se pudo eliminar el item');
    return r.json();
}

export async function getNomencladorAll(): Promise<Nomen[]> {
    const r = await fetch(`${BASE_URL}/nomenclador/all`);
    if (!r.ok) throw new Error('No se pudo cargar el nomenclador');
    const { rows } = await r.json();
    return rows as Nomen[];
}

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

export async function updateOrder(id: string, body: {
    orderNumber?: string | null, title?: string | null; doctorId?: string | null; notes?: string | null; methodPay: string | null;
}) {
    const r = await fetch(`${BASE_URL}/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function addOrderItemsByCodes(id: string, codes: string[]) {
    const r = await fetch(`${BASE_URL}/orders/${id}/items:addByCodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

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


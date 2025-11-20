// cuenta clientes
const BASE_URL = import.meta.env.VITE_API_URL
// api.ts — funciones para cuenta de paciente
export type AccountEntryKind = 'CHARGE' | 'PAYMENT' | 'ADJUSTMENT'


export type AccountEntry = {
  id: string
  patientId: string
  kind: AccountEntryKind
  amountCents: number
  description?: string | null
  testOrder?: { id: string; orderNumber: string | null } | null
  orderItem?: { id: string } | null
  createdAt: string
}


export async function getAccountSummary(patientId: string) {
  const r = await fetch(`${BASE_URL}/patients/${patientId}/account/summary`)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<{ total: number; pagado: number; ajustes: number; saldoDeudor: number; tieneDeuda: boolean }>
}


export async function listAccountEntries(patientId: string) {
  const r = await fetch(`${BASE_URL}/patients/${patientId}/account/entries`)
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<AccountEntry[]>
}


export async function createAccountEntry(patientId: string, body: { kind: AccountEntryKind; amount: number | string; description?: string; testOrderId?: string | null; orderItemId?: string | null; }) {
  const r = await fetch(`${BASE_URL}/patients/${patientId}/account/entries`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<AccountEntry>
}


export async function deleteAccountEntry(patientId: string, entryId: string) {
  const r = await fetch(`${BASE_URL}/patients/${patientId}/account/entries/${entryId}`, { method: 'DELETE' })
  if (!r.ok) throw new Error(await r.text())
}

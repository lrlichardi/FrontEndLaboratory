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
  diabetico?: boolean | null;
  tiroides?: boolean | null;
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
  if (!res.ok) throw new Error('No se pudo actualizar el paciente');
  return res.json();
}

export async function deletePatient(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/patients/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('No se pudo eliminar el paciente');
}

export async function getPatient(id: string): Promise<Patient> {
  const r = await fetch(`${BASE_URL}/patients/${id}`);
  if (!r.ok) throw new Error('No se pudo cargar el paciente');
  return r.json();
}

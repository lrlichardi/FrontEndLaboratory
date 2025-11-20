const BASE_URL = import.meta.env.VITE_API_URL

// Tipos
export type Doctor = {
  id: string;
  fullName: string | null;
  licenseNumber?: string | null;
  phone?: string | null;
  email?: string | null;
};


// Listar (opcional: ?q=)
export async function listDoctors(q?: string): Promise<Doctor[]> {
  const url = new URL(`${BASE_URL}/doctors`);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Error cargando pacientes');
  return res.json();
}

export async function createDoctor(input: Partial<Doctor>): Promise<Doctor> {

  const r = await fetch(`${BASE_URL}/doctors`, {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function updateDoctor(id: string, body: Partial<Doctor>): Promise<Doctor> {
  const r = await fetch(`${BASE_URL}/doctors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function deleteDoctor(id: string): Promise<void> {
  const r = await fetch(`${BASE_URL}/doctors/${id}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(await r.text());
}
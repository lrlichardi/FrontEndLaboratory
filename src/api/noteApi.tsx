// notas de pacientes  api
const BASE_URL = import.meta.env.VITE_API_URL

export type PatientNote = {
    id: string;
    patientId: string;
    text: string;
    createdAt: string; // ISO
    updatedAt: string; // ISO
};

// Notas de pacientes

export async function listPatientNotes(patientId: string): Promise<PatientNote[]> {
    const r = await fetch(`${BASE_URL}/patient-notes/patient/${patientId}`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function createPatientNote(patientId: string, text: string): Promise<PatientNote> {
    const r = await fetch(`${BASE_URL}/patient-notes/patient/${patientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function updatePatientNote(id: string, text: string): Promise<PatientNote> {
    const r = await fetch(`${BASE_URL}/patient-notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function deletePatientNote(id: string): Promise<void> {
    const r = await fetch(`${BASE_URL}/patient-notes/${id}`, {
        method: 'DELETE',
    });
    if (!r.ok) throw new Error(await r.text());
}

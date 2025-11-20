// OBRAS SSOCIALES
const BASE_URL = import.meta.env.VITE_API_URL

export type SocialWork = {
    id: string;
    name: string;
    createdAt?: string;
    updatedAt?: string;
};

export async function listSocialWorks(query = '', page = 1, pageSize = 10): Promise<{ data: SocialWork[]; total: number }> {
    const qs = new URLSearchParams({ query, page: String(page), pageSize: String(pageSize) });
    const res = await fetch(`${BASE_URL}/social-works?${qs.toString()}`);
    if (!res.ok) throw new Error('Error cargando obras sociales');
    return res.json();
}

export async function createSocialWork(payload: Pick<SocialWork, 'name'>) {
    const res = await fetch(`${BASE_URL}/social-works`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'No se pudo crear');
    return data;
}

export async function updateSocialWork(id: string, payload: Pick<SocialWork, 'name'>) {
    const res = await fetch(`${BASE_URL}/social-works/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'No se pudo actualizar');
    return data;
}

export async function deleteSocialWork(id: string) {
    const res = await fetch(`${BASE_URL}/social-works/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'No se pudo eliminar');
    return data;
}

const BASE_URL = import.meta.env.VITE_API_URL

export async function apiGetPriceFactor(): Promise<number> {
  const res = await fetch(`${BASE_URL}/price/price-factor`, {
    method: 'GET',
  });

  if (!res.ok) {
    throw new Error('No se pudo obtener el factor de precio');
  }

  const data = await res.json();
  return data.factor as number;
}

export async function apiUpdatePriceFactor(factor: number): Promise<number> {

  const intFactor = Math.round(factor);

  const res = await fetch(`${BASE_URL}/price/price-factor`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ factor: intFactor }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `No se pudo actualizar el factor de precio: ${res.status} ${text}`,
    );
  }

  const data = await res.json();
  return data.factor as number;
}


// Tipos que esperamos desde el backend
export interface DashboardSummary {
    totalAnalysesMonth: number;        // total de análisis del mes
    totalPrivateAnalyses: number;      // análisis "particulares" (sin obra social)
    totalSocialWorkAnalyses: number;   // análisis con obra social
    totalAmountExpected: number;       // total $ que deberías cobrar en el mes
}

export interface AnalysesPerMonthPoint {
    month: string;  // '2025-12', '2025-11', etc.
    count: number;
}

export interface AnalysesBySocialWorkItem {
    socialWorkName: string; // nombre de la obra social
    analysesCount: number;  // cantidad de análisis en el mes
    amount: number;         // monto total facturado/esperado
}

export interface DashboardData {
    summary: DashboardSummary;
    analysesPerMonth: AnalysesPerMonthPoint[];
    analysesBySocialWork: AnalysesBySocialWorkItem[];
}

const BASE_URL = import.meta.env.VITE_API_URL

export const fetchDashboardData = async (month: string): Promise<DashboardData> => {
  const params = new URLSearchParams({ month });

  const res = await fetch(`${BASE_URL}/dashboard?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    // Podés mejorar este error con más info si querés
    throw new Error(`Error al cargar dashboard: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as DashboardData;
  return data;
};

import { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Stack, Typography, Button } from '@mui/material';
import PatientAccountTab from '../components/PatientAccountTab'; // o la ruta donde lo tengas
import { listOrders } from '../api';

type OrderMin = { id: string; orderNumber?: string | null };

export default function PatientAccountPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const [orders, setOrders] = useState<OrderMin[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    listOrders(patientId)
      .then((os) => {
        // si listOrders devuelve más campos, mapeamos solo lo que necesita el tab
        setOrders(os.map((o: any) => ({ id: o.id, orderNumber: o.orderNumber ?? null })));
      })
      .finally(() => setLoading(false));
  }, [patientId]);

  if (!patientId) return null;

  return (
    <Box p={2}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>Cuenta del paciente</Typography>
        <Box flex={1} />
        <Button component={RouterLink} to={`/patients/`}>Volver a la ficha</Button>
      </Stack>

      {/* items es opcional; si luego querés, podés cargar OrderItem[] y pasarlos también */}
      <PatientAccountTab patientId={patientId} orders={orders} />
    </Box>
  );
}

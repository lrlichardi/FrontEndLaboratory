import { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Stack, Typography, Button } from '@mui/material';
import PatientAccountTab from '../components/PatientAccountTab'; 
import { getPatient } from '../api/PatientApi';
import {listOrders} from '../api/OrderApi';

type OrderMin = { id: string; orderNumber?: string | null };

type PatientMin = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  dni?: string | number | null;
};


export default function PatientAccountPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const [orders, setOrders] = useState<OrderMin[]>([]);
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState<PatientMin | null>(null);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    Promise.all([
      listOrders(patientId),
      getPatient(patientId).catch(() => null), // por si 404
    ])
      .then(([os, p]) => {
        setOrders(os.map((o: any) => ({ id: o.id, orderNumber: o.orderNumber ?? null })));
        if (p) setPatient(p as PatientMin);
      })
      .finally(() => setLoading(false));
  }, [patientId]);

  if (!patientId) return null;

  const fullName =
    patient ? `${patient.lastName ?? ''} ${patient.firstName ?? ''}`.trim() : '';
  const dniText = patient?.dni != null && patient?.dni !== '' ? ` (DNI: ${patient.dni})` : '';

  return (
    <Box p={2}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>Cuenta del paciente    {patient && ` — ${fullName}${dniText}`}</Typography>
        <Box flex={1} />
        <Button component={RouterLink} to={`/patients/`}>Volver a la ficha</Button>
      </Stack>

      {/* items es opcional; si luego querés, podés cargar OrderItem[] y pasarlos también */}
      <PatientAccountTab patientId={patientId} orders={orders} />
    </Box>
  );
}

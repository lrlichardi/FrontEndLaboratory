import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { Box, Button, CircularProgress, Alert, Typography } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getOrder, type TestOrder, type OrderItemAnalyte } from '../api/OrderApi';
import { capitalize } from '../utils/utils';
import { isUrineExamCode, groupUrineAnalytes, urinePrefixTitle } from '../utils/orinaCompleta';

/**
 * Guía compacta para impresión en 1 hoja.
 * - Muestra: Paciente (apellido, nombre), DNI, N° de orden, fecha, médico
 * - Lista TODOS los ítems a analizar (códigos + determinaciones)
 * - Deja una columna en blanco para anotar resultados a mano
 * - Ajustada para caber en 1 A4 (márgenes + tipografía compacta)
 */
export default function PrintGuidePage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [order, setOrder] = useState<TestOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    getOrder(orderId)
      .then(setOrder)
      .catch((e: any) => setError(e.message || 'Error cargando el análisis'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handlePrint = () => window.print();
  const handleBack = () => {
    if (location.state?.from) navigate(location.state.from);
    else if (order?.patientId) navigate(`/patients/${order.patientId}/analyses`);
    else navigate(-1);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'No se encontró el análisis'}</Alert>
        <Button onClick={handleBack} sx={{ mt: 2 }}>Volver</Button>
      </Box>
    );
  }

  /** Devuelve una lista plana de filas para imprimir en la guía
   *  Estructura: { code, examName, label }
   */
  type Row = { code: string; examName: string; label: string; section?: string };
  const rows: Row[] = [];

  order.items.forEach((item) => {
    if (isUrineExamCode(item.examType.code)) {
      const groups = groupUrineAnalytes(item.analytes);
      const pushGroup = (title: string, arr: OrderItemAnalyte[]) => {
        if (arr.length === 0) return;
        rows.push({ code: item.examType.code, examName: item.examType.name, label: `— ${title} —`, section: 'header' });
        arr.forEach((a) => rows.push({ code: item.examType.code, examName: item.examType.name, label: capitalize(a.itemDef.label) }));
      };
      pushGroup(urinePrefixTitle.EF, groups.EF);
      pushGroup(urinePrefixTitle.EQ, groups.EQ);
      pushGroup(urinePrefixTitle.EM, groups.EM);
    } else if (item.analytes.length <= 1) {
      const a = item.analytes[0];
      rows.push({ code: item.examType.code, examName: item.examType.name, label: a ? capitalize(a.itemDef.label) : capitalize(item.examType.name) });
    } else {
      // Múltiples analitos: encabezado + cada determinación
      rows.push({ code: item.examType.code, examName: item.examType.name, label: `— ${capitalize(item.examType.name)} —`, section: 'header' });
      item.analytes.forEach((a) => rows.push({ code: item.examType.code, examName: item.examType.name, label: capitalize(a.itemDef.label) }));
    }
  });

  return (
    <>
      <Box sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(4px)',
        border: 'none'
      }}>
        {/* Acciones visibles solo en pantalla */}
        <Box className="no-print" sx={{ position: 'sticky', top: 0, zIndex: 2, bgcolor: 'white', p: 1, borderBottom: '1px solid #eee' }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mr: 1 }}>
            Volver
          </Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
            Imprimir / PDF
          </Button>
          <Button component={RouterLink} to={`/orders/${orderId}`} sx={{ ml: 1 }}>
            Ir al detalle de carga
          </Button>
        </Box>

        {/* Contenido a imprimir */}
        <Box id="guide-root" sx={{
          maxWidth: '800px',
          m: '0 auto',
          backgroundColor: 'white',
          minHeight: '100vh',
          px: 2,
          pb: 4,
          fontFamily: 'Arial, sans-serif',
        }}>
          {/* Encabezado comprimido */}
          <Box sx={{ textAlign: 'center', borderBottom: '2px solid #000', mb: 1 }}>
            <Typography component="h1" sx={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.2 }}>GUÍA DE CARGA</Typography>
          </Box>

          {/* Datos del paciente (compacto en 2 columnas) */}
          <Box sx={{
            display: 'grid', gridTemplateColumns:'repeat(3, 1fr)', 
            fontSize: 12, mb: 0.5
          }}>
            <Box><strong>Paciente:</strong> {order.patient.lastName}, {order.patient.firstName}</Box>
            <Box><strong>DNI:</strong> {order.patient.dni || '—'}</Box>
            <Box><strong>N° Orden:</strong> {order.orderNumber || '—'}</Box>
            <Box><strong>Fecha:</strong> {new Date(order.createdAt).toLocaleDateString('es-AR')}</Box>
            <Box><strong>Médico:</strong> {order.doctor?.fullName || '—'}</Box>
            <Box><strong>Ítems:</strong> {rows.length}</Box>
            <Box><strong>Protocolo:</strong> {order.id}</Box>
          </Box>

          {/* === NUEVO: Dos columnas mitad/mitad sin código === */}
          {(() => {
            const mid = Math.ceil(rows.length / 2);
            const left = rows.slice(0, mid);
            const right = rows.slice(mid);
            const Table = ({ data }: { data: Row[] }) => (
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <Box component="thead" sx={{ display: 'table-header-group' }}>
                  <Box component="tr">
                    <Box component="th" sx={{ textAlign: 'left', borderBottom: '1px solid #000', p: '3px 4px' }}>Determinación / Sección</Box>
                    <Box component="th" sx={{ textAlign: 'left', borderBottom: '1px solid #000', p: '3px 4px', width: 150 }}>Resultado</Box>
                  </Box>
                </Box>
                <Box component="tbody">
                  {data.map((r, i) => (
                    <Box component="tr" key={i} sx={{ pageBreakInside: 'avoid' }}>
                      <Box component="td" sx={{ p: '2px 4px' }}>
                        {r.section === 'header' ? (
                          <span style={{ fontWeight: 700 }}>{r.label}</span>
                        ) : (
                          r.label
                        )}
                      </Box>
                      <Box component="td" sx={{ p: 0 }}>
                        <Box sx={{ height: 16, borderBottom: '1px dotted #666', mx: 0.5 }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            );
            return (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Table data={left} />
                <Table data={right} />
              </Box>
            );
          })()}
        </Box>

        {/* Estilos de impresión optimizados para 1 hoja A4 y dos columnas */}
        <style>{`
        @media print {
          @page { size: A4; margin: 8mm 8mm 10mm 8mm; }
          body * { visibility: hidden !important; }
          #guide-root, #guide-root * { visibility: visible !important; }
          #guide-root { position: absolute; left: 0; top: 0; width: 100%; }
          #guide-root { font-size: 10.5px; }
          #guide-root table th, #guide-root table td { padding: 2px 4px !important; }
          tr, thead, tbody { page-break-inside: avoid; }
          /* columnas */
          #guide-root .MuiBox-root[style*='grid-template-columns: 1fr 1fr'] { gap: 10px !important; }
        }
      `}
        </style>
      </Box>
    </>
  )
}

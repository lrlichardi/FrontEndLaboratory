import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTheme, useMediaQuery, Box, Button, CircularProgress, Alert, IconButton, Tooltip } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getOrder, type TestOrder } from '../api';
import { normalizeSex, shouldApplySexAgeFilter, refTextBySexAndAge } from '../utils/refTextSexAge';

function calculateAge(birthDate: Date | string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/** ¿El texto tiene F: y M:? */
// export function needsSexFilter(refText?: string | null): boolean {
//   if (!refText) return false;
//   const t = String(refText);
//   return /\bF\s*:/.test(t) && /\bM\s*:/.test(t);
// }

/** Devuelve SOLO la parte de F o M (si existen ambas etiquetas). */
// export function refTextBySex(refText?: string | null, sex?: SexLike): string {
//   if (!refText) return '';
//   const t = String(refText).replace(/\s+/g, ' ').trim();
//   const s = normalizeSex(sex);

//   // si no están ambas etiquetas -> no filtramos
//   if (!needsSexFilter(t)) return t;

//   const parts = [...t.matchAll(/\b([FM])\s*:\s*([^FM]+?)(?=\b[FM]\s*:|$)/gi)];
//   const map: Record<'F' | 'M', string> = { F: '', M: '' } as any;
//   for (const [, tag, val] of parts) {
//     map[(tag as string).toUpperCase() as 'F' | 'M'] =
//       String(val).trim().replace(/^[;,\-–—·\s]+|[;,\-–—·\s]+$/g, '');
//   }
//   return (s && map[s]) || t;
// }


export default function ReportPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<TestOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (!orderId) return;

    getOrder(orderId)
      .then(setOrder)
      .catch((e: any) => setError(e.message || 'Error cargando el análisis'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    // Usar el estado pasado desde la página anterior
    if (location.state?.from) {
      navigate(location.state.from);
    } else if (order?.patientId) {
      // Fallback: ir a la lista de análisis del paciente
      navigate(`/patients/${order.patientId}/analyses`);
    } else {
      // Último fallback: volver atrás en el historial
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
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

  const age = calculateAge(order.patient.birthDate);

  // Función para verificar si es hemograma
  const isHemograma = (name: string) => {
    return name.toUpperCase().includes('HEMOGRAMA');
  };

  const sex = normalizeSex(order.patient.sex);

  return (
    <>
      <Box className="no-print" sx={{ py: 1, mb: 1, bgcolor: 'transparent' }}>
        <Box sx={{
          maxWidth: 800,
          mx: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: 1
        }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ bgcolor: 'white' }} > Volver </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
          >
            Imprimir
          </Button>
        </Box>
      </Box>

      {/* Contenido del informe */}
      <Box sx={{
        maxWidth: '800px',
        margin: '0 auto',
        pl: 2,
        pr: 2,
        pt: 2,
        fontFamily: 'Arial, sans-serif',
        backgroundColor: 'white',
        minHeight: '100vh'
      }}>

        {/* Encabezado */}
        <Box sx={{
          textAlign: 'center',
          borderBottom: '3px solid #1976d2',
          paddingBottom: '20px',
          marginBottom: '30px'
        }}>
          <Box component="h1" sx={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#1976d2',
            margin: '0 0 8px 0'
          }}>
            Laboratorio Clínico
          </Box>
          <Box component="h3" sx={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#1976d2',
            margin: '0 0 8px 0'
          }}>
            Bioquímica María Fátima Perez
            MP:1094
          </Box>
          <Box sx={{
            fontSize: '14px',
            color: '#666',
            margin: 0
          }}>
            AV. SANTO CRISTO 571 BANDA RIO SALI	• Tel: 3816526258
          </Box>
        </Box>

        {/* Título del informe */}
        <Box component="h2" sx={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#333',
          marginBottom: '20px',
          textTransform: 'uppercase',
          borderBottom: '2px solid #e0e0e0',
          paddingBottom: '10px'
        }}>
          Informe de Análisis Clínicos
        </Box>

        {/* Datos del paciente */}
        <Box sx={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
          border: '1px solid #e0e0e0'
        }}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            fontSize: '14px'
          }}>
            <Box>
              <Box component="strong" sx={{ color: '#666' }}>Paciente:</Box>
              <Box sx={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>
                {order.patient.lastName}, {order.patient.firstName}
              </Box>
            </Box>
            <Box>
              <Box component="strong" sx={{ color: '#666' }}>DNI:</Box>
              <Box sx={{ fontSize: '16px', marginTop: '4px' }}>
                {order.patient.dni}
              </Box>
            </Box>
            <Box>
              <Box component="strong" sx={{ color: '#666' }}>Edad:</Box>
              <Box sx={{ fontSize: '16px', marginTop: '4px' }}>
                {age} años
              </Box>
            </Box>
            <Box>
              <Box component="strong" sx={{ color: '#666' }}>Sexo:</Box>
              <Box sx={{ fontSize: '16px', marginTop: '4px' }}>
                {order.patient.sex}
              </Box>
            </Box>
            <Box>
              <Box component="strong" sx={{ color: '#666' }}>Fecha:</Box>
              <Box sx={{ fontSize: '16px', marginTop: '4px' }}>
                {new Date(order.createdAt).toLocaleDateString('es-AR')}
              </Box>
            </Box>
            <Box>
              <Box component="strong" sx={{ color: '#666' }}>Médico:</Box>
              <Box sx={{ fontSize: '16px', marginTop: '4px' }}>
                {order.doctor?.fullName || '—'}
              </Box>
            </Box>
            {order.patient.obraSocial && (
              <>
                <Box>
                  <Box component="strong" sx={{ color: '#666' }}>Obra Social:</Box>
                  <Box sx={{ fontSize: '16px', marginTop: '4px' }}>
                    {order.patient.obraSocial}
                  </Box>
                </Box>
              </>
            )}
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Box component="strong" sx={{ color: '#666' }}>N° de Orden:</Box>
              <Box sx={{ fontSize: '16px', marginTop: '4px' }}>
                {order.orderNumber}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Resultados */}
        <Box component="h3" sx={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#333',
          marginBottom: '20px',
          textTransform: 'uppercase',
          borderBottom: '2px solid #1976d2',
          paddingBottom: '8px'
        }}>
          Resultados
        </Box>

        {order.items.map((item) => {
          const hasSingleAnalyte = item.analytes.length === 1;
          const isHemo = isHemograma(item.examType.name);

          return (
            <Box key={item.id} sx={{
              marginBottom: '30px',
              pageBreakInside: 'avoid'
            }}>
              {/* Nombre del estudio - Solo si tiene más de 1 ítem */}
              {!hasSingleAnalyte && (
                <>
                  <Box sx={{
                    backgroundColor: '#e3f2fd',
                    padding: '12px 16px',
                    borderRadius: '4px',
                    marginBottom: '12px',
                    borderLeft: '4px solid #1976d2'
                  }}>
                    <Box sx={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#1976d2'
                    }}>
                      {item.examType.name}
                    </Box>
                  </Box>

                  {/* Descripción especial para hemograma */}
                  {isHemo && (
                    <Box sx={{
                      fontSize: '13px',
                      color: '#666',
                      fontStyle: 'italic',
                      marginBottom: '12px',
                      paddingLeft: '16px'
                    }}>
                      Contador Hematológico
                    </Box>
                  )}
                </>
              )}

              {/* Tabla de resultados */}
              <Box component="table" sx={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <Box component="thead">
                  <Box component="tr" sx={{ backgroundColor: '#f5f5f5' }}>
                    <Box component="th" sx={{
                      padding: '10px',
                      textAlign: 'left',
                      borderBottom: '2px solid #ddd',
                      fontWeight: 'bold'
                    }}>
                      Determinación
                    </Box>
                    <Box component="th" sx={{
                      padding: '10px',
                      textAlign: 'right',
                      borderBottom: '2px solid #ddd',
                      fontWeight: 'bold',
                      width: '120px'
                    }}>
                      Resultado
                    </Box>
                    <Box component="th" sx={{
                      padding: '10px',
                      textAlign: 'center',
                      borderBottom: '2px solid #ddd',
                      fontWeight: 'bold',
                      width: '80px'
                    }}>
                      Unidad
                    </Box>
                    <Box component="th" sx={{
                      padding: '10px',
                      textAlign: 'left',
                      borderBottom: '2px solid #ddd',
                      fontWeight: 'bold',
                      width: '180px'
                    }}>
                      Valores de Referencia
                    </Box>
                  </Box>
                </Box>
                <Box component="tbody">
                  {item.analytes.map((analyte) => {
                    const showRef = shouldApplySexAgeFilter({
                      itemKey: analyte.itemDef.key,
                      itemLabel: analyte.itemDef.label?.toUpperCase?.(),
                      examName: item.examType.name?.toUpperCase?.(),
                    })
                      ? refTextBySexAndAge(analyte.itemDef.refText, sex, age)
                      : (analyte.itemDef.refText || '—');
                    const value = analyte.valueNum ?? analyte.valueText ?? '—';
                    const unit = analyte.unit || analyte.itemDef.unit || '-';

                    return (
                      <Box component="tr" key={analyte.id} sx={{
                        borderBottom: '1px solid #eee'
                      }}>
                        <Box component="td" sx={{ padding: '12px' }}>
                          {analyte.itemDef.label}
                        </Box>
                        <Box component="td" sx={{
                          padding: '12px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          fontSize: '15px'
                        }}>
                          {value}
                        </Box>
                        <Box component="td" sx={{
                          padding: '12px',
                          textAlign: 'center',
                          color: '#666'
                        }}>
                          {unit}
                        </Box>
                        <Box component="td" sx={{
                          padding: '12px',
                          color: '#666',
                          fontSize: '13px'
                        }}>
                          {showRef || '—'}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          );
        })}

        {/* Observaciones */}
        {order.notes && (
          <Box sx={{
            marginTop: '30px',
            padding: '16px',
            backgroundColor: '#fff9e6',
            borderLeft: '4px solid #ffc107',
            borderRadius: '4px'
          }}>
            <Box sx={{
              fontWeight: 'bold',
              marginBottom: '8px',
              color: '#333'
            }}>
              Observaciones:
            </Box>
            <Box sx={{ color: '#666', fontSize: '14px' }}>
              {order.notes}
            </Box>
          </Box>
        )}

        {/* Firma */}
        <Box sx={{
          marginTop: '60px',
          paddingTop: '20px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-around'
        }}>
          <Box sx={{ textAlign: 'center', minWidth: '200px' }}>
            <Box sx={{
              borderTop: '1px solid #333',
              marginTop: '50px',
              paddingTop: '8px',
              fontSize: '12px',
              color: '#666'
            }}>
              Firma del Profesional
            </Box>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{
          marginTop: '40px',
          paddingTop: '20px',
          borderTop: '1px solid #e0e0e0',
          textAlign: 'center',
          fontSize: '11px',
          color: '#999'
        }}>
          Este informe es válido únicamente con firma y sello del profesional responsable
        </Box>
      </Box>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          .MuiAppBar-root,
          header,
          nav,
          .app-navbar,
          .no-print {
            display: none !important;
          }
          
          @page {
            margin: 1.5cm;
            size: A4;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        
        @media screen {
          body {
            background-color: #f0f0f0;
            
          }
        }
      `}</style>
    </>
  );
}
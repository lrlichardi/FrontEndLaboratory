import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, CircularProgress, Alert } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getOrder, type TestOrder } from '../api';
import { capitalize } from '../utils/utils';
// Helpers sexo/edad (ajustá la ruta si difiere)
import { shouldApplySexAgeFilter, refTextBySexAndAge } from '../utils/refTextSexAge';
// Agrupador de orina
import { isUrineExamCode, groupUrineAnalytes, urinePrefixTitle } from '../utils/orinaCompleta';


function calculateAge(birthDate: Date | string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}



export default function ReportPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<TestOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (!orderId) return;
    getOrder(orderId)
      .then(setOrder)
      .catch((e: any) => setError(e.message || 'Error cargando el análisis'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handlePrint = () => window.print();

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else if (order?.patientId) {
      navigate(`/patients/${order.patientId}/analyses`);
    } else {
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
  const sex = order.patient.sex;

  // Para mostrar unidad junto al texto de referencia si corresponde
  const withUnit = (txt: string | null | undefined, unit: string | null | undefined) => {
    const t = (txt ?? '').trim();
    const u = (unit ?? '').trim();
    if (!t) return '';
    return u ? `${t} ${u}` : t;
  };

  const isHemograma = (name: string) => name.toUpperCase().includes('HEMOGRAMA');

  return (
    <>
      {/* Botones de acción - Solo visible en pantalla */}
      <Box className="no-print" sx={{
        position: 'absolute',
        top: 70,
        left: 30,
        zIndex: 0,
        display: 'flex',
        gap: 1
      }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ bgcolor: 'white' }}>
          Volver
        </Button>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
          Imprimir / Guardar PDF
        </Button>
      </Box>

      {/* Contenido del informe */}
      <Box id="report-root"
        sx={{
          maxWidth: '800px',
          margin: '0 auto',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: 'white',
          minHeight: '100vh',
        }}>
        {/* Encabezado */}
        <Box sx={{ textAlign: 'center', borderBottom: '3px solid #1976d2', paddingBottom: '20px', marginBottom: '30px' }}>
          <Box component="h1" sx={{ fontSize: '28px', fontWeight: 'bold', color: '#1976d2', m: 0, mb: 1 }}>
            Laboratorio Clínico
          </Box>
          <Box component="h3" sx={{ fontSize: '20px', fontWeight: 'bold', color: '#1976d2', m: 0, mb: 1 }}>
            Bioquímica María Fátima Perez
            MP:1094
          </Box>
          <Box sx={{ fontSize: '14px', color: '#666', m: 0 }}>
            AV. SANTO CRISTO 571 BANDA RIO SALI • Tel: 3816526258
          </Box>
        </Box>

        {/* Título */}
        <Box component="h2" sx={{
          fontSize: '20px', fontWeight: 'bold', color: '#333', mb: 2,
          textTransform: 'uppercase', borderBottom: '2px solid #e0e0e0', pb: '10px'
        }}>
          Informe de Análisis Clínicos
        </Box>

        {/* Datos del paciente */}
        <Box sx={{
          backgroundColor: '#f8f9fa', p: 2.5, borderRadius: '8px', mb: 3, border: '1px solid #e0e0e0'
        }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
            <Box>
              <Box component="strong" sx={{ color: '#666' }}>Paciente:</Box>
              <Box sx={{ fontSize: '16px', fontWeight: 'bold', mt: 0.5 }}>
                {order.patient.lastName}, {order.patient.firstName}
              </Box>
            </Box>
            <Box>
              <Box component="strong" sx={{ color: '#666' }}>DNI:</Box>
              <Box sx={{ fontSize: '16px', mt: 0.5 }}>{order.patient.dni}</Box>
            </Box>
            <Box>
              <Box component="strong" sx={{ color: '#666' }}>Edad:</Box>
              <Box sx={{ fontSize: '16px', mt: 0.5 }}>{age} años</Box>
            </Box>
            <Box>
              <Box component="strong" sx={{ color: '#666' }}>Sexo:</Box>
              <Box sx={{ fontSize: '16px', mt: 0.5 }}>{order.patient.sex}</Box>
            </Box>
            <Box>
              <Box component="strong" sx={{ color: '#666' }}>Fecha:</Box>
              <Box sx={{ fontSize: '16px', mt: 0.5 }}>
                {new Date(order.createdAt).toLocaleDateString('es-AR')}
              </Box>
            </Box>
            <Box>
              <Box component="strong" sx={{ color: '#666' }}>Médico:</Box>
              <Box sx={{ fontSize: '16px', mt: 0.5 }}>{order.doctor?.fullName || '—'}</Box>
            </Box>
            {order.patient.obraSocial && (
              <Box>
                <Box component="strong" sx={{ color: '#666' }}>Obra Social:</Box>
                <Box sx={{ fontSize: '16px', mt: 0.5 }}>{order.patient.obraSocial}</Box>
              </Box>
            )}
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Box component="strong" sx={{ color: '#666' }}>N° de Orden:</Box>
              <Box sx={{ fontSize: '16px', mt: 0.5 }}>{order.orderNumber}</Box>
            </Box>
          </Box>
        </Box>

        {/* Resultados */}
        <Box component="h3" sx={{
          fontSize: '18px', fontWeight: 'bold', color: '#333', mb: 2,
          textTransform: 'uppercase', borderBottom: '2px solid #1976d2', pb: '8px'
        }}>
          Resultados
        </Box>

        {order.items.map((item) => {
          const hasSingleAnalyte = item.analytes.length === 1;
          const isHemo = isHemograma(item.examType.name);

          return (
            <Box key={item.id} sx={{ mb: 3 }}>
              {!hasSingleAnalyte && (
                <>
                  <Box sx={{
                    backgroundColor: '#e3f2fd', p: '12px 16px', borderRadius: '4px', mb: 1.5, borderLeft: '4px solid #1976d2'
                  }}>
                    <Box sx={{ fontSize: '16px', fontWeight: 'bold', color: '#1976d2' }}>
                      {capitalize(item.examType.name)}
                    </Box>
                  </Box>
                  {/* {isHemo && (
                    <Box sx={{ fontSize: '13px', color: '#666', fontStyle: 'italic', mb: 1.5, pl: 2 }}>
                      Contador Hematológico
                    </Box>
                  )} */}
                </>
              )}

              {/* Tabla de resultados */}
              {isUrineExamCode(item.examType.code) ? (
                // === Orina completa agrupada EF/EQ/EM ===
                (() => {
                  const groups = groupUrineAnalytes(item.analytes);

                  const renderRows = (rows: typeof item.analytes) => (
                    <Box component="tbody">
                      {rows.map((analyte) => {
                        const value = analyte.valueNum ?? analyte.valueText ?? '—';
                        const unit = analyte.unit || analyte.itemDef.unit || '-';
                        const refRaw = shouldApplySexAgeFilter({
                          itemKey: analyte.itemDef.key,
                          itemLabel: analyte.itemDef.label?.toUpperCase?.(),
                          examName: item.examType.name?.toUpperCase?.(),
                        })
                          ? refTextBySexAndAge(analyte.itemDef.refText, sex, age)
                          : (analyte.itemDef.refText || '—');

                        const refText = refRaw && refRaw !== '—' ? withUnit(refRaw, unit) : refRaw;

                        return (
                          <Box component="tr" key={analyte.id} sx={{ borderBottom: '1px solid #eee' }}>
                            <Box component="td" sx={{ p: '12px' }}>{capitalize(analyte.itemDef.label)}</Box>
                            <Box component="td" sx={{ p: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '15px' }}>{typeof value === 'string' ? capitalize(value) : value}</Box>
                            <Box component="td" sx={{ p: '12px', textAlign: 'center', color: '#666' }}>{unit}</Box>
                            <Box component="td" sx={{ p: '12px', color: '#666', fontSize: '13px' }}>{refText || '—'}</Box>
                          </Box>
                        );
                      })}
                    </Box>
                  );

                  const Section = ({ title, rows }: { title: string; rows: typeof item.analytes }) => {
                    if (!rows.length) return null;
                    return (
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{
                          backgroundColor: '#f1f8ff', borderLeft: '4px solid #1976d2',
                          px: 1.5, py: 0.75, mb: 1, fontWeight: 700, color: '#1976d2'
                        }}>
                          {title}
                        </Box>
                        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                          <Box component="thead">
                            <Box component="tr" sx={{ backgroundColor: '#f5f5f5' }}>
                              <Box component="th" sx={{ p: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>Determinación</Box>
                              <Box component="th" sx={{ p: '10px', textAlign: 'right', borderBottom: '2px solid #ddd', fontWeight: 'bold', width: '120px' }}>Resultado</Box>
                              <Box component="th" sx={{ p: '10px', textAlign: 'center', borderBottom: '2px solid #ddd', fontWeight: 'bold', width: '80px' }}>Unidad</Box>
                              <Box component="th" sx={{ p: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 'bold', width: '180px' }}>Valores de Referencia</Box>
                            </Box>
                          </Box>
                          {renderRows(rows)}
                        </Box>
                      </Box>
                    );
                  };

                  return (
                    <Box>
                      <Section title={urinePrefixTitle.EF} rows={groups.EF} />
                      <Section title={urinePrefixTitle.EQ} rows={groups.EQ} />
                      <Section title={urinePrefixTitle.EM} rows={groups.EM} />
                      {isUrineExamCode(item.examType.code) && (
                        <Box sx={{ fontSize: '15px', color: '#030000ff', fontStyle: 'italic', mb: 1.5, pl: 1 }}>
                          Muestra remitida
                        </Box>
                      )}
                    </Box>
                  );
                })()
              ) : (
                // === Resto de estudios (sin agrupación) ===
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <Box component="thead">
                    <Box component="tr" sx={{ backgroundColor: '#f5f5f5' }}>
                      <Box component="th" sx={{ p: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>Determinación</Box>
                      <Box component="th" sx={{ p: '10px', textAlign: 'right', borderBottom: '2px solid #ddd', fontWeight: 'bold', width: '120px' }}>Resultado</Box>
                      <Box component="th" sx={{ p: '10px', textAlign: 'center', borderBottom: '2px solid #ddd', fontWeight: 'bold', width: '80px' }}>Unidad</Box>
                      <Box component="th" sx={{ p: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 'bold', width: '180px' }}>Valores de Referencia</Box>
                    </Box>
                  </Box>
                  <Box component="tbody">
                    {item.analytes.map((analyte) => {
                      const value = analyte.valueNum ?? analyte.valueText ?? '—';
                      const unit = analyte.unit || analyte.itemDef.unit || '-';
                      const refRaw = shouldApplySexAgeFilter({
                        itemKey: analyte.itemDef.key,
                        itemLabel: analyte.itemDef.label?.toUpperCase?.(),
                        examName: item.examType.name?.toUpperCase?.(),
                      })
                        ? refTextBySexAndAge(analyte.itemDef.refText, sex, age)
                        : (analyte.itemDef.refText || '—');
                      const refText = refRaw && refRaw !== '—' ? withUnit(refRaw, unit) : refRaw;

                      return (
                        <Box component="tr" key={analyte.id} sx={{ borderBottom: '1px solid #eee' }}>
                          <Box component="td" sx={{ p: '12px' }}>
                            <Box>{analyte.itemDef.label}</Box>
                            {analyte?.itemDef?.method &&
                              analyte.itemDef.method !== '-' &&
                              analyte.itemDef.method !== 'N/A' && (
                                <Box sx={{ mt: 0.25, fontSize: '12px', color: '#666' }}>
                                  Met. {analyte.itemDef.method}
                                </Box>
                              )}
                          </Box>
                          <Box component="td" sx={{ p: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '15px' }}>{value}</Box>
                          <Box component="td" sx={{ p: '12px', textAlign: 'center', color: '#666' }}>{unit}</Box>
                          <Box component="td" sx={{ p: '12px', color: '#666', fontSize: '13px' }}>{refText || '—'}</Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Box>
          );
        })}

        {/* Observaciones */}
        {order.notes && (
          <Box sx={{
            mt: 3, p: 2, backgroundColor: '#fff9e6', borderLeft: '4px solid #ffc107', borderRadius: '4px'
          }}>
            <Box sx={{ fontWeight: 'bold', mb: 1, color: '#333' }}>Observaciones:</Box>
            <Box sx={{ color: '#666', fontSize: '14px' }}>{order.notes}</Box>
          </Box>
        )}

        {/* Firma */}
        <Box sx={{ mt: 6, pt: 2, borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-around' }}>
          <Box sx={{ textAlign: 'center', minWidth: '200px' }}>
            <Box sx={{ borderTop: '1px solid #333', mt: '50px', pt: '8px', fontSize: '12px', color: '#666' }}>
              Firma del Profesional
            </Box>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #e0e0e0', textAlign: 'center', fontSize: '11px', color: '#999' }}>
          Este informe es válido únicamente con firma y sello del profesional responsable
        </Box>
      </Box>

      {/* Estilos de impresión */}
      <style>{`
  /* Imprimir solo el reporte */
  @media print {
    @page { size: A4; margin: 0; }

    /* Oculta TODO el documento… */
    body * {
      visibility: hidden !important;
    }

    /* …menos el reporte */
    #report-root, #report-root * {
      visibility: visible !important;
    }

    /* Ubica el reporte arriba-izquierda y dale márgenes propios */
    #report-root {
      position: absolute !important;
      left: 0; top: 0;
      width: 100%;
      padding: 12mm 15mm 14mm 15mm !important; /* márgenes del informe */
      min-height: auto !important;
      background: white;
    }

    /* Por si algo queda fixed/sticky (AppBar, fab, etc.) */
    .MuiAppBar-root, .no-print {
      display: none !important;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }

  /* Márgenes en pantalla (opcional) */
  @media screen {
    body { margin: 0; background-color: #f0f0f0; }
    #report-root { padding: 24px 24px 40px; }
  }
`}</style>
    </>
  );
}

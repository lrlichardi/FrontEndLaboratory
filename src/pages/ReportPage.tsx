import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, CircularProgress, Alert } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getOrder, type TestOrder } from '../api/OrderApi';
import { capitalize, toDDMMYYYY } from '../utils/utils';
// Helpers sexo/edad (ajustá la ruta si difiere)
import { shouldApplySexAgeFilter, refTextBySexAndAge } from '../utils/refTextSexAge';
// Agrupador de orina
import { isUrineExamCode, groupUrineAnalytes, urinePrefixTitle } from '../utils/orinaCompleta';
const fmtNum = (n: any) => {
  if (n === null || n === undefined || n === '') return '';

  // Normalizo el valor de entrada
  const x =
    typeof n === 'number'
      ? n
      : Number(String(n).replace(/\./g, '').replace(',', '.'));

  if (!Number.isFinite(x)) return String(n);

  // 1) Números grandes: a partir de 100.000, con puntos y coma es-AR
  if (x >= 100000) {
    return new Intl.NumberFormat('es-AR', {
      useGrouping: true,
      maximumFractionDigits: 4,
    }).format(x);
  }

  // 2) Menores a 100.000
  // 2.a) Enteros: sin separador de miles, sin decimales
  if (Number.isInteger(x)) {
    return x.toString();
  }

  // 2.b) Con decimales: sin separador de miles y con coma
  return x
    .toLocaleString('en-US', {
      useGrouping: false,
      maximumFractionDigits: 4,
    })
    .replace('.', ',');
};
// columnas
const COL_DET = '45%';
const COL_RES = '15%';
const COL_UNIT = '10%';
const COL_REF = '30%';



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



  const buildPdfName = (order: TestOrder) => {
    const last = (order.patient.lastName || '').trim();
    const first = (order.patient.firstName || '').trim();
    const date = toDDMMYYYY(order.createdAt); //
    // quitar tildes y caracteres raros para filename
    const sanitize = (s: string) =>
      s.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

    return `${sanitize(last)}_${sanitize(first)}_${date}.pdf`;
  };

  const handlePrint = () => {
    if (!order) return;
    const prevTitle = document.title;
    document.title = buildPdfName(order);
    window.print();
    // restaurar el título luego de que se abre el diálogo de impresión
    setTimeout(() => { document.title = prevTitle; }, 2000);
  };

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
          maxWidth: '210mm', // Ancho A4
          margin: '0 auto',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: 'white',
          minHeight: '297mm', // Alto A4
          padding: '15mm', // Padding interno visible
          boxShadow: '0 0 10px rgba(0,0,0,0.1)', // Sombra para efecto papel
        }}>
        {/* Encabezado */}
        <Box sx={{ textAlign: 'center', borderBottom: '3px solid #1976d2', paddingBottom: '5px' }}>
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
          fontSize: '20px', fontWeight: 'bold', color: '#333',
          textTransform: 'uppercase', borderBottom: '2px solid #e0e0e0'
        }}>
          Informe de Análisis Clínicos
        </Box>

        {/* Datos del paciente */}
        <Box
          sx={{
            backgroundColor: '#f8f9fa',
            p: 1,
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              columnGap: 2,
              rowGap: 0.5,
              fontSize: '16px',
            }}
          >
            <Box>
              <Box component="strong" sx={{ color: '#666' }}>Paciente:</Box>
              <Box sx={{ fontSize: '16px', fontWeight: 'bold' }}>
                {order.patient.lastName}, {order.patient.firstName}
              </Box>
            </Box>

            <Box>
              <Box component="strong" sx={{ color: '#666' }}>DNI:</Box>
              <Box>{order.patient.dni}</Box>
            </Box>

            <Box>
              <Box component="strong" sx={{ color: '#666' }}>Sexo:</Box>
              <Box>{order.patient.sex}</Box>
            </Box>

            <Box>
              <Box component="strong" sx={{ color: '#666' }}>Edad:</Box>
              <Box>{age} años</Box>
            </Box>

            <Box>
              <Box component="strong" sx={{ color: '#666' }}>Fecha:</Box>
              <Box>
                {new Date(order.createdAt).toLocaleDateString('es-AR')}
              </Box>
            </Box>

            <Box>
              <Box component="strong" sx={{ color: '#666' }}>Médico:</Box>
              <Box>{order.doctor?.fullName || '—'}</Box>
            </Box>

            {order.patient.obraSocial && (
              <Box>
                <Box component="strong" sx={{ color: '#666' }}>Obra Social:</Box>
                <Box>{order.patient.obraSocial}</Box>
              </Box>
            )}

            <Box >
              <Box component="strong" sx={{ color: '#666' }}>N° de Orden:</Box>
              <Box>{order.orderNumber}</Box>
            </Box>
            <Box >
              <Box component="strong" sx={{ color: '#666' }}>Protocolo:</Box>
              <Box>{order.id}</Box>
            </Box>
          </Box>
        </Box>
        {/* Resultados */}
        {/* <Box component="h3" sx={{
          fontSize: '18px', fontWeight: 'bold', color: '#333', mb: 2,
          textTransform: 'uppercase', borderBottom: '2px solid #1976d2', pb: '8px'
        }}>
          Resultados
        </Box> */}

        {(() => {
          const urineItems = order.items.filter((i) => isUrineExamCode(i.examType.code));
          const otherItems = order.items.filter((i) => !isUrineExamCode(i.examType.code));

          // 🔹 separo otros en multi-analito y single-analito
          const multiItemsBase = otherItems.filter((i) => (i.analytes?.length || 0) > 1);
          const singleItems = otherItems.filter((i) => (i.analytes?.length || 0) === 1);

          // 🔹 ordenar multiItems: Hemograma primero, luego el resto alfabético
          const multiItems = [...multiItemsBase].sort((a, b) => {
            const na = (a.examType.name || '').toLowerCase();
            const nb = (b.examType.name || '').toLowerCase();

            const aEsHemo = na.includes('hemograma');
            const bEsHemo = nb.includes('hemograma');

            if (aEsHemo && !bEsHemo) return -1;
            if (!aEsHemo && bEsHemo) return 1;

            return na.localeCompare(nb);
          });

          return (
            <>
              {/* === MULTI-ITEMS: cada estudio en su propia tabla (incluye HEMOGRAMA) === */}
              {multiItems.map((item) => {
                const normalAnalytes = item.analytes.filter(a =>
                  a.itemDef.label?.toLowerCase() !== 'observaciones'
                );
                const observacionesAnalyte = item.analytes.find(a =>
                  a.itemDef.label?.toLowerCase() === 'observaciones'
                );

                const isHemograma = (item.examType.name || '').toLowerCase().includes('hemograma');

                // función común para dibujar filas
                const renderRow = (analyte: typeof item.analytes[0]) => {
                  const valueRaw = analyte.valueNum ?? analyte.valueText ?? '—';
                  const unit = analyte.unit || analyte.itemDef.unit || '-';

                  const refRaw = shouldApplySexAgeFilter({
                    itemKey: analyte.itemDef.key,
                    itemLabel: analyte.itemDef.label?.toUpperCase?.(),
                    examName: item.examType.name?.toUpperCase?.(),
                  })
                    ? refTextBySexAndAge(analyte.itemDef.refText, sex, age)
                    : (analyte.itemDef.refText || '—');

                  const refText = refRaw && refRaw !== '—' ? withUnit(capitalize(refRaw), unit) : refRaw;

                  return (
                    <Box component="tr" key={analyte.id} sx={{ borderBottom: '1px solid #eee' }}>
                      <Box component="td" sx={{ p: '3px 4px', width: '45%' }}>
                        <Box>{capitalize(analyte.itemDef.label)}</Box>
                        {analyte?.itemDef?.method &&
                          analyte.itemDef.method !== '-' &&
                          analyte.itemDef.method !== 'N/A' && (
                            <Box sx={{ mt: 0.25, fontSize: '9px', color: '#666' }}>
                              Met. {analyte.itemDef.method}
                            </Box>
                          )}
                      </Box>
                      <Box component="td" sx={{ p: '3px 4px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px', width: '15%' }}>
                        {typeof valueRaw === 'number' ? fmtNum(valueRaw) : valueRaw}
                      </Box>
                      <Box component="td" sx={{ p: '3px 4px', textAlign: 'center', color: '#666', fontSize: '12px', width: '10%' }}>
                        {unit}
                      </Box>
                      <Box component="td" sx={{ p: '3px 4px', color: '#666', fontSize: '11px', width: '30%' }}>
                        {refText || '—'}
                      </Box>
                    </Box>
                  );
                };

                // si es Hemograma: partir en dos columnas
                let columns: typeof normalAnalytes[] = [normalAnalytes];
                if (isHemograma && normalAnalytes.length > 0) {
                  const mid = Math.ceil(normalAnalytes.length / 2);
                  columns = [normalAnalytes.slice(0, mid), normalAnalytes.slice(mid)];
                }

                return (
                  <Box key={item.id}>
                    <Box sx={{
                      backgroundColor: '#e3f2fd',
                      p: '8px',
                      borderRadius: '4px',
                      mb: 0.5,
                      borderLeft: '4px solid #1976d2'
                    }}>
                      <Box sx={{ fontSize: '15px', fontWeight: 'bold', color: '#1976d2' }}>
                        {capitalize(item.examType.name)}
                      </Box>
                    </Box>

                    {normalAnalytes.length > 0 && (
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: columns.length === 2 ? '1fr 1fr' : '1fr',
                          columnGap: 2,
                        }}
                      >
                        {columns.map((colRows, idx) => (
                          colRows.length === 0 ? null : (
                            <Box
                              key={idx}
                              component="table"
                              sx={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '12px',
                                mb: 0.5,
                              }}
                            >
                              <Box component="thead">
                                <Box component="tr" sx={{ backgroundColor: '#f5f5f5' }}>
                                  <Box component="th"
                                    sx={{
                                      p: '3px 4px',
                                      textAlign: 'left',
                                      borderBottom: '2px solid #ddd',
                                      fontWeight: 'bold',
                                      fontSize: '11px',
                                      width: '45%',
                                    }}
                                  >
                                    Determinación
                                  </Box>
                                  <Box component="th"
                                    sx={{
                                      p: '3px 4px',
                                      textAlign: 'right',
                                      borderBottom: '2px solid #ddd',
                                      fontWeight: 'bold',
                                      fontSize: '11px',
                                      width: '15%',
                                    }}
                                  >
                                    Resultado
                                  </Box>
                                  <Box component="th"
                                    sx={{
                                      p: '3px 4px',
                                      textAlign: 'center',
                                      borderBottom: '2px solid #ddd',
                                      fontWeight: 'bold',
                                      fontSize: '11px',
                                      width: '10%',
                                    }}
                                  >
                                    Unidad
                                  </Box>
                                  <Box component="th"
                                    sx={{
                                      p: '3px 4px',
                                      textAlign: 'left',
                                      borderBottom: '2px solid #ddd',
                                      fontWeight: 'bold',
                                      fontSize: '11px',
                                      width: '30%',
                                    }}
                                  >
                                    Val. de Referencia
                                  </Box>
                                </Box>
                              </Box>
                              <Box component="tbody">
                                {colRows.map(renderRow)}
                              </Box>
                            </Box>
                          )
                        ))}
                      </Box>
                    )}

                    {observacionesAnalyte && (observacionesAnalyte.valueText || observacionesAnalyte.valueNum) && (
                      <Box sx={{
                        mt: 1,
                        p: 1,
                        backgroundColor: '#f8f9fa',
                        borderLeft: '3px solid #1976d2',
                        borderRadius: '4px'
                      }}>
                        <Box sx={{ fontWeight: 'bold', color: '#333', fontSize: '13px' }}>
                          Observaciones:
                        </Box>
                        <Box sx={{ color: '#666', fontSize: '13px', lineHeight: 1.4 }}>
                          {capitalize(observacionesAnalyte.valueText) || observacionesAnalyte.valueNum || '—'}
                        </Box>
                      </Box>
                    )}
                  </Box>
                );
              })}


              {/* === SINGLE-ITEMS: una sola tabla acumulada, SIN columna "Estudio" === */}
              {singleItems.length > 0 && (
                <Box>
                  <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <Box component="thead">
                      <Box component="tr" sx={{ backgroundColor: '#f5f5f5' }}>
                        <Box component="th"
                          sx={{
                            p: '3px 4px',
                            textAlign: 'left',
                            borderBottom: '2px solid #ddd',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            width: COL_DET,
                          }}
                        >
                          Determinación
                        </Box>
                        <Box component="th"
                          sx={{
                            p: '3px 4px',
                            textAlign: 'right',
                            borderBottom: '2px solid #ddd',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            width: COL_RES,
                          }}
                        >
                          Resultado
                        </Box>
                        <Box component="th"
                          sx={{
                            p: '3px 4px',
                            textAlign: 'center',
                            borderBottom: '2px solid #ddd',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            width: COL_UNIT,
                          }}
                        >
                          Unidad
                        </Box>
                        <Box component="th"
                          sx={{
                            p: '3px 4px',
                            textAlign: 'left',
                            borderBottom: '2px solid #ddd',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            width: COL_REF,
                          }}
                        >
                          Val. de Referencia
                        </Box>
                      </Box>
                    </Box>

                    <Box component="tbody">
                      {singleItems.map((item) => {
                        const a = item.analytes[0];
                        const valueRaw = a.valueNum ?? a.valueText ?? '—';
                        const unit = a.unit || a.itemDef.unit || '-';

                        const refRaw = shouldApplySexAgeFilter({
                          itemKey: a.itemDef.key,
                          itemLabel: a.itemDef.label?.toUpperCase?.(),
                          examName: item.examType.name?.toUpperCase?.(),
                        })
                          ? refTextBySexAndAge(a.itemDef.refText, sex, age)
                          : (a.itemDef.refText || '—');

                        const refText = refRaw && refRaw !== '—' ? withUnit(refRaw, unit) : refRaw;

                        return (
                          <Box component="tr" key={a.id} sx={{ borderBottom: '1px solid #eee' }}>
                            <Box component="td" sx={{ p: '3px 4px', width: COL_DET }}>
                              <Box sx={{ fontSize: '12px' }}>{capitalize(a.itemDef.label)}</Box>
                              {a?.itemDef?.method &&
                                a.itemDef.method !== '-' &&
                                a.itemDef.method !== 'N/A' && (
                                  <Box sx={{ mt: 0.25, fontSize: '9px', color: '#666' }}>
                                    Met. {a.itemDef.method}
                                  </Box>
                                )}
                            </Box>
                            <Box component="td"
                              sx={{
                                p: '3px 4px',
                                textAlign: 'right',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                width: COL_RES,
                              }}
                            >
                              {typeof valueRaw === 'number' ? fmtNum(valueRaw) : valueRaw}
                            </Box>
                            <Box component="td"
                              sx={{
                                p: '3px 4px',
                                textAlign: 'center',
                                color: '#666',
                                fontSize: '12px',
                                width: COL_UNIT,
                              }}
                            >
                              {unit}
                            </Box>
                            <Box component="td"
                              sx={{
                                p: '3px 4px',
                                color: '#666',
                                fontSize: '12px',
                                width: COL_REF,
                              }}
                            >
                              {capitalize(refText) || '—'}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* ORINA ANALISIS  */}
              {urineItems.map((item, index) => (
                <Box key={item.id} >
                  <Box sx={{
                    backgroundColor: '#e3f2fd',
                    p: '11px',
                    borderRadius: '4px',
                    mb: 0.5,
                    borderLeft: '4px solid #1976d2',
                    pageBreakBefore: index === 0 ? 'always' : 'auto',
                    breakBefore: index === 0 ? 'page' : 'auto',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',

                  }}>
                    <Box sx={{ fontSize: '15px', fontWeight: 'bold', color: '#1976d2' }}>
                      {capitalize(item.examType.name)}
                    </Box>
                  </Box>

                  {(() => {
                    const groups = groupUrineAnalytes(item.analytes);

                    const renderRows = (rows: typeof item.analytes, kind: 'EF' | 'EQ' | 'EM') => (
                      <Box component="tbody">
                        {rows.map((analyte) => {
                          const valueRaw = analyte.valueNum ?? analyte.valueText ?? '—';
                          const unit = analyte.unit || analyte.itemDef.unit

                          const refRaw = shouldApplySexAgeFilter({
                            itemKey: analyte.itemDef.key,
                            itemLabel: analyte.itemDef.label?.toUpperCase?.(),
                            examName: item.examType.name?.toUpperCase?.(),
                          })
                            ? refTextBySexAndAge(analyte.itemDef.refText, sex, age)
                            : (analyte.itemDef.refText || '—');

                          let refText = refRaw && refRaw !== '—' ? withUnit(refRaw, unit) : refRaw;

                          // EM: si el valor es "1 cada N ..." -> Mostrar "Cpos."
                          if (kind === 'EM') {
                            const s = String(valueRaw ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
                            const isOnePerField = /^1\s*(cada|c\/)\s*\d+(\s*(c(po)?s?|campo?s?))?/.test(s);
                            if (isOnePerField) refText = 'Cpos.';
                          }

                          return (
                            <Box component="tr" key={analyte.id} sx={{ borderBottom: '1px solid #eee' }}>
                              <Box component="td" sx={{ p: '5px' }}>{capitalize(analyte.itemDef.label)}</Box>
                              <Box component="td" sx={{ p: '5px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px' }}>
                                {typeof valueRaw === 'number' ? fmtNum(valueRaw) : capitalize(valueRaw)}
                              </Box>
                              <Box component="td" sx={{ p: '5x', textAlign: 'center', color: '#666' }}>{unit || '—'}</Box>
                              <Box component="td" sx={{ p: '5px', color: '#666', fontSize: '12px' }}>{capitalize(refText) || '—'}</Box>
                            </Box>
                          );
                        })}
                      </Box>
                    );

                    const Section = ({ title, rows, kind }: {
                      title: string;
                      rows: typeof item.analytes;
                      kind: 'EF' | 'EQ' | 'EM';
                    }) => {
                      if (!rows.length) return null;

                      // partir filas en dos columnas
                      const mid = Math.ceil(rows.length / 2);
                      const colSets = [rows.slice(0, mid), rows.slice(mid)];

                      return (
                        <Box sx={{ mb: 1 }}>
                          <Box sx={{
                            backgroundColor: '#f1f8ff',
                            borderLeft: '4px solid #1976d2',
                            px: 1.5,
                            py: 0.75,
                            fontWeight: 500,
                            color: '#1976d2',
                            fontSize: '14px',
                          }}>
                            {title}
                          </Box>

                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: colSets[1].length ? '1fr 1fr' : '1fr',
                              columnGap: 2,
                            }}
                          >
                            {colSets.map((colRows, idx) =>
                              colRows.length === 0 ? null : (
                                <Box
                                  key={idx}
                                  component="table"
                                  sx={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    fontSize: '12px',
                                    mt: 0.5,
                                  }}
                                >
                                  <Box component="thead">
                                    <Box component="tr" sx={{ backgroundColor: '#f5f5f5' }}>
                                      <Box component="th"
                                        sx={{
                                          p: '3px 4px',
                                          textAlign: 'left',
                                          borderBottom: '2px solid #ddd',
                                          fontWeight: 'bold',
                                          fontSize: '11px',
                                          width: '10%',
                                        }}
                                      >
                                        Determinación
                                      </Box>
                                      <Box component="th"
                                        sx={{
                                          p: '3px 4px',
                                          textAlign: 'right',
                                          borderBottom: '2px solid #ddd',
                                          fontWeight: 'bold',
                                          fontSize: '11px',
                                          width: '15%',
                                        }}
                                      >
                                        Resultado
                                      </Box>
                                      <Box component="th"
                                        sx={{
                                          p: '3px 4px',
                                          textAlign: 'center',
                                          borderBottom: '2px solid #ddd',
                                          fontWeight: 'bold',
                                          fontSize: '11px',
                                          width: '10%',
                                        }}
                                      >
                                        Unidad
                                      </Box>
                                      <Box component="th"
                                        sx={{
                                          p: '3px 4px',
                                          textAlign: 'left',
                                          borderBottom: '2px solid #ddd',
                                          fontWeight: 'bold',
                                          fontSize: '11px',
                                          width: '30%',
                                        }}
                                      >
                                        Val. de Referencia
                                      </Box>
                                    </Box>
                                  </Box>
                                  {renderRows(colRows, kind)}
                                </Box>
                              )
                            )}
                          </Box>
                        </Box>
                      );
                    };

                    return (
                      <Box>
                        <Section title={urinePrefixTitle.EF} rows={groups.EF} kind="EF" />
                        <Section title={urinePrefixTitle.EQ} rows={groups.EQ} kind="EQ" />
                        <Section title={urinePrefixTitle.EM} rows={groups.EM} kind="EM" />
                        <Box sx={{ fontSize: '13px', color: '#030000ff', fontStyle: 'italic', mb: 0.5, pl: 1 }}>
                          Muestra remitida
                        </Box>
                      </Box>
                    );
                  })()}
                </Box>
              ))}
            </>
          );
        })()}


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
        <Box sx={{ mt: 6, pt: 2, display: 'flex', justifyContent: 'space-around' }}>
          <Box sx={{ textAlign: 'center', minWidth: '200px' }}>
            <Box sx={{ borderTop: '1px solid #333', pt: '8px', fontSize: '12px', color: '#666' }}>
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
  @media print {
    @page {
      size: A4;
      margin: 0;
    }

    /* Fondo blanco, sin imagen al imprimir */
    html,
    body,
    #root {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      background-image: none !important;
    }

    body * {
      visibility: hidden !important;
    }

    #report-root,
    #report-root * {
      visibility: visible !important;
    }

    #report-root {
      position: static !important;
      left: 0;
      top: 0;
      width: auto !important;
      max-width: 200mm !important;
      margin: 0 auto !important;
      padding: 2mm 3mm 2mm 3mm !important;
      min-height: auto !important;
      background: #ffffff !important;
      box-shadow: none !important;
      border-radius: 0 !important;
    }

    .MuiAppBar-root,
    .no-print {
      display: none !important;
    }

    .patient-info,
    table thead,
    table tbody tr,
    #report-root > div > div {
      page-break-inside: avoid;
      break-inside: avoid;
    }
  }
`}</style>
    </>
  );
}

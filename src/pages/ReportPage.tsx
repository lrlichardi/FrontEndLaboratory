import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, CircularProgress, Alert } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useReactToPrint } from 'react-to-print';
import { getOrder, type TestOrder } from '../api/OrderApi';
import { capitalize, toDDMMYYYY } from '../utils/utils';
import firmaProfesional from '../image/firma.jpeg';
// Helpers sexo/edad (ajustá la ruta si difiere)
import { shouldApplySexAgeFilter, refTextBySexAndAge } from '../utils/refTextSexAge';
// Agrupador de orina
import { isUrineExamCode, groupUrineAnalytes, urinePrefixTitle } from '../utils/orinaCompleta';


const fmtNum = (n: any, label?: string) => {
  if (n === null || n === undefined || n === '') return '';

  const raw = String(n).trim();
  const isDensidad = String(label ?? '').toLowerCase().includes('densidad');

  const x = isDensidad
    ? Number(raw.replace(',', '.'))
    : typeof n === 'number'
      ? n
      : Number(raw.replace(/\./g, '').replace(',', '.'));

  if (!Number.isFinite(x)) return raw;

  if (isDensidad) {
    return x.toFixed(3).replace('.', ',');
  }

  if (x > 100000) {
    return new Intl.NumberFormat('es-AR', {
      maximumFractionDigits: 4,
    }).format(x);
  }

  return raw;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatReferenceLines = (text?: string | null, unit?: string | null) => {
  const rawText = String(text ?? '').trim();
  if (!rawText || rawText === '—') return ['—'];

  const cleanUnit = String(unit ?? '').trim();

  const normalizeDecimalSpaces = (value: string) =>
    value.replace(/(\d)\s*([.,])\s*(\d)/g, '$1$2$3');

  const lineAlreadyHasUnit = (line: string) => {
    if (!cleanUnit) return false;
    return new RegExp(`${escapeRegExp(cleanUnit)}\\s*$`, 'i').test(line.trim());
  };

  const shouldAppendUnit = (line: string) => {
    if (!cleanUnit || lineAlreadyHasUnit(line)) return false;

    // Agrega la unidad a líneas de referencia numérica, por ejemplo:
    // 40-49 anos < 2.0  => 40-49 anos < 2.0 ng/ml
    return /(?:<=|>=|<|>|≤|≥)\s*[\d.,]+\s*$/i.test(line.trim());
  };

  const addUnitIfNeeded = (line: string) => {
    const normalized = normalizeDecimalSpaces(line.replace(/\s+/g, ' ').trim());
    return shouldAppendUnit(normalized) ? `${normalized} ${cleanUnit}` : normalized;
  };

  // Si ya viene con saltos o separado por punto y coma, respetamos ese formato
  // y repetimos la unidad en cada línea que corresponda.
  const explicitLines = rawText
    .replace(/<br\s*\/?\>/gi, '\n')
    .split(/\n|;/)
    .map(addUnitIfNeeded)
    .filter(Boolean);

  if (explicitLines.length > 1) return explicitLines;

  let clean = rawText.replace(/\s+/g, ' ').trim();

  // Si el texto terminó con la unidad agregada una sola vez, la sacamos para poder repetirla por línea.
  if (cleanUnit) {
    const unitAtEnd = new RegExp(`\\s*${escapeRegExp(cleanUnit)}\\s*$`, 'i');
    clean = clean.replace(unitAtEnd, '').trim();
  }

  // Ejemplo que puede venir desde la BD en una sola línea:
  // 40-49 anos < 2.0 50-59 anos < 3.1 60-69 anos < 4.1 70-79 anos < 6.5 ng/ml
  const ageRanges = clean.match(/\d{1,3}\s*-\s*\d{1,3}\s*a[nñ]os\s*(?:<=|>=|<|>|≤|≥)\s*[\d.,]+/gi);

  if (ageRanges && ageRanges.length > 0) {
    return ageRanges.map(addUnitIfNeeded);
  }

  return [addUnitIfNeeded(rawText)];
};

const renderReferenceText = (text?: string | null, unit?: string | null) => {
  const lines = formatReferenceLines(text, unit);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.15,
        lineHeight: 1.25,
        whiteSpace: 'normal',
      }}
    >
      {lines.map((line, idx) => (
        <Box key={idx} component="span">
          {line}
        </Box>
      ))}
    </Box>
  );
};
// columnas
const COL_DET = '40%';
const COL_RES = '15%';
const COL_UNIT = '10%';
const COL_REF = '35%';
const URINE_COL_DET = '34%';
const URINE_COL_RES = '26%';
const URINE_COL_UNIT = '12%';
const URINE_COL_REF = '28%';

const RESULT_ONLY_CODES = new Set(['660105']);
const isResultOnlyCode = (code?: string | number | null) => RESULT_ONLY_CODES.has(String(code ?? ''));
const CULTIVO_CODE = '660105';
const isCultivoCode = (code?: string | number | null) =>
  String(code ?? '') === CULTIVO_CODE;
const REPORT_CODE_ORDER = new Map([
  '660711',
  '660105',
  '660176',
  '660035',
].map((code, index) => [code, index]));
const DEFAULT_REPORT_ORDER = REPORT_CODE_ORDER.size;

const reportOrderForCode = (code?: string | number | null) =>
  REPORT_CODE_ORDER.get(String(code ?? '')) ?? DEFAULT_REPORT_ORDER;

const compareByReportCode = (
  a: TestOrder['items'][number],
  b: TestOrder['items'][number],
) => reportOrderForCode(a.examType.code) - reportOrderForCode(b.examType.code);

const reportOrderForItems = (items: TestOrder['items']) =>
  items.reduce(
    (lowest, item) => Math.min(lowest, reportOrderForCode(item.examType.code)),
    DEFAULT_REPORT_ORDER,
  );

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
  const reportRef = useRef<HTMLDivElement | null>(null);

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

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: order ? buildPdfName(order).replace(/\.pdf$/i, '') : 'Informe',
    pageStyle: `
      @page {
        size: A4;
        margin: 0;
      }

      @media print {
        html,
        body,
        #root {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .MuiAppBar-root,
        .no-print {
          display: none !important;
        }

        #report-root {
          width: 100% !important;
          max-width: none !important;
          min-height: auto !important;
          margin: 0 !important;
          padding: 8mm 8mm 24mm 8mm !important;
          box-sizing: border-box !important;
          background: #ffffff !important;
          box-shadow: none !important;
          border-radius: 0 !important;
        }

        .regular-signature,
        .regular-footer {
          display: none !important;
        }

        .print-fixed-signature {
          display: flex !important;
          position: fixed !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 3mm !important;
          height: 14mm !important;
          justify-content: center !important;
          align-items: flex-end !important;
          z-index: 9999 !important;
          pointer-events: none !important;
        }

        .print-signature-inner {
          width: 100% !important;
          text-align: center !important;
          line-height: 1.05 !important;
        }

        .print-signature-img {
          width: 34px !important;
          height: auto !important;
          display: block !important;
          margin: 0 auto 0.2mm auto !important;
        }

        .print-signature-label {
          font-size: 5px !important;
          color: #555 !important;
        }

        .print-signature-note {
          margin-top: 0.2mm !important;
          font-size: 4.2px !important;
          color: #888 !important;
        }

        .exam-block {
          break-inside: avoid-page !important;
          page-break-inside: avoid !important;
          margin-bottom: 2mm !important;
        }

        .single-items-block,
        .urine-block {
          break-inside: auto !important;
          page-break-inside: auto !important;
        }

        .exam-title,
        .section-title {
          break-after: avoid-page !important;
          page-break-after: avoid !important;
        }

        .urine-section,
        .result-only-block {
          break-inside: avoid-page !important;
          page-break-inside: avoid !important;
        }

        table {
          width: 100% !important;
          border-collapse: collapse !important;
          page-break-inside: auto !important;
          break-inside: auto !important;
        }

        thead {
          display: table-header-group !important;
        }

        tbody {
          display: table-row-group !important;
        }

        tr {
          break-inside: avoid-page !important;
          page-break-inside: avoid !important;
        }

        td,
        th {
          overflow-wrap: break-word !important;
          word-break: normal !important;
          hyphens: none !important;
        }

        #report-root img {
          break-inside: avoid-page !important;
          page-break-inside: avoid !important;
        }
      }
    `,
  });

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

  const formatAnalyteLabel = (label?: string | null, isAcronym?: boolean) => {
    const raw = String(label ?? '').trim();

    if (isAcronym) {
      return raw.toUpperCase();
    }

    return capitalize(raw);
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
        ref={reportRef}
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
          const itemsByReportOrder = [...order.items].sort(compareByReportCode);
          const urineItems = itemsByReportOrder.filter((i) => isUrineExamCode(i.examType.code));
          const otherItems = itemsByReportOrder.filter((i) => !isUrineExamCode(i.examType.code));

          // 🔹 separo otros en multi-analito y single-analito
          const multiItemsBase = otherItems.filter((i) => (i.analytes?.length || 0) > 1);
          const singleItems = otherItems.filter((i) => (i.analytes?.length || 0) === 1);
          const singleItemsWithRef = singleItems.filter((i) => !isResultOnlyCode(i.examType.code));
          const singleResultOnlyItems = singleItems.filter((i) => isResultOnlyCode(i.examType.code));

          // 🔹 ordenar multiItems: Hemograma primero, luego el resto alfabético
          const multiItems = [...multiItemsBase].sort((a, b) => {
            const reportOrderDiff = compareByReportCode(a, b);
            if (reportOrderDiff !== 0) return reportOrderDiff;

            const na = (a.examType.name || '').toLowerCase();
            const nb = (b.examType.name || '').toLowerCase();

            const aEsHemo = na.includes('hemograma');
            const bEsHemo = nb.includes('hemograma');

            if (aEsHemo && !bEsHemo) return -1;
            if (!aEsHemo && bEsHemo) return 1;

            return na.localeCompare(nb);
          });

          return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {/* === MULTI-ITEMS: cada estudio en su propia tabla (incluye HEMOGRAMA) === */}
              {multiItems.map((item) => {
                const normalAnalytes = item.analytes.filter(a =>
                  a.itemDef.label?.toLowerCase() !== 'observaciones'
                );
                const observacionesAnalyte = item.analytes.find(a =>
                  a.itemDef.label?.toLowerCase() === 'observaciones'
                );

                const isHemograma = (item.examType.name || '').toLowerCase().includes('hemograma');
                const isResultOnlyExam = isResultOnlyCode(item.examType.code);

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
                        <Box>{formatAnalyteLabel(analyte.itemDef.label, analyte.itemDef.isAcronym)}</Box>
                        {analyte?.itemDef?.method &&
                          analyte.itemDef.method !== '-' &&
                          analyte.itemDef.method !== 'N/A' && (
                            <Box sx={{ mt: 0.25, fontSize: '9px', color: '#666' }}>
                              Met. {analyte.itemDef.method}
                            </Box>
                          )}
                      </Box>
                      <Box component="td" sx={{ p: '3px 4px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px', width: isResultOnlyExam ? '55%' : '15%' }}>
                        {typeof valueRaw === 'number' ? fmtNum(valueRaw, analyte.itemDef.label) : valueRaw}
                      </Box>
                      {!isResultOnlyExam && (
                        <>
                          <Box component="td" sx={{ p: '3px 4px', textAlign: 'center', color: '#666', fontSize: '12px', width: '10%' }}>
                            {unit}
                          </Box>
                          <Box component="td" sx={{ p: '3px 4px', color: '#666', fontSize: '11px', width: '30%', verticalAlign: 'top' }}>
                            {renderReferenceText(refText, unit)}
                          </Box>
                        </>
                      )}
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
                  <Box
                    key={item.id}
                    className="exam-block"
                    sx={{ order: reportOrderForCode(item.examType.code) }}
                  >
                    <Box className="exam-title" sx={{
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
                                      width: isResultOnlyExam ? '55%' : '15%',
                                    }}
                                  >
                                    Resultado
                                  </Box>
                                  {!isResultOnlyExam && (
                                    <>
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
                                    </>
                                  )}
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
              {singleItemsWithRef.length > 0 && (
                <Box
                  className="exam-block single-items-block"
                  sx={{ order: reportOrderForItems(singleItemsWithRef) }}
                >
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
                      {singleItemsWithRef.map((item) => {
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
                              <Box sx={{ fontSize: '12px' }}>{formatAnalyteLabel(a.itemDef.label, a.itemDef.isAcronym)}</Box>
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
                              {typeof valueRaw === 'number' ? fmtNum(valueRaw, a.itemDef.label) : valueRaw}
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
                                verticalAlign: 'top',
                              }}
                            >
                              {renderReferenceText(refText, unit)}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>
              )}


              {singleResultOnlyItems.length > 0 && (
                <Box
                  className="exam-block result-only-block"
                  sx={{
                    mt: singleItemsWithRef.length > 0 ? 0.5 : 0,
                    order: reportOrderForItems(singleResultOnlyItems),
                  }}
                >
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
                            width: '55%',
                          }}
                        >
                          Resultado
                        </Box>
                      </Box>
                    </Box>

                    <Box component="tbody">
                      {singleResultOnlyItems.map((item) => {
                        const a = item.analytes[0];
                        const valueRaw = a.valueNum ?? a.valueText ?? '—';
                        const isCultivo = isCultivoCode(item.examType.code);

                        return (
                          <Box component="tr" key={a.id} sx={{
                            borderBottom: '1px solid #eee',
                            backgroundColor: 'transparent',
                            color: 'inherit',
                          }}>
                            <Box component="td" sx={{ p: '3px 4px', width: COL_DET, color: 'inherit' }}>
                              <Box
                                sx={{
                                  fontSize: '12px',
                                  fontWeight: isCultivo ? 'bold' : 'normal',
                                }}
                              >
                                {capitalize(a.itemDef.label)}
                              </Box>
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
                                width: '55%',
                              }}
                            >
                              {typeof valueRaw === 'number' ? fmtNum(valueRaw, a.itemDef.label) : valueRaw}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* ORINA ANALISIS  */}
              {urineItems.map((item) => (
                <Box
                  key={item.id}
                  className="exam-block urine-block"
                  sx={{ order: reportOrderForCode(item.examType.code) }}
                >
                  <Box className="exam-title" sx={{
                    backgroundColor: '#e3f2fd',
                    p: '11px',
                    borderRadius: '4px',
                    mb: 0.5,
                    borderLeft: '4px solid #1976d2',
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
                                {typeof valueRaw === 'number' ? fmtNum(valueRaw, analyte.itemDef.label) : capitalize(valueRaw)}
                              </Box>
                              <Box component="td" sx={{ p: '5px', textAlign: 'center', color: '#666' }}>{unit || '—'}</Box>
                              <Box component="td" sx={{ p: '5px', color: '#666', fontSize: '12px', verticalAlign: 'top' }}>{renderReferenceText(refText, unit)}</Box>
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
                        <Box className="urine-section" sx={{ mb: 1 }}>
                          <Box className="section-title" sx={{
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
                                    tableLayout: 'fixed',
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
                                          width: URINE_COL_DET,
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
                                          width: URINE_COL_RES,
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
                                          width: URINE_COL_UNIT,
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
                                          width: URINE_COL_REF,
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
            </Box>
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

        {/* Firma visible en pantalla */}
        <Box className="regular-signature" sx={{ mt: 3, pt: 1, display: 'flex', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center', minWidth: '220px' }}>
            <Box
              component="img"
              src={firmaProfesional}
              alt="Firma del Profesional"
              sx={{
                width: '120px',
                height: 'auto',
                mb: 0.5,
              }}
            />

            <Box sx={{ fontSize: '12px', color: '#666' }}>
              Firma del Profesional
            </Box>
          </Box>
        </Box>

        {/* Footer visible en pantalla */}
        <Box className="regular-footer" sx={{ mt: 3, pt: 1.5, borderTop: '1px solid #e0e0e0', textAlign: 'center', fontSize: '10px', color: '#999' }}>
          Este informe es válido únicamente con firma y sello del profesional responsable
        </Box>

        {/* Firma fija para impresión: se repite en todas las hojas */}
        <Box className="print-fixed-signature">
          <Box className="print-signature-inner">
            <Box
              component="img"
              src={firmaProfesional}
              alt="Firma del Profesional"
              className="print-signature-img"
            />
            <Box className="print-signature-label">Firma del Profesional</Box>
            <Box className="print-signature-note">
              Este informe es válido únicamente con firma y sello del profesional responsable
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Estilos de impresión */}
      <style>{`
  .print-fixed-signature {
    display: none;
  }

  @media print {
    @page {
      size: A4;
      margin: 0;
    }

    html,
    body,
    #root {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      background-image: none !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    #report-root {
      position: static !important;
      width: 100% !important;
      max-width: none !important;
      min-height: auto !important;
      margin: 0 !important;
      padding: 8mm 8mm 24mm 8mm !important;
      box-sizing: border-box !important;
      background: #ffffff !important;
      box-shadow: none !important;
      border-radius: 0 !important;
    }

    .regular-signature,
    .regular-footer {
      display: none !important;
    }

    .print-fixed-signature {
      display: flex !important;
      position: fixed !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 3mm !important;
      height: 14mm !important;
      justify-content: center !important;
      align-items: flex-end !important;
      z-index: 9999 !important;
      pointer-events: none !important;
    }

    .print-signature-inner {
      width: 100% !important;
      text-align: center !important;
      line-height: 1.05 !important;
    }

    .print-signature-img {
      width: 100px !important;
      height: auto !important;
      display: block !important;
      margin: 0 auto 0.2mm auto !important;
    }

    .print-signature-label {
      font-size: 5px !important;
      color: #555 !important;
    }

    .print-signature-note {
      margin-top: 0.2mm !important;
      font-size: 4.2px !important;
      color: #888 !important;
    }

    .MuiAppBar-root,
    .no-print {
      display: none !important;
    }

    .exam-block {
      break-inside: avoid-page !important;
      page-break-inside: avoid !important;
      margin-bottom: 2mm !important;
    }

    .single-items-block,
    .urine-block {
      break-inside: auto !important;
      page-break-inside: auto !important;
    }

    .exam-title,
    .section-title {
      break-after: avoid-page !important;
      page-break-after: avoid !important;
    }

    .urine-section,
    .result-only-block {
      break-inside: avoid-page !important;
      page-break-inside: avoid !important;
    }

    table {
      width: 100% !important;
      border-collapse: collapse !important;
      page-break-inside: auto !important;
      break-inside: auto !important;
    }

    thead {
      display: table-header-group !important;
    }

    tbody {
      display: table-row-group !important;
    }

    tr {
      break-inside: avoid-page !important;
      page-break-inside: avoid !important;
    }

    td,
    th {
      overflow-wrap: break-word !important;
      word-break: normal !important;
      hyphens: none !important;
    }

    #report-root img {
      break-inside: avoid-page !important;
      page-break-inside: avoid !important;
    }
  }
`}</style>
    </>
  );
}

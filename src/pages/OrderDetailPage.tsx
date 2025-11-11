import { useEffect, useState, Fragment } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Chip, Grid, Link,
  Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Typography, IconButton, Collapse, MenuItem
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { getOrder, updateAnalytesBulk, generateOrderReport, deleteOrderItem, type TestOrder, type OrderItemAnalyte } from '../api';
import { capitalize } from '../utils/utils';
import PrintIcon from '@mui/icons-material/Print';
import { isUrineExamCode, groupUrineAnalytes, urinePrefixTitle } from '../utils/orinaCompleta';

type DraftVal = { orderItemId: string; analyteId: string; kind: string; value: string };

export default function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const [order, setOrder] = useState<TestOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, DraftVal>>({});
  const dirty = Object.keys(drafts).length > 0;
  console.log(order)
  const toggle = (id: string) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getOrder(orderId);
      setOrder(data);
    } catch (e: any) {
      setError(e.message || 'Error cargando el análisis');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  useEffect(() => { fetchOrder(); /* eslint-disable-next-line */ }, [orderId]);

  const handleSaveAll = async () => {
    if (!order) return;
    try {
      setSaving(true);

      // 1) Drafts -> updates
      const updates = Object.values(drafts).map(d => {
        const kind = (d.kind || 'NUMERIC').toUpperCase();
        const raw = (typeof d.value === 'string' ? d.value.trim() : d.value) as string | number;
        return {
          orderItemId: d.orderItemId,
          analyteId: d.analyteId,
          value: kind === 'NUMERIC'
            ? (raw === '' ? null : Number(raw))
            : (raw === '' ? null : (raw as string)),
        };
      });

      // 2) Agregar "No contiene" por defecto a EQ sin valor ni borrador
      const already = new Set(updates.map(u => u.analyteId));
      for (const item of order.items) {
        if (!isUrineExamCode(item.examType.code)) continue;
        const { EQ } = groupUrineAnalytes(item.analytes);
        for (const a of EQ) {
          const hasValue = (a.valueText && a.valueText.trim() !== '') || a.valueNum != null;
          if (!hasValue && !already.has(a.id)) {
            updates.push({
              orderItemId: item.id,
              analyteId: a.id,
              value: 'No contiene',
            });
          }
        }
      }

      if (updates.length === 0) {
        setSaving(false);
        return;
      }

      await updateAnalytesBulk(order.id, updates);
      setDrafts({});
      await fetchOrder();
    } catch (e: any) {
      setError(e.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };


  const handleDiscard = () => setDrafts({});

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este estudio?')) return;

    // 1) Remoción optimista en UI
    const deleted = order?.items.find(i => i.id === itemId);
    if (deleted) {
      // limpiar borradores de sus analitos
      const analyteIds = deleted.analytes.map(a => a.id);
      setDrafts(prev => {
        const next = { ...prev };
        for (const id of analyteIds) delete next[id];
        return next;
      });
      // cerrar el acordeón si estaba abierto
      setExpanded(prev => {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      });
      // quitar el item de la grilla
      setOrder(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== itemId) } : prev);
    }

    // 2) Llamada real al backend + sync final
    try {
      await deleteOrderItem(itemId);
      await fetchOrder(); // opcional si ya hiciste la remoción optimista, pero asegura consistencia
    } catch (e: any) {
      setError(e.message || 'No se pudo eliminar');
      await fetchOrder(); // rollback a la verdad del server si falló
    }
  };


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Typography>Cargando...</Typography>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box>
        {error && <Alert severity="error">{error}</Alert>}
        <Typography>No se encontró el análisis</Typography>
      </Box>
    );
  }

  // CALCULO DE LOS ABS
  const ABS_PAIRS = [
    { pct: 'Eosinófilos', abs: 'Eosinófilos (Abs)' },
    { pct: 'Basófilos', abs: 'Basófilos (Abs)' },
    { pct: 'Linfocitos', abs: 'Linfocitos (Abs)' },
    { pct: 'Monocitos', abs: 'Monocitos (Abs)' },
  ];

  function recomputeAbsForItem(
    item: { id: string; analytes: any[] },
    nextDrafts: Record<string, { orderItemId: string; analyteId: string; kind: string; value: string | number }>
  ) {
    const byLabel = (label: string) => item.analytes.find((a: any) => a.itemDef?.label === label);
    const leuc = byLabel('Leucocitos');

    const getNum = (a: any) => {
      const raw = nextDrafts[a.id]?.value ?? (a.valueNum ?? '');
      const n = parseFloat(String(raw));
      return Number.isFinite(n) ? n : NaN;
    };

    const leucVal = leuc ? getNum(leuc) : NaN;

    for (const pair of ABS_PAIRS) {
      const pctA = byLabel(pair.pct);
      const absA = byLabel(pair.abs);
      if (!pctA || !absA) continue;

      const pctVal = getNum(pctA);

      if (Number.isFinite(leucVal) && Number.isFinite(pctVal)) {
        const absVal = Math.round(leucVal * pctVal / 100); // /uL → entero
        nextDrafts[absA.id] = {
          orderItemId: item.id,
          analyteId: absA.id,
          kind: 'NUMERIC',
          value: String(absVal),
        };
      } else {
        // si falta alguno, limpiamos el draft del ABS para evitar arrastre
        if (nextDrafts[absA.id]) delete nextDrafts[absA.id];
      }
    }

    return nextDrafts;
  }

  return (
    <Box>
      <style>{`
      @page { size: A4 portrait; margin: 8mm; }
      @media print {
        body { font-size: 5px; }
        .no-print { display: none !important; }
        .print-only { display: block !important; }
        .print-table { border-collapse: collapse; width: 100%; }
        .print-table th, .print-table td { border: 1px solid #000; padding: 2px 6px; }
        .print-muted { color: #000; }
        .print-line { border-bottom: 1px solid #000; height: 14px; }
      }
    `}</style>
      <Stack className="no-print" direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Link component={RouterLink} to={`/patients/${order.patientId}/analyses`} underline="none">
          <Button startIcon={<ArrowBackIcon />}>Volver</Button>
        </Link>
        <Typography variant="h4" fontWeight={700}>Detalle del Análisis</Typography>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={1}>
           <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
          Imprimir
        </Button>
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            component={RouterLink}
            to={`/orders/${orderId}/report`}
            state={{ from: `/orders/${orderId}`, patientId: order.patientId }}
          >
            Vista Previa
          </Button>
          <Button variant="outlined" disabled={!dirty || saving} onClick={handleDiscard}>Deshacer</Button>
          <Button variant="contained" disabled={!dirty || saving} onClick={handleSaveAll}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">N° de Orden</Typography>
              <Typography variant="body1" fontWeight={600}>{order.orderNumber || '—'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">Título</Typography>
              <Typography variant="body1" fontWeight={600}>{order.title || '—'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">Médico</Typography>
              <Typography variant="body1" fontWeight={600}>{order.doctor?.fullName || '—'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">Fecha</Typography>
              <Typography variant="body1" fontWeight={600}>
                {new Date(order.createdAt).toLocaleDateString('es-AR')}
              </Typography>
            </Grid>
            {order.notes && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Observaciones</Typography>
                <Typography variant="body1">{order.notes}</Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        Estudios ({order.items.length})
      </Typography>

      <TableContainer className="print-only"component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={48} />
              <TableCell width={120}><strong>Código</strong></TableCell>
              <TableCell><strong>Ítem</strong></TableCell>
              <TableCell width={150}><strong>Resultado</strong></TableCell>
              <TableCell width={100}><strong>Unidad</strong></TableCell>
              <TableCell width={150}><strong>Rango Ref.</strong></TableCell>
              <TableCell width={100} align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {order.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No hay estudios en este análisis
                </TableCell>
              </TableRow>
            ) : (
              order.items.map((item) => {
                const hasMultipleItems = item.analytes.length > 1;
                const open = !!expanded[item.id];

                // Un solo analito → fila directa
                if (!hasMultipleItems && item.analytes.length === 1) {
                  const a = item.analytes[0];
                  const kind = (a.itemDef.kind || 'NUMERIC').toUpperCase();
                  const baseShown = (a.valueNum ?? a.valueText ?? '') as string | number;
                  const current = drafts[a.id]?.value ?? String(baseShown ?? '');
                  const isEdited = !!drafts[a.id];

                  return (
                    <TableRow key={item.id} hover>
                      <TableCell width={48} />
                      <TableCell width={120}><code style={{ fontWeight: 600 }}>{item.examType.code}</code></TableCell>
                      <TableCell>{capitalize(a.itemDef.label)}</TableCell>
                      <TableCell width={150}>
                        <TextField
                          size="small"
                          type={kind === 'NUMERIC' ? 'number' : 'text'}
                          value={current}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDrafts((d) => ({
                              ...d,
                              [a.id]: { orderItemId: item.id, analyteId: a.id, kind: a.itemDef.kind, value: v },
                            }));
                          }}
                          placeholder={kind === 'NUMERIC' ? '0.00' : 'Texto'}
                          fullWidth
                          sx={{ bgcolor: isEdited ? 'rgba(255,220,0,0.12)' : undefined }}
                        />
                      </TableCell>
                      <TableCell width={100}><Typography variant="body2">{a.unit || a.itemDef.unit || '—'}</Typography></TableCell>
                      <TableCell width={150}><Typography variant="body2">{a.itemDef.refText || '—'}</Typography></TableCell>
                      <TableCell width={100} align="center">
                        <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                }

                // Múltiples analitos → acordeón
                return (
                  <Fragment key={item.id}>
                    <TableRow hover>
                      <TableCell width={48}>
                        <IconButton size="small" onClick={() => toggle(item.id)}>
                          {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell width={120}><code style={{ fontWeight: 600 }}>{item.examType.code}</code></TableCell>
                      <TableCell>{item.examType.name}</TableCell>
                      <TableCell colSpan={3} sx={{ color: 'text.secondary' }}>
                        {open ? '—' : 'Click en la flecha para ver ítems'}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                          <Box sx={{ m: 1 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Ítems del código</Typography>

                            {/* Tabla interna del acordeón */}
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell><strong>Ítem</strong></TableCell>
                                  <TableCell width={160}><strong>Resultado</strong></TableCell>
                                  <TableCell width={100}><strong>Unidad</strong></TableCell>
                                  <TableCell width={160}><strong>Rango Ref.</strong></TableCell>
                                  <TableCell width={120} align="center"><strong>Estado</strong></TableCell>
                                </TableRow>
                              </TableHead>

                              <TableBody>
                                {isUrineExamCode(item.examType.code) ? (
                                  // Orina completa (660711) agrupada EF/EQ/EM
                                  (() => {
                                    const groups = groupUrineAnalytes(item.analytes);
                                    const EQ_OPTIONS = ['No contiene', 'Contiene', 'Contiene +', 'Contiene ++', 'Contiene +++', 'Contiene ++++'] as const;

                                    const SectionRow = ({ title }: { title: string }) => (
                                      <TableRow>
                                        <TableCell colSpan={5} sx={{ bgcolor: 'action.hover', fontWeight: 700 }}>
                                          {title}
                                        </TableCell>
                                      </TableRow>
                                    );

                                    const renderRows = (rows: typeof item.analytes, mode: 'EF' | 'EQ' | 'EM') =>
                                      rows.map((a: OrderItemAnalyte) => {
                                        const kind = (a.itemDef.kind || 'NUMERIC').toUpperCase();
                                        const baseShown = (a.valueNum ?? a.valueText ?? '') as string | number;

                                        // Valor actual desde drafts o DB
                                        const currentDraft = drafts[a.id]?.value;
                                        const currentText = (currentDraft ?? (typeof baseShown === 'string' ? baseShown : '')).toString();

                                        // Para EQ usamos combo; si no coincide con opciones, mostramos vacío
                                        const eqSelectValue =
                                          currentText === 'Contiene' || currentText === 'No contiene' ? currentText : 'No contiene';

                                        const isEdited = !!drafts[a.id];

                                        return (
                                          <TableRow key={a.id}>
                                            <TableCell>{capitalize(a.itemDef.label)}</TableCell>

                                            <TableCell width={160}>
                                              {mode === 'EQ' ? (
                                                <TextField
                                                  select
                                                  size="small"
                                                  value={eqSelectValue}
                                                  onChange={(e) => {
                                                    const v = e.target.value as string;
                                                    setDrafts((d) => ({
                                                      ...d,
                                                      [a.id]: {
                                                        orderItemId: item.id,
                                                        analyteId: a.id,
                                                        kind: a.itemDef.kind ?? 'TEXT',
                                                        value: v,
                                                      },
                                                    }));
                                                  }}
                                                  fullWidth
                                                  sx={{ bgcolor: isEdited ? 'rgba(255,220,0,0.12)' : undefined }}
                                                >
                                                  {EQ_OPTIONS.map((opt) => (
                                                    <MenuItem key={opt} value={opt}>
                                                      {opt}
                                                    </MenuItem>
                                                  ))}
                                                </TextField>
                                              ) : (
                                                <TextField
                                                  size="small"
                                                  type={kind === 'NUMERIC' ? 'number' : 'text'}
                                                  value={currentDraft ?? String(baseShown ?? '')}
                                                  onChange={(e) => {
                                                    const v = e.target.value;
                                                    setDrafts((d) => ({
                                                      ...d,
                                                      [a.id]: {
                                                        orderItemId: item.id,
                                                        analyteId: a.id,
                                                        kind: a.itemDef.kind,
                                                        value: v,
                                                      },
                                                    }));
                                                  }}
                                                  placeholder={kind === 'NUMERIC' ? '0.00' : 'Texto'}
                                                  fullWidth
                                                  sx={{ bgcolor: isEdited ? 'rgba(255,220,0,0.12)' : undefined }}
                                                />
                                              )}
                                            </TableCell>

                                            <TableCell width={100}>
                                              <Typography variant="body2">{a.unit || a.itemDef.unit || '—'}</Typography>
                                            </TableCell>
                                            <TableCell width={160}>
                                              <Typography variant="body2">{a.itemDef.refText || '—'}</Typography>
                                            </TableCell>
                                            <TableCell width={120} align="center">
                                              <Chip
                                                size="small"
                                                color={a.status === 'DONE' ? 'success' : 'warning'}
                                                label={a.status === 'DONE' ? 'COMPLETADO' : 'PENDIENTE'}
                                              />
                                            </TableCell>
                                          </TableRow>
                                        );
                                      });

                                    return (
                                      <>
                                        {groups.EF.length > 0 && (
                                          <>
                                            <SectionRow title={urinePrefixTitle.EF} />
                                            {renderRows(groups.EF, 'EF')}
                                          </>
                                        )}
                                        {groups.EQ.length > 0 && (
                                          <>
                                            <SectionRow title={urinePrefixTitle.EQ} />
                                            {renderRows(groups.EQ, 'EQ')}
                                          </>
                                        )}
                                        {groups.EM.length > 0 && (
                                          <>
                                            <SectionRow title={urinePrefixTitle.EM} />
                                            {renderRows(groups.EM, 'EM')}
                                          </>
                                        )}
                                      </>
                                    );
                                  })()
                                ) : (
                                  // Resto de estudios sin agrupación
                                  item.analytes.map((a: OrderItemAnalyte) => {
                                    const kind = (a.itemDef.kind || 'NUMERIC').toUpperCase();
                                    const baseShown = (a.valueNum ?? a.valueText ?? '') as string | number;
                                    const current = drafts[a.id]?.value ?? String(baseShown ?? '');
                                    const isEdited = !!drafts[a.id];

                                    return (
                                      <TableRow key={a.id}>
                                        <TableCell>{capitalize(a.itemDef.label)}</TableCell>
                                        <TableCell width={160}>
                                          <TextField
                                            size="small"
                                            type={kind === 'NUMERIC' ? 'number' : 'text'}
                                            value={current}
                                            onChange={(e) => {
                                              const v = e.target.value;
                                              setDrafts((d) => {
                                                const next = {
                                                  ...d,
                                                  [a.id]: {
                                                    orderItemId: item.id,
                                                    analyteId: a.id,
                                                    kind: a.itemDef.kind,
                                                    value: v,
                                                  },
                                                };
                                                // recalcular los (Abs) del MISMO item si aplica
                                                return recomputeAbsForItem(item, next);
                                              });
                                            }}
                                            placeholder={kind === 'NUMERIC' ? '0.00' : 'Texto'}
                                            fullWidth
                                            sx={{ bgcolor: isEdited ? 'rgba(255,220,0,0.12)' : undefined }}
                                          />
                                        </TableCell>
                                        <TableCell width={100}>
                                          <Typography variant="body2">{a.unit || a.itemDef.unit || '—'}</Typography>
                                        </TableCell>
                                        <TableCell width={160}>
                                          <Typography variant="body2">{a.itemDef.refText || '—'}</Typography>
                                        </TableCell>
                                        <TableCell width={120} align="center">
                                          <Chip
                                            size="small"
                                            color={a.status === 'DONE' ? 'success' : 'warning'}
                                            label={a.status === 'DONE' ? 'COMPLETADO' : 'PENDIENTE'}
                                          />
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })
                                )}

                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>


  );
}

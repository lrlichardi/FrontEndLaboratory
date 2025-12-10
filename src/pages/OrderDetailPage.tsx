import { useEffect, useState, Fragment, useMemo } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Chip, Grid, Link,
  Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Typography, IconButton, Collapse, MenuItem, InputAdornment, DialogActions, DialogContent, Dialog, DialogTitle, Autocomplete
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { getOrder, updateAnalytesBulk, deleteOrderItem, type TestOrder, type OrderItemAnalyte, addOrderItemsByCodes, getNomencladorAll } from '../api/OrderApi';
import { capitalize } from '../utils/utils';
import { isUrineExamCode, groupUrineAnalytes, urinePrefixTitle } from '../utils/orinaCompleta';
import NomenMiniTable from '../components/NomenMiniTable';

type DraftVal = { orderItemId: string; analyteId: string; kind: string; value: string | number };
export type NomenOpt = { label: string; value: string; ub: number };

export default function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const [order, setOrder] = useState<TestOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, DraftVal>>({});
  const dirty = Object.keys(drafts).length > 0;

  // Estados para el modal de agregar códigos
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [nomenInput, setNomenInput] = useState('');
  const [opts, setOpts] = useState<NomenOpt[]>([]);
  const [loadingOpts, setLoadingOpts] = useState(false);
  const [allNomen, setAllNomen] = useState<any[] | null>(null);
  const [codes, setCodes] = useState<string[]>([]);

  // Índice de nomenclador para búsqueda rápida
  const nomenIndex = useMemo(() => {
    const m = new Map<string, { determinacion: string; ub: number }>();
    (allNomen || []).forEach((n: any) =>
      m.set(String(n.codigo), { determinacion: n.determinacion, ub: n.ub })
    );
    return m;
  }, [allNomen]);

  // Filtrado local
  const filterLocal = (q: string) => {
    if (!allNomen) return [];
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const isNum = /^\d+$/.test(s);
    const filtered = isNum
      ? allNomen.filter((r: any) => String(r.codigo).startsWith(s))
      : allNomen.filter((r: any) => r.determinacion.toLowerCase().includes(s));
    return filtered.slice(0, 20).map((r: any) => ({
      value: String(r.codigo),
      label: `${r.codigo} — ${r.determinacion} (${r.ub} U.B.)`,
      ub: r.ub,
    }));
  };

  // Códigos ya existentes en la orden
  const existingCodes = useMemo(
    () => (order?.items ?? [])
      .map(it => String(it.examType?.code ?? ''))
      .filter(Boolean),
    [order]
  );

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

  const fmtNum = (n: any) => {
    const x = typeof n === 'number'
      ? n
      : Number(String(n ?? '').replace(/\./g, '').replace(',', '.'));

    if (Number.isFinite(x) && x > 100000) {
      return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 4 }).format(x);
    }

    return String(n ?? '');
  };

  useEffect(() => { fetchOrder(); /* eslint-disable-next-line */ }, [orderId]);

  useEffect(() => {
    // Cargá el catálogo cuando se abre el modal
    if (addOpen && allNomen === null) {
      (async () => {
        try {
          setLoadingOpts(true);
          const data = await getNomencladorAll();
          setAllNomen(data);
        } catch (e) {
          setAddErr('Error cargando nomenclador');
        } finally {
          setLoadingOpts(false);
        }
      })();
    }
  }, [addOpen, allNomen]);

  const selectedRows = useMemo(() => {
    return codes.map(c => {
      const n = nomenIndex.get(String(c));
      return {
        codigo: c,
        determinacion: n?.determinacion ?? '(desconocido)',
        ub: n?.ub ?? 0
      };
    });
  }, [codes, nomenIndex]);

  const handleRemoveCode = (codigo: string) => {
    setCodes(prev => prev.filter(x => x !== codigo));
  };

  const isFullCode = (v: string) => /^\d{6}$/.test(v);

  const addCode = (raw: string) => {
    const v = (raw || '').trim();
    if (!isFullCode(v)) return;

    // Verificar si ya existe en la orden
    if (existingCodes.includes(v)) {
      setAddErr(`El código ${v} ya está en la orden`);
      return;
    }

    // Verificar si ya está en la lista a agregar
    if (codes.includes(v)) {
      setAddErr(`El código ${v} ya está en la lista`);
      return;
    }

    setCodes(prev => [...prev, v]);
    setNomenInput('');
    setOpts([]);
    setAddErr(null);
  };

  const handleSaveAll = async () => {
    if (!order) return;
    try {
      setSaving(true);

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

      const already = new Set(updates.map(u => u.analyteId));
      for (const item of order.items) {
        if (!isUrineExamCode(item.examType.code)) continue;

        const { EQ } = groupUrineAnalytes(item.analytes);
        for (const a of EQ) {
          const hasValue = (a.valueText && a.valueText.trim() !== '') || a.valueNum != null;
          if (hasValue || already.has(a.id)) continue;

          const labelLc = (a.itemDef?.label || '').toLowerCase();
          const isUrobilina = labelLc.includes('urobil');

          updates.push({
            orderItemId: item.id,
            analyteId: a.id,
            value: isUrobilina ? 'Normal' : 'No contiene',
          });
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

    const deleted = order?.items.find(i => i.id === itemId);
    if (deleted) {
      const analyteIds = deleted.analytes.map(a => a.id);
      setDrafts(prev => {
        const next = { ...prev };
        for (const id of analyteIds) delete next[id];
        return next;
      });
      setExpanded(prev => {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      });
      setOrder(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== itemId) } : prev);
    }

    try {
      await deleteOrderItem(itemId);
      await fetchOrder();
    } catch (e: any) {
      setError(e.message || 'No se pudo eliminar');
      await fetchOrder();
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

  const ABS_PAIRS = [
    { pct: 'Neutrófilos segmentados', abs: 'Neutrófilos segmentados (abs)' },
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
        const absVal = Math.round(leucVal * pctVal / 100);
        nextDrafts[absA.id] = {
          orderItemId: item.id,
          analyteId: absA.id,
          kind: 'NUMERIC',
          value: String(absVal),
        };
      } else {
        if (nextDrafts[absA.id]) delete nextDrafts[absA.id];
      }
    }

    return nextDrafts;
  }

  let __focusIdx = 0;
  const nextIdx = () => ++__focusIdx;

  const focusFrom = (fromIdx: number, dir: 1 | -1 = 1) => {
    const all = Array.from(document.querySelectorAll<HTMLElement>('[data-idx]'))
      .sort((a, b) => Number(a.dataset.idx || 0) - Number(b.dataset.idx || 0));

    const cur = all.findIndex(el => Number(el.dataset.idx) === fromIdx);
    for (let i = cur + dir; i >= 0 && i < all.length; i += dir) {
      const el = all[i];
      const hiddenByCollapse = !!el.closest('[aria-hidden="true"]');
      const hiddenByLayout = el.offsetParent === null;
      const disabled = (el as HTMLInputElement).disabled;
      if (!hiddenByCollapse && !hiddenByLayout && !disabled) {
        el.focus();
        (el as HTMLInputElement).select?.();
        break;
      }
    }
  };

  const handleEnterNav = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Enter') return;

    const el = e.target as HTMLElement;
    const holder = el.closest<HTMLElement>('[data-idx]');
    const idx = holder ? Number(holder.dataset.idx) : NaN;

    if (!Number.isFinite(idx)) return;

    e.preventDefault();
    focusFrom(idx, e.shiftKey ? -1 : 1);
  };

  const HEMO_PCT_LABELS = [
    'Metamielocitos',
    'Neutrófilos en cayado',
    'Neutrófilos segmentados',
    'Eosinófilos',
    'Basófilos',
    'Linfocitos',
    'Monocitos',
  ];

  function computePctSumForItem(
    item: { analytes: any[] },
    draftsMap: Record<string, { value?: string | number }>
  ) {
    const byLabel = (label: string) => item.analytes.find((a: any) => a.itemDef?.label === label);
    let sum = 0;
    let count = 0;
    for (const lbl of HEMO_PCT_LABELS) {
      const a = byLabel(lbl);
      if (!a) continue;
      const raw = draftsMap[a.id]?.value ?? a.valueNum ?? a.valueText ?? '';
      const n = parseFloat(String(raw).replace(',', '.'));
      if (Number.isFinite(n)) {
        sum += n;
        count++;
      }
    }
    return { sum, count };
  }

  return (
    <Box sx={{
      backgroundColor: 'rgba(255, 255, 255, 0.82)',
      backdropFilter: 'blur(4px)',
      border: 'none', p: 2
    }}>
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
          <Button variant="outlined" startIcon={<ArrowBackIcon />}>Volver</Button>
        </Link>
        <Typography variant="h4" fontWeight={700}>Detalle del Análisis</Typography>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={() => {
              setCodes([]);
              setAddErr(null);
              setNomenInput('');
              setOpts([]);
              setAddOpen(true);
            }}
          >
            Agregar códigos
          </Button>
          <Button variant="outlined" component={RouterLink} to={`/orders/${orderId}/guide`} state={{ from: `/orders/${orderId}` }}>
            Guía de carga
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

      <Card sx={{
        mb: 3, backgroundColor: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(4px)',
        border: 'none'
      }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">Nombre</Typography>
              <Typography variant="body1" fontWeight={600}>{order.patient.lastName + ' ' + order.patient.firstName || '—'}</Typography>
            </Grid>
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
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">Protocolo</Typography>
              <Typography variant="body1" fontWeight={600}>{order.id || '—'}</Typography>
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

      <TableContainer className="print-only" component={Paper} >
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

                if (!hasMultipleItems && item.analytes.length === 1) {
                  const a = item.analytes[0];
                  const kind = (a.itemDef.kind || 'NUMERIC').toUpperCase();
                  const baseShown = (a.valueNum ?? a.valueText ?? '') as string | number;
                  const current = drafts[a.id]?.value ?? String(baseShown ?? '');
                  const isEdited = !!drafts[a.id];
                  const idx = nextIdx();

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
                          onKeyDown={handleEnterNav}
                          inputProps={{ 'data-idx': idx, onKeyDown: handleEnterNav }}
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

                return (
                  <Fragment key={item.id}>
                    <TableRow hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => toggle(item.id)}
                    >
                      <TableCell width={48}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(item.id);
                          }}
                        >
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
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell><strong>Ítem</strong></TableCell>
                                  <TableCell width={250}><strong>Resultado</strong></TableCell>
                                  <TableCell width={100}><strong>Unidad</strong></TableCell>
                                  <TableCell width={160}><strong>Rango Ref.</strong></TableCell>
                                  <TableCell width={120} align="center"><strong>Estado</strong></TableCell>
                                </TableRow>
                              </TableHead>

                              <TableBody>
                                {isUrineExamCode(item.examType.code) ? (
                                  (() => {
                                    const groups = groupUrineAnalytes(item.analytes);

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
                                        const idx = nextIdx();
                                        const currentDraft = drafts[a.id]?.value;

                                        const isUro = (a.itemDef?.label || '').toLowerCase() === 'urobilina';
                                        const EQ_OPTIONS = ['No contiene', 'Contiene', 'Contiene +', 'Contiene ++', 'Contiene +++', 'Contiene ++++', 'Normal'] as const;
                                        const EM_EPI_OPTIONS = ['Escasas', 'Regulares', 'Abundantes'] as const;
                                        const EM_MUC_OPTIONS = ['Escaso', 'Regular', 'Abundante'] as const;
                                        const isEspuma = mode === 'EF' && (a.itemDef?.label.includes('Espuma'))
                                        const isEpiteliales = mode === 'EM' && (a.itemDef?.label.includes('CEL'));
                                        const isMucus = mode === 'EM' && (a.itemDef?.label.includes('MUCUS'));
                                        const raw = currentDraft ?? String(baseShown ?? '');
                                        const numericPreview = kind === 'NUMERIC' ? fmtNum(raw) : '';
                                        const isEdited = !!drafts[a.id];

                                        const OPTIONS =
                                          mode === 'EQ' ? EQ_OPTIONS
                                            : (isEpiteliales ? EM_EPI_OPTIONS : isMucus ? EM_MUC_OPTIONS : []);

                                        const defaultValue =
                                          mode === 'EQ' ? (isUro ? 'Normal' : 'No contiene')
                                            : ''

                                        const shownValue =
                                          (drafts[a.id]?.value as string) ?? a.valueText ?? defaultValue;

                                        return (
                                          <TableRow key={a.id}>
                                            <TableCell>{capitalize(a.itemDef.label)}</TableCell>

                                            <TableCell width={160}>
                                              {mode === 'EQ' || (isEpiteliales || isMucus) ? (
                                                <TextField
                                                  select
                                                  size="small"
                                                  value={shownValue}
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
                                                  onKeyDown={handleEnterNav}
                                                  inputProps={{ 'data-idx': idx, onKeyDown: handleEnterNav }}
                                                  InputProps={{
                                                    endAdornment: (kind === 'NUMERIC' && numericPreview) ? (
                                                      <InputAdornment position="end" sx={{ color: 'text.secondary', fontSize: 12 }}>
                                                        {numericPreview}
                                                      </InputAdornment>
                                                    ) : undefined,
                                                  }}
                                                  fullWidth
                                                  sx={{ bgcolor: isEdited ? 'rgba(255,220,0,0.12)' : undefined }}
                                                >
                                                  {OPTIONS.map((opt) => (
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
                                              <Typography variant="body2">{capitalize(a.itemDef.refText) || '—'}</Typography>
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
                                  (() => {
                                    const rows = item.analytes.map((a: OrderItemAnalyte) => {
                                      const kind = (a.itemDef.kind || 'NUMERIC').toUpperCase();
                                      const baseShown = (a.valueNum ?? a.valueText ?? '') as string | number;
                                      const current = drafts[a.id]?.value ?? String(baseShown ?? '');
                                      const isEdited = !!drafts[a.id];
                                      const idx = nextIdx();
                                      const numericPreview = kind === 'NUMERIC' ? fmtNum(current) : '';
                                      return (
                                        <TableRow key={a.id}>
                                          <TableCell>{capitalize(a.itemDef.label)}</TableCell>
                                          <TableCell width={160}>
                                            <TextField
                                              size="small"
                                              type={kind === 'NUMERIC' ? 'number' : 'text'}
                                              value={current}
                                              onKeyDown={handleEnterNav}
                                              inputProps={{ 'data-idx': idx }}
                                              InputProps={{
                                                endAdornment: (kind === 'NUMERIC' && numericPreview) ? (
                                                  <InputAdornment position="end" sx={{ color: 'text.secondary', fontSize: 12 }}>
                                                    {numericPreview}
                                                  </InputAdornment>
                                                ) : undefined,
                                              }}
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
                                    });

                                    const { sum, count } = computePctSumForItem(item, drafts);
                                    if (count > 0) {
                                      const ok = Math.abs(sum - 100) < 0.5;
                                      rows.push(
                                        <TableRow key={`${item.id}-pctsum`}>
                                          <TableCell colSpan={2} align="right" >
                                            <Chip
                                              size="medium"
                                              color={ok ? 'success' : 'error'}
                                              sx={{ l: 4 }}
                                              label={`Suma: ${Number.isFinite(sum) ? sum.toFixed(2) : '—'}%`}
                                            />
                                          </TableCell>
                                        </TableRow>
                                      );
                                    }

                                    return rows;
                                  })()
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

      <Box
        className="no-print"
        sx={{
          mt: 2,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <Button
          variant="contained"
          disabled={!dirty || saving}
          onClick={handleSaveAll}
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </Box>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar códigos a la orden</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {addErr && <Alert severity="error">{addErr}</Alert>}

            <Autocomplete
              freeSolo
              options={opts}
              loading={loadingOpts}
              filterOptions={(x) => x}
              getOptionLabel={(o) => typeof o === 'string' ? o : o.label}
              value={null}
              inputValue={nomenInput}
              onInputChange={(_, v, reason) => {
                setNomenInput(v);
                if (reason === 'input') setOpts(filterLocal(v));
              }}
              onChange={(_, opt) => {
                const val = typeof opt === 'string' ? opt : (opt as NomenOpt)?.value;
                if (val) addCode(val);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Agregar código de nomenclador"
                  placeholder="Tipeá código (6 dígitos) o nombre…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (isFullCode(nomenInput)) addCode(nomenInput);
                    }
                  }}
                  helperText="Ingresá el código completo (6 dígitos) o elegí de la lista"
                />
              )}
            />

            <NomenMiniTable
              rows={selectedRows}
              onRemove={handleRemoveCode}
              showTotals
            />

            <Typography variant="body2" color="text.secondary">
              Agregá uno o varios códigos. Se crearán ítems por cada código.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={adding}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={adding || codes.length === 0}
            onClick={async () => {
              if (!order) return;
              try {
                setAdding(true);
                setAddErr(null);
                await addOrderItemsByCodes(order.id, codes);
                setAddOpen(false);
                setCodes([]);
                setNomenInput('');
                setOpts([]);
                await fetchOrder();
              } catch (e: any) {
                setAddErr(e.message || 'No se pudieron agregar los códigos');
              } finally {
                setAdding(false);
              }
            }}
          >
            {adding ? 'Agregando…' : `Agregar ${codes.length} código${codes.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
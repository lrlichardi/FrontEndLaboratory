import { useEffect, useMemo, useState } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Link, Stack, TextField, Typography, Autocomplete, IconButton, Tooltip, Snackbar,
  MenuItem,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BloodtypeIcon from '@mui/icons-material/Bloodtype';
import BiotechIcon from '@mui/icons-material/Biotech';
import StatusCell from '../components/StatusCell';
import {
  listOrders, createOrder, updateOrderStatus, deleteOrder,
  getNomencladorAll, updateOrder, addOrderItemsByCodes, deleteOrderItem,
  TestOrder, Nomen,
} from '../api/OrderApi';
import { Doctor, createDoctor, listDoctors } from '../api/DoctorApi'
import { getPatient, Patient } from '../api/PatientApi'
import { createAccountEntry } from '../api/accountApi'
import PatientNotes from '../components/PatientNotes';
import type { OrderStatus } from '../utils/status';
import NomenMiniTable from '../components/NomenMiniTable';
import type { NomenRow } from '../components/NomenMiniTable';
import { STATUS_LABEL } from '../utils/status';
import FlagChip from '../components/FlagChip';
import DoctorFormDialog from '../components/DoctorFormDialog';


export default function PatientAnalysesPage() {
  const { patientId = '' } = useParams();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<TestOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [title, setTitle] = useState('');

  const [doctorId, setDoctorId] = useState('');
  const [nomenInput, setNomenInput] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [opts, setOpts] = useState<{ label: string; value: string }[]>([]);
  const [allNomen, setAllNomen] = useState<Nomen[] | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [methodPay, setmethodPay] = useState('');
  const [notice, setNotice] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [editingOrder, setEditingOrder] = useState<TestOrder | null>(null);
  const [existingByCode, setExistingByCode] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<string[]>([]);
  // manejo de fondos
  const [chargeTotal, setChargeTotal] = useState('');
  const [paidNow, setPaidNow] = useState('');
  // 👇 lista de médicos desde el back
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorDialogOpen, setDoctorDialogOpen] = useState(false);

  const [errs, setErrs] = useState<Record<string, string>>({});
  const [codeErrs, setCodeErrs] = useState<string[]>([]);

  const clearErr = (k: string) =>
    setErrs(prev => {
      if (!prev[k]) return prev;
      const { [k]: _omit, ...rest } = prev;
      return rest;
    });

  const resetForm = () => {
    setEditingOrder(null);
    setOrderNumber('');
    setTitle('');
    setDoctorId('');
    setmethodPay('');
    setNotes('');
    setCodes([]);
    setExistingByCode({});
    setToDelete([]);
    setNomenInput('');
    setOpts([]);
    setErrs({});
    setCodeErrs([]);
    setError(null);
  };

  useEffect(() => {
    if (!open) return;
    // cargo doctores al abrir el diálogo
    listDoctors().then(setDoctors).catch(() => setDoctors([]));
  }, [open]);

  useEffect(() => {
    if (methodPay !== 'Particular' && methodPay !== 'Obra Social + adicional') {
      setChargeTotal('');
      setPaidNow('');
    }
  }, [methodPay]);

  useEffect(() => { fetchData(); }, [patientId]);
  useEffect(() => { if (patientId) getPatient(patientId).then(setPatient).catch(() => setPatient(null)); }, [patientId]);
  useEffect(() => {
    if (open && allNomen === null) getNomencladorAll().then(setAllNomen).catch(() => setAllNomen([]));
  }, [open, allNomen]);

  // columnas de la tabla

  const cols: GridColDef[] = useMemo(() => [
    { field: 'createdAt', headerName: 'Fecha', minWidth: 140, valueGetter: p => (p.row.createdAt || '').slice(0, 10) },
    { field: 'orderNumber', headerName: 'Orden', minWidth: 140, flex: 1 },
    {
      field: 'doctor', headerName: 'Médico', minWidth: 220, flex: 1,
      valueGetter: p => ((p.row.doctor?.fullName || '')).trim()
    },
    {
      field: 'items', headerName: 'Ítems', flex: 1.5, minWidth: 300,
      valueGetter: p => (p.row.items || []).map((i: any) => i.examType?.code + ' - ' + i.examType?.name).join(' | ')
    },
    { field: 'notes', headerName: 'Notas', flex: 1, minWidth: 200 },
    {
      field: 'status', headerName: 'Estado', minWidth: 220, sortable: false,
      renderCell: (p) => {
        const s = (p.row.status || 'PENDING') as OrderStatus;
        return (
          <StatusCell
            value={s}
            label={STATUS_LABEL[s]}
            onChange={(next) => handleStatusChange(p.row.id, next)}
          />
        );
      },
    },
    {
      field: 'actions', headerName: 'Acciones', minWidth: 160, sortable: false, filterable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Ver detalle">
            <IconButton size="small" onClick={() => navigate(`/orders/${p.row.id}`)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              onClick={() => {
                setEditingOrder(p.row);
                setOrderNumber(p.row.orderNumber || '');
                setTitle(p.row.title || '');
                setDoctorId(p.row.doctorId || '');
                setmethodPay(p.row.methodPay || '');

                setNotes(p.row.notes || '');
                const existingCodes = (p.row.items || [])
                  .map((item: any) => String(item.examType?.code || ''))
                  .filter((code: string) => code && /^\d{6}$/.test(code));
                setCodes(existingCodes);
                const codeToItemId: Record<string, string> = {};
                (p.row.items || []).forEach((item: any) => {
                  if (item.examType?.code) codeToItemId[String(item.examType.code)] = item.id;
                });
                setExistingByCode(codeToItemId);
                setToDelete([]);
                setOpen(true);
                if (!allNomen) getNomencladorAll().then(setAllNomen).catch(() => setAllNomen([]));
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => handleDelete(p.row.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ], [navigate, allNomen]);

  const payMethod = [
    { id: '1', fullName: 'Obra Social' },
    { id: '2', fullName: 'Obra Social + adicional' },
    { id: '3', fullName: 'Particular' },
  ];

  const toMoney = (s: string) => {
    const n = parseFloat(String(s ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  };

  const handleCreateDoctor = async (payload: Partial<Doctor>) => {
    try {
      const nuevo = await createDoctor(payload);
      // lo agregamos a la lista local
      setDoctors(prev => [...prev, nuevo]);
      // dejamos seleccionado el que se acaba de crear
      if (nuevo.id) setDoctorId(nuevo.id);
      setDoctorDialogOpen(false);
    } catch (e: any) {
      setError(e.message || 'No se pudo crear el médico');
    }
  };

  function validateForm() {
    const e: Record<string, string> = {};
    const ce: string[] = [];

    // Códigos
    if (codes.length === 0) e.codes = 'Agregá al menos un código';
    if (codes.some(c => !/^\d{6}$/.test(c))) e.codes = 'Todos los códigos deben tener 6 dígitos';

    // Existen en Nomenclador (si ya tenés cargado allNomen)
    const unknown = codes.filter(c => !nomenIndex.get(String(c)));
    if (unknown.length) ce.push(`Códigos no encontrados en Nomenclador: ${unknown.join(', ')}`);

    // orderNumber único en la lista actual (evita muchos P2002 locales)
    if (orderNumber && orders.some(o => o.id !== editingOrder?.id && (o.orderNumber || '') === orderNumber)) {
      e.orderNumber = 'Ya existe una orden con ese número';
    }

    // Reglas de pago
    const exigeMontos = methodPay === 'Particular' || methodPay === 'Obra Social + adicional';
    if (exigeMontos) {
      const t = toMoney(chargeTotal);
      const p = toMoney(paidNow);
      if (!Number.isFinite(t) || t <= 0) e.chargeTotal = 'Ingresá un monto > 0';
      if (!Number.isFinite(p) || p < 0) e.paidNow = 'Pago inválido';
      if (Number.isFinite(t) && Number.isFinite(p) && p > t) e.paidNow = 'No puede superar el cargo';
    }

    // Médico requerido si es OS (opcional, quitá si no aplica)
    if (methodPay?.startsWith('Obra Social') && !doctorId) {
      e.doctorId = 'Seleccioná un médico para obra social';
    }

    setErrs(e);
    setCodeErrs(ce);
    return { ok: Object.keys(e).length === 0 && ce.length === 0 };
  }

  const fetchData = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await listOrders(patientId);
      setOrders(data);
    } catch (e: any) {
      setError(e.message || 'Error cargando análisis');
    } finally {
      setLoading(false);
    }
  };

  const filterLocal = (q: string) => {
    if (!allNomen) return [];
    const s = q.trim().toLowerCase();
    const b = 66 + s
    if (!s) return [];
    const isNum = /^\d+$/.test(b);
    const pool = allNomen;
    const filtered = isNum
      ? pool.filter(r => String(r.codigo).startsWith(b))
      : pool.filter(r => r.determinacion.toLowerCase().includes(s));
    return filtered.slice(0, 20).map(r => ({
      value: String(r.codigo),
      label: `${r.codigo} — ${r.determinacion} (${r.ub} U.B.),`,
    }));
  };

  const handleStatusChange = async (orderId: string, next: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, next);
      fetchData();
    } catch (e: any) {
      setError(e.message || 'No se pudo actualizar el estado');
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!window.confirm('¿Eliminar esta orden y todos sus ítems?')) return;
    try {
      await deleteOrder(orderId);
      fetchData();
    } catch (e: any) {
      setError(e.message || 'No se pudo eliminar');
    }
  };

  const handleRemoveCode = (codigo: string) => {
    // sacá el código de la UI
    setCodes(prev => {
      const next = prev.filter(x => x !== codigo);
      if (next.length > 0) { clearErr('codes'); setCodeErrs([]); }
      else { setErrs(p => ({ ...p, codes: 'Agregá al menos un código' })); }
      return next;
    });

    const itemId = existingByCode[codigo];
    if (itemId) {
      setToDelete(prev => (prev.includes(itemId) ? prev : [...prev, itemId]));

      setExistingByCode(prev => {
        const { [codigo]: _removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const isFullCode = (v: string) => /^\d{6}$/.test(v);
  const addCode = (raw: string) => {
    const v = (raw || '').trim();
    if (!isFullCode(v)) return;
    setCodes(prev => (prev.includes(v) ? prev : [...prev, v]));
    setNomenInput('');
    setOpts([]);
    setError(null);
    clearErr('codes');
    setCodeErrs([]);
  };

  const nomenIndex = useMemo(() => {
    const m = new Map<string, { determinacion: string; ub: number }>();
    (allNomen || []).forEach(n => m.set(String(n.codigo), { determinacion: n.determinacion, ub: n.ub }));
    return m;
  }, [allNomen]);

  const selectedRows: NomenRow[] = useMemo(() => {
    return codes.map(c => {
      const n = nomenIndex.get(String(c));
      return { codigo: c, determinacion: n?.determinacion ?? '(desconocido)', ub: n?.ub ?? 0 };
    });
  }, [codes, nomenIndex]);

  const handleSave = async () => {
    if (!patientId) return;

    const { ok } = validateForm();
    if (!ok) {
      setError('Revisá los campos marcados.');
      return;
    }

    if (codes.some(c => !/^\d{6}$/.test(c))) {
      setError('Todos los códigos deben tener 6 dígitos');
      return;
    }

    try {
      if (editingOrder) {
        // actualizar metadata (mantenemos doctorName como string)
        const resp = await updateOrder(editingOrder.id, {
          orderNumber: orderNumber || null,
          title: title || null,
          doctorId: doctorId || undefined,
          methodPay: methodPay || null,
          notes: notes || null,
        });
        if (toDelete.length > 0) {
          for (const itemId of toDelete) await deleteOrderItem(itemId);
        }
        const newCodes = codes.filter(c => !existingByCode[c]);
        if (newCodes.length > 0) {
          await addOrderItemsByCodes(editingOrder.id, newCodes);
        }
        setNotice({ open: true, message: '¡Análisis actualizado!' });
      } else {
        // alta tradicional
        const resp = await createOrder({
          patientId,
          orderNumber: orderNumber || undefined,
          title: title || undefined,
          doctorId: doctorId || undefined,
          methodPay: methodPay || null,
          examCodes: codes,
        });

        try {
          if (methodPay === 'Particular' || methodPay === 'Obra Social + adicional') {
            const orderId = resp?.id // adaptalo a lo que devuelva tu API
            if (orderId) {
              const t = parseFloat((chargeTotal || '0').replace(',', '.')) || 0;
              const p = parseFloat((paidNow || '0').replace(',', '.')) || 0;

              if (t > 0) {
                await createAccountEntry(patientId, {
                  kind: 'CHARGE',
                  amount: t,
                  description: `Cargo orden #${orderNumber || ''}`,
                  testOrderId: orderId,
                });
              }
              if (p > 0) {
                await createAccountEntry(patientId, {
                  kind: 'PAYMENT',
                  amount: p,
                  description: `Pago orden #${orderNumber || ''}`,
                  testOrderId: orderId,
                });
              }
            }
          }
        } catch (_) {
          // si falla el registro contable no rompemos la creación de la orden
        }
        setNotice({
          open: true,
          message: (resp as any)?.message || '¡Análisis creado correctamente!',
        });
      }
      setOpen(false);
      setEditingOrder(null);
      setOrderNumber('');
      setTitle('');
      setDoctorId('');
      setNotes('');
      setCodes([]);
      setExistingByCode({});
      setToDelete([]);
      fetchData();
    } catch (e: any) {
      setError(e.message || 'No se pudo guardar');
    }
  };

  const handleCloseNotice = (_?: any, reason?: string) => {
    if (reason === 'clickaway') return;
    setNotice({ open: false, message: '' });
  };

  const saldo = useMemo(() => {
    const t = parseFloat((chargeTotal || '0').replace(',', '.')) || 0;
    const p = parseFloat((paidNow || '0').replace(',', '.')) || 0;
    return Math.max(t - p, 0);
  }, [chargeTotal, paidNow]);

  const canCreate = useMemo(() => {
    const okCodes = codes.length > 0 && codes.every(c => /^\d{6}$/.test(c));
    const exigeMontos = methodPay === 'Particular' || methodPay === 'Obra Social + adicional';
    const t = parseFloat((chargeTotal || '0').replace(',', '.'));
    const p = parseFloat((paidNow || '0').replace(',', '.'));
    const okMoney = !exigeMontos || (Number.isFinite(t) && t > 0 && Number.isFinite(p) && p >= 0 && p <= t);
    const okDoctor = !methodPay?.startsWith('Obra Social') || !!doctorId;
    return okCodes && okMoney && okDoctor && !loading;
  }, [codes, methodPay, chargeTotal, paidNow, doctorId, loading]);

  return (
    <Box sx={{
      backgroundColor: 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(4px)',
      border: 'none', p: 2
    }}>
      <Snackbar open={notice.open} autoHideDuration={3000} onClose={handleCloseNotice} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={handleCloseNotice} severity="success" variant="filled" sx={{ width: '100%' }}>
          {notice.message}
        </Alert>
      </Snackbar>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          <Link component={RouterLink} to="/patients" underline="none">
            <Button startIcon={<ArrowBackIcon />} variant="outlined">Volver</Button>
          </Link>

          <Typography variant="h5" fontWeight={700}>
            {patient
              ? `Análisis de ${patient.lastName}, ${patient.firstName}${patient.dni ? ` — DNI ${patient.dni}` : ''}`
              : 'Análisis del Paciente'}
          </Typography>

          {patient && (
            <Stack direction="column" alignItems="center" sx={{ ml: 1, flexWrap: 'wrap', rowGap: 1 }}>
              <FlagChip
                label="Diabetes"
                value={patient?.diabetico}
                icon={<BloodtypeIcon fontSize="small" />}
              />
              <FlagChip
                label="Tiroides"
                value={patient?.tiroides}
                icon={<BiotechIcon fontSize="small" />}
              />
            </Stack>
          )}
        </Stack>
        <Box sx={{ ml: 1, mr: 1, flexGrow: 1, }}>
          {patient && (
            <PatientNotes patientId={patient.id} />
          )}
        </Box>
        <Stack >
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setOpen(true); }}>
            NUEVO ANÁLISIS
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ height: 560, width: '100%' }}>
        <DataGrid
          rows={orders}
          getRowId={(r) => r.id}
          columns={cols}
          loading={loading}
          disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      </Box>

      <Dialog open={open} onClose={() => { setOpen(false); resetForm(); }} fullWidth maxWidth="sm">
        <DialogTitle>{editingOrder ? 'Editar análisis' : 'Nuevo análisis'}</DialogTitle>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField label="N° de orden" value={orderNumber} onChange={(e) => { setOrderNumber(e.target.value); clearErr('orderNumber'); setError(null); }} error={!!errs.orderNumber}
              helperText={errs.orderNumber || ''} fullWidth />
            <TextField label="Titulo" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />

            {/* 👇 Select de médicos (MenuItem) */}
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                label="Médico"
                select
                value={doctorId}
                onChange={(e) => { setDoctorId(e.target.value); clearErr('doctorId'); setError(null); }}
                error={!!errs.doctorId}
                helperText={errs.doctorId || ''}
                fullWidth
              >
                <MenuItem value="">— Sin médico —</MenuItem>
                {doctors.map((d) => (
                  <MenuItem key={d.id} value={(d.id ?? '')}>
                    {d.fullName}
                  </MenuItem>
                ))}
              </TextField>

              <Tooltip title="Agregar nuevo médico">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => setDoctorDialogOpen(true)}
                  sx={{ flexShrink: 0 }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            <TextField
              label="Forma de pago"
              select
              value={methodPay ?? ''}
              onChange={(e) => { setmethodPay(e.target.value); clearErr('chargeTotal'); clearErr('paidNow'); setError(null); }}
              fullWidth
            >
              <MenuItem value="">—</MenuItem>
              {payMethod.map((d) => (
                <MenuItem key={d.id} value={(d.fullName ?? '')}>
                  {d.fullName}
                </MenuItem>
              ))}
            </TextField>
            {(methodPay === 'Particular' || methodPay === 'Obra Social + adicional') && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Cargo total ($)"
                  inputMode="decimal"
                  value={chargeTotal}
                  onChange={(e) => { setChargeTotal(e.target.value); clearErr('chargeTotal'); setError(null); }}
                  error={!!errs.chargeTotal}
                  helperText={errs.chargeTotal || ''}
                  fullWidth
                />
                <TextField
                  label="Pago ahora ($)"
                  inputMode="decimal"
                  value={paidNow}
                  onChange={(e) => { setPaidNow(e.target.value); clearErr('paidNow'); setError(null); }}
                  helperText={errs.paidNow ? errs.paidNow : `Saldo: $ ${saldo.toFixed(2)}`}
                  error={!!errs.paidNow}

                />
              </Stack>
            )}

            <TextField label="Observaciones" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth />


            {(errs.codes || codeErrs.length > 0) && (
              <Alert severity="warning">
                {errs.codes || codeErrs.join(' | ')}
              </Alert>
            )}

            <Autocomplete
              freeSolo
              options={opts}
              filterOptions={(x) => x}
              value={null}
              inputValue={nomenInput}
              onInputChange={(_, v, reason) => {
                setNomenInput(v);
                if (reason === 'input') setOpts(filterLocal(v));
              }}
              onChange={(_, opt) => {
                const val = typeof opt === 'string' ? opt : (opt as any)?.value;
                if (val) addCode(66 + val);
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
          <Button onClick={() => { setOpen(false); resetForm(); }}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={!canCreate}>
            {editingOrder ? 'Guardar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      <DoctorFormDialog
        open={doctorDialogOpen}
        onClose={() => setDoctorDialogOpen(false)}
        onSubmit={handleCreateDoctor}
        initial={null}
      />
    </Box>
  );
}

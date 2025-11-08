import { useEffect, useMemo, useState } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Link, Stack, TextField, Typography, Autocomplete, IconButton, Tooltip, Snackbar,
  MenuItem, // 👈 agregado
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import StatusCell from '../components/StatusCell';
import type { TestOrder, Nomen, Doctor } from '../api'; // 👈 Doctor
import {
  getPatient, listOrders, createOrder, updateOrderStatus, deleteOrder,
  getNomencladorAll, Patient, updateOrder, addOrderItemsByCodes, deleteOrderItem,
  listDoctors, // 👈 nuevo API
} from '../api';
import type { OrderStatus } from '../utils/status';
import NomenMiniTable from '../components/NomenMiniTable';
import type { NomenRow } from '../components/NomenMiniTable';
import { STATUS_LABEL } from '../utils/status';

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

  // 👉 ahora doctorName se elige desde un select con opciones del back
  const [doctorName, setDoctorName] = useState('');

  const [nomenInput, setNomenInput] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [opts, setOpts] = useState<{ label: string; value: string }[]>([]);
  const [allNomen, setAllNomen] = useState<Nomen[] | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);

  const [notice, setNotice] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [editingOrder, setEditingOrder] = useState<TestOrder | null>(null);
  const [existingByCode, setExistingByCode] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<string[]>([]);

  // 👇 lista de médicos desde el back
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  useEffect(() => {
    if (!open) return;
    // cargo doctores al abrir el diálogo
    listDoctors().then(setDoctors).catch(() => setDoctors([]));
  }, [open]);

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
                setDoctorName(p.row.doctor?.fullName || '');
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
    { id: '2', fullName: 'Obra Social + adiciona' },
    { id: '3', fullName: 'Particular' },
  ];

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

  useEffect(() => { fetchData(); }, [patientId]);
  useEffect(() => { if (patientId) getPatient(patientId).then(setPatient).catch(() => setPatient(null)); }, [patientId]);
  useEffect(() => {
    if (open && allNomen === null) getNomencladorAll().then(setAllNomen).catch(() => setAllNomen([]));
  }, [open, allNomen]);

  const filterLocal = (q: string) => {
    if (!allNomen) return [];
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const isNum = /^\d+$/.test(s);
    const pool = allNomen;
    const filtered = isNum
      ? pool.filter(r => String(r.codigo).startsWith(s))
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

  const isFullCode = (v: string) => /^\d{6}$/.test(v);
  const addCode = (raw: string) => {
    const v = (raw || '').trim();
    if (!isFullCode(v)) return;
    setCodes(prev => (prev.includes(v) ? prev : [...prev, v]));
    setNomenInput('');
    setOpts([]);
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
    if (codes.some(c => !/^\d{6}$/.test(c))) {
      setError('Todos los códigos deben tener 6 dígitos');
      return;
    }

    try {
      if (editingOrder) {
        // actualizar metadata (mantenemos doctorName como string)
        await updateOrder(editingOrder.id, {
          orderNumber: orderNumber || null,
          title: title || null,
          doctorName: doctorName || null, 
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
          doctorName: doctorName || undefined, // 👈 del select
          examCodes: codes,
          notes: notes || undefined,
        });
        setNotice({ open: true, message: resp?.message || '¡Análisis creado correctamente!' });
      }
      setOpen(false);
      setEditingOrder(null);
      setOrderNumber('');
      setTitle('');
      setDoctorName('');
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

  return (
    <Box>
      <Snackbar open={notice.open} autoHideDuration={3000} onClose={handleCloseNotice} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={handleCloseNotice} severity="success" variant="filled" sx={{ width: '100%' }}>
          {notice.message}
        </Alert>
      </Snackbar>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Link component={RouterLink} to="/patients" underline="none">
            <Button startIcon={<ArrowBackIcon />}>Volver</Button>
          </Link>
          <Typography variant="h5" fontWeight={700}>
            {patient ? `Análisis de ${patient.lastName}, ${patient.firstName}${patient.dni ? ` — DNI ${patient.dni}` : ''}` : 'Análisis del Paciente'}
          </Typography>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Nuevo análisis
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingOrder ? 'Editar análisis' : 'Nuevo análisis'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField label="N° de orden" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} fullWidth />
            <TextField label="Titulo" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />

            {/* 👇 Select de médicos (MenuItem) */}
            <TextField
              label="Médico"
              select
              value={doctorName ?? ''}    
              onChange={(e) => setDoctorName(e.target.value)}
              fullWidth
            >
              <MenuItem value="">— Sin médico —</MenuItem>
              {doctors.map((d) => (
                <MenuItem key={d.id} value={(d.fullName ?? '')}> 
                  {d.fullName}
                </MenuItem>
              ))}        
            </TextField>

            <TextField
              label="Médico"
              select
              value={doctorName ?? ''}    
              onChange={(e) => setDoctorName(e.target.value)}
              fullWidth
            >
              <MenuItem value="">—</MenuItem>
              {payMethod.map((d) => (
                <MenuItem key={d.id} value={(d.fullName ?? '')}> 
                  {d.fullName}
                </MenuItem>
              ))}        
            </TextField>


            <TextField label="Observaciones" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth />

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
              onRemove={(codigo) => setCodes(prev => prev.filter(x => x !== codigo))}
              showTotals
            />

            <Typography variant="body2" color="text.secondary">
              Agregá uno o varios códigos. Se crearán ítems por cada código.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpen(false); setEditingOrder(null); }}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">
            {editingOrder ? 'Guardar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

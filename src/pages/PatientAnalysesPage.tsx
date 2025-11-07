import { useEffect, useMemo, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, Stack, TextField, Typography, Autocomplete, IconButton, Tooltip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StatusCell from '../components/StatusCell';
import type { TestOrder, Nomen } from '../api';
import { getPatient, listOrders, createOrder, updateOrderStatus, deleteOrder, getNomencladorAll, Patient } from '../api';
import type { OrderStatus } from '../utils/status';
import NomenMiniTable from '../components/NomenMiniTable';
import type { NomenRow } from '../components/NomenMiniTable';
import { useNavigate } from 'react-router-dom';
import { STATUS_LABEL } from '../utils/status';

export default function PatientAnalysesPage() {
    const { patientId = '' } = useParams();
    const [orders, setOrders] = useState<TestOrder[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [notes, setNotes] = useState('');
    const [orderNumber, setOrderNumber] = useState('');
    const [title, setTitle] = useState('');
    const [doctorName, setDoctorName] = useState('');
    const [nomenInput, setNomenInput] = useState('');
    const [codes, setCodes] = useState<string[]>([]);
    const [opts, setOpts] = useState<{ label: string; value: string }[]>([]);
    const [allNomen, setAllNomen] = useState<Nomen[] | null>(null);
    const [patient, setPatient] = useState<Patient | null>(null);

    const navigate = useNavigate();

    const cols: GridColDef[] = useMemo(() => [
        { field: 'createdAt', headerName: 'Fecha', minWidth: 140, valueGetter: p => (p.row.createdAt || '').slice(0, 10) },
        { field: 'orderNumber', headerName: 'Orden', minWidth: 140, flex: 1 },
        {
            field: 'doctor', headerName: 'Médico', minWidth: 220, flex: 1,
            valueGetter: p => p.row.doctor?.fullName || ''
        },
        { field: 'items', headerName: 'Ítems', flex: 1.5, minWidth: 300, valueGetter: p => (p.row.items || []).map((i: any) => i.examType?.code + ' - ' + i.examType?.name).join(' | ') },
        { field: 'notes', headerName: 'Notas', flex: 1, minWidth: 200 },
        {
            field: 'status',
            headerName: 'Estado',
            minWidth: 220,
            sortable: false,
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
            field: 'actions',
            headerName: 'Acciones',
            minWidth: 160,
            sortable: false,
            filterable: false,
            renderCell: (p) => (
                <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Ver detalle">
                        <IconButton size="small" onClick={() => navigate(`/orders/${p.row.id}`)}>
                            <VisibilityIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => ''} disabled>
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
    ], []);

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


    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId]);

    useEffect(() => {
        if (!patientId) return;
        getPatient(patientId).then(setPatient).catch(() => setPatient(null));
    }, [patientId]);

    useEffect(() => {
        if (open && allNomen === null) {
            getNomencladorAll().then(setAllNomen).catch(() => setAllNomen([]));
        }
    }, [open, allNomen]);

    

    const filterLocal = (q: string) => {
        if (!allNomen) return [];
        const s = q.trim().toLowerCase();
        if (!s) return [];
        const isNum = /^\d+$/.test(s);
        const pool = allNomen;
        const filtered = isNum
            ? pool.filter(r => String(r.codigo).startsWith(s)) // prefijo por código
            : pool.filter(r => r.determinacion.toLowerCase().includes(s));
        // mapeo a opciones con detalle SIEMPRE
        return filtered.slice(0, 20).map(r => ({
            value: String(r.codigo),
            label: `${r.codigo} — ${r.determinacion} (${r.ub} U.B.)`,
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
        if (!isFullCode(v)) return;                         // 👈 solo 6 dígitos
        setCodes(prev => (prev.includes(v) ? prev : [...prev, v]));
        setNomenInput('');                                  // 👈 limpia input
        setOpts([]);                                        // cierra sugerencias
    };

    const nomenIndex = useMemo(() => {
        const m = new Map<string, { determinacion: string; ub: number }>();
        (allNomen || []).forEach(n => m.set(String(n.codigo), {
            determinacion: n.determinacion,
            ub: n.ub,
        }));
        return m;
    }, [allNomen]);


    const selectedRows: NomenRow[] = useMemo(() => {
        return codes.map(c => {
            const n = nomenIndex.get(String(c));
            return {
                codigo: c,
                determinacion: n?.determinacion ?? '(desconocido)',
                ub: n?.ub ?? 0,
            };
        });
    }, [codes, nomenIndex]);

    const handleCreate = async () => {
        if (!patientId || codes.length === 0) { setError('Agregá al menos un código'); return; }
        try {
            await createOrder({ patientId, orderNumber: orderNumber || undefined, title: title || undefined, doctorName: doctorName || undefined, examCodes: codes, notes: notes || undefined, });
            setOpen(false);
            setOrderNumber(''); setTitle(''); setDoctorName(''); setCodes([]);
            fetchData();
        } catch (e: any) { setError(e.message || 'No se pudo crear el análisis'); }
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Link component={RouterLink} to="/patients" underline="none">
                        <Button startIcon={<ArrowBackIcon />}>Volver</Button>
                    </Link>
                    <Typography variant="h5" fontWeight={700}>
                        {patient
                            ? `Análisis de ${patient.lastName}, ${patient.firstName}` +
                            (patient.dni ? ` — DNI ${patient.dni}` : '')
                            : 'Análisis del Paciente'}
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
                    pageSizeOptions={[10, 20, 50]}
                />
            </Box>

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Nuevo análisis</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        <TextField label="N° de orden" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} fullWidth />
                        <TextField label="Nombre (título)" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
                        <TextField label="Médico" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} fullWidth />
                        <TextField label="Nota" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth />

                        <Autocomplete
                            freeSolo
                            options={opts}
                            filterOptions={(x) => x}
                            value={null}
                            inputValue={nomenInput}
                            onInputChange={(_, v, reason) => {
                                setNomenInput(v);
                                if (reason === 'input') setOpts(filterLocal(v)); // tu función local
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
                    <Button onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreate} variant="contained">Crear</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
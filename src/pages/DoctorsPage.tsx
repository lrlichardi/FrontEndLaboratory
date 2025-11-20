import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  InputAdornment,         
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { listDoctors, createDoctor, updateDoctor, deleteDoctor, type Doctor } from '../api/DoctorApi';
import DoctorFormDialog from '../components/DoctorFormDialog';

export default function DoctorsPage() {
  const [rows, setRows] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);

  const [confirm, setConfirm] = useState<{ open: boolean; id?: string; name?: string }>({ open: false });
  const [notice, setNotice] = useState<{ open: boolean; message: string; severity?: 'success' | 'error' | 'info' }>(
    { open: false, message: '', severity: 'success' }
  );

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listDoctors();
      setRows(data);
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar la lista de doctores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      (r.fullName ?? '').toLowerCase().includes(q) ||
      (r.licenseNumber ?? '').toLowerCase().includes(q) ||
      (r.email ?? '').toLowerCase().includes(q) ||
      (r.phone ?? '').toLowerCase().includes(q)
    );
  }, [rows, query]);

  const handleCreate = () => { setEditing(null); setOpenForm(true); };
  const handleEdit = (row: Doctor) => { setEditing(row); setOpenForm(true); };

  const handleSubmit = async (payload: Partial<Doctor>) => {
    try {
      if (editing) {
        await updateDoctor(editing.id, payload);
        setNotice({ open: true, message: '¡Doctor actualizado!', severity: 'success' });
      } else {
        await createDoctor(payload);
        setNotice({ open: true, message: '¡Doctor creado!', severity: 'success' });
      }
      setOpenForm(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      setNotice({ open: true, message: e.message || 'No se pudo guardar', severity: 'error' });
    }
  };

  const askDelete = (row: Doctor) => setConfirm({ open: true, id: row.id, name: row.fullName || '' });

  const handleDelete = async () => {
    if (!confirm.id) return;
    try {
      await deleteDoctor(confirm.id);
      setNotice({ open: true, message: 'Doctor eliminado', severity: 'success' });
      setConfirm({ open: false });
      await load();
    } catch (e: any) {
      setNotice({ open: true, message: e.message || 'No se pudo eliminar', severity: 'error' });
    }
  };

  return (
    <Box sx={{
      backgroundColor: 'rgba(255, 255, 255, 0.82)',
      backdropFilter: 'blur(4px)',
      border: 'none', p: 2
    }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={700}>Doctores</Typography>
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          placeholder="Buscar por nombre, matrícula, email o teléfono…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="disabled" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 320 }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
          Nuevo doctor
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(4px)',
        border: 'none', p: 1
      }}>
        <CardContent>
          <TableContainer >
            <Table size="small" sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.82)',
              backdropFilter: 'blur(4px)',
              border: 'none'
            }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Nombre</strong></TableCell>
                  <TableCell width={140}><strong>Matrícula</strong></TableCell>
                  <TableCell width={160}><strong>Teléfono</strong></TableCell>
                  <TableCell width={220}><strong>Email</strong></TableCell>
                  <TableCell width={120} align="center"><strong>Acciones</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      {query ? 'No hay coincidencias' : 'No hay doctores cargados'}
                    </TableCell>
                  </TableRow>
                )}

                {filtered.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.fullName || '—'}</TableCell>
                    <TableCell>{row.licenseNumber || '—'}</TableCell>
                    <TableCell>{row.phone || '—'}</TableCell>
                    <TableCell>{row.email || '—'}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar"><IconButton onClick={() => handleEdit(row)}><EditIcon /></IconButton></Tooltip>
                      <Tooltip title="Eliminar"><IconButton color="error" onClick={() => askDelete(row)}><DeleteIcon /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}

              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Montar el diálogo SOLO cuando está abierto */}
      {openForm && (
        <DoctorFormDialog
          open={true}
          onClose={() => { setOpenForm(false); setEditing(null); }}
          onSubmit={handleSubmit}
          initial={editing}
        />
      )}

      {/* Montar confirmación SOLO cuando está abierta */}
      {confirm.open && (
        <Dialog open={true} onClose={() => setConfirm({ open: false })}>
          <DialogTitle>Eliminar doctor</DialogTitle>
          <DialogContent>
            <Typography>
              ¿Seguro que querés eliminar a <strong>{confirm.name}</strong>?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirm({ open: false })}>Cancelar</Button>
            <Button color="error" variant="contained" onClick={handleDelete}>Eliminar</Button>
          </DialogActions>
        </Dialog>
      )}

      <Snackbar
        open={notice.open}
        autoHideDuration={3500}
        onClose={() => setNotice(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setNotice(s => ({ ...s, open: false }))}
          severity={notice.severity || 'success'}
          variant="filled"
          action={
            <IconButton color="inherit" size="small" onClick={() => setNotice(s => ({ ...s, open: false }))}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {notice.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

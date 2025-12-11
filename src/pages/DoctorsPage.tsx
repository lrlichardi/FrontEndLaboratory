import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import {
  listDoctors,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  type Doctor,
} from '../api/DoctorApi';
import DoctorFormDialog from '../components/DoctorFormDialog';

const glassPaper = {
  p: 3,
  borderRadius: 3,
  backgroundColor: 'rgba(255,255,255,0.9)',
  backdropFilter: 'blur(8px)',
  border: 'none',
  boxShadow: '0 14px 32px rgba(0,0,0,0.18)',
} as const;

export default function DoctorsPage() {
  const [rows, setRows] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);

  const [confirm, setConfirm] = useState<{
    open: boolean;
    id?: string;
    name?: string;
  }>({ open: false });

  const [notice, setNotice] = useState<{
    open: boolean;
    message: string;
    severity?: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

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

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.fullName ?? '').toLowerCase().includes(q) ||
        (r.licenseNumber ?? '').toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q) ||
        (r.phone ?? '').toLowerCase().includes(q),
    );
  }, [rows, query]);

  const handleCreate = () => {
    setEditing(null);
    setOpenForm(true);
  };
  const handleEdit = (row: Doctor) => {
    setEditing(row);
    setOpenForm(true);
  };

  const handleSubmit = async (payload: Partial<Doctor>) => {
    try {
      if (editing) {
        await updateDoctor(editing.id, payload);
        setNotice({
          open: true,
          message: '¡Doctor actualizado!',
          severity: 'success',
        });
      } else {
        await createDoctor(payload);
        setNotice({
          open: true,
          message: '¡Doctor creado!',
          severity: 'success',
        });
      }
      setOpenForm(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      setNotice({
        open: true,
        message: e.message || 'No se pudo guardar',
        severity: 'error',
      });
    }
  };

  const askDelete = (row: Doctor) =>
    setConfirm({ open: true, id: row.id, name: row.fullName || '' });

  const handleDelete = async () => {
    if (!confirm.id) return;
    try {
      await deleteDoctor(confirm.id);
      setNotice({
        open: true,
        message: 'Doctor eliminado',
        severity: 'success',
      });
      setConfirm({ open: false });
      await load();
    } catch (e: any) {
      setNotice({
        open: true,
        message: e.message || 'No se pudo eliminar',
        severity: 'error',
      });
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Paper sx={{ ...glassPaper, width: '100%', maxWidth: 1200 }}>
        {/* HEADER */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Doctores
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Administrá la lista de médicos disponibles para las órdenes.
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }} />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
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
              sx={{
                minWidth: { xs: '100%', sm: 280 },
                maxWidth: 360,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.95)',
                },
              }}
            />

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
              sx={{ whiteSpace: 'nowrap' }}
            >
              NUEVO DOCTOR
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* TABLA */}
        <TableContainer
          sx={{
            mt: 1,
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          }}
        >
          <Table
            size="small"
            sx={{
              '& thead th': {
                backgroundColor: 'rgba(248,249,250,0.95)',
                fontWeight: 600,
                borderBottom: '1px solid rgba(0,0,0,0.06)',
              },
              '& tbody td': {
                borderBottom: '1px solid rgba(0,0,0,0.03)',
              },
              '& tbody tr:hover': {
                backgroundColor: 'rgba(25,118,210,0.04)',
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Nombre</strong>
                </TableCell>
                <TableCell width={140}>
                  <strong>Matrícula</strong>
                </TableCell>
                <TableCell width={160}>
                  <strong>Teléfono</strong>
                </TableCell>
                <TableCell width={220}>
                  <strong>Email</strong>
                </TableCell>
                <TableCell width={120} align="center">
                  <strong>Acciones</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align="center"
                    sx={{ py: 4, color: 'text.secondary' }}
                  >
                    Cargando doctores…
                  </TableCell>
                </TableRow>
              )}

              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align="center"
                    sx={{ py: 4, color: 'text.secondary' }}
                  >
                    {query
                      ? 'No hay coincidencias para la búsqueda'
                      : 'No hay doctores cargados'}
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
                    <Tooltip title="Editar">
                      <IconButton onClick={() => handleEdit(row)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton
                        color="error"
                        onClick={() => askDelete(row)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Diálogo de alta/edición */}
        {openForm && (
          <DoctorFormDialog
            open={true}
            onClose={() => {
              setOpenForm(false);
              setEditing(null);
            }}
            onSubmit={handleSubmit}
            initial={editing}
          />
        )}

        {/* Confirmación borrar */}
        {confirm.open && (
          <Dialog
            open={true}
            onClose={() => setConfirm({ open: false })}
          >
            <DialogTitle>Eliminar doctor</DialogTitle>
            <DialogContent>
              <Typography>
                ¿Seguro que querés eliminar a{' '}
                <strong>{confirm.name}</strong>?
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirm({ open: false })}>
                Cancelar
              </Button>
              <Button
                color="error"
                variant="contained"
                onClick={handleDelete}
              >
                Eliminar
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Snackbar de avisos */}
        <Snackbar
          open={notice.open}
          autoHideDuration={3500}
          onClose={() =>
            setNotice((s) => ({ ...s, open: false }))
          }
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() =>
              setNotice((s) => ({ ...s, open: false }))
            }
            severity={notice.severity || 'success'}
            variant="filled"
            action={
              <IconButton
                color="inherit"
                size="small"
                onClick={() =>
                  setNotice((s) => ({ ...s, open: false }))
                }
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            {notice.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
}

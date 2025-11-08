import { useEffect, useMemo, useState } from 'react';
import { Snackbar, Alert, Box, Button, IconButton, Paper, Stack, TextField, Tooltip } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import type { Patient } from '../api';
import { listPatients, createPatient, updatePatient, deletePatient } from '../api';
import PatientFormDialog from '../components/PatientFormDialog';

export default function PatientsPage() {
  const [rows, setRows] = useState<Patient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [rowCount, setRowCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [notice, setNotice] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });
 console.log(rows)
  const navigate = useNavigate();

  const cols: GridColDef[] = useMemo(() => [
    { field: 'dni', headerName: 'DNI', flex: 1, minWidth: 120 },
    { field: 'firstName', headerName: 'Nombre', flex: 1, minWidth: 140 },
    { field: 'lastName', headerName: 'Apellido', flex: 1, minWidth: 140 },
    { field: 'birthDate', headerName: 'Nacimiento', flex: 1, minWidth: 130, valueGetter: (p) => (p.row.birthDate || '').slice(0, 10) },
    { field: 'sex', headerName: 'Sexo', width: 90 },
    { field: 'phone', headerName: 'Teléfono', flex: 1, minWidth: 140 },
    { field: 'email', headerName: 'Email', flex: 1.2, minWidth: 180 },
    { field: 'address', headerName: 'Dirección', flex: 1.4, minWidth: 200 },
    { field: 'obraSocial', headerName: 'Obra Social', flex: 1.4, minWidth: 200 },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 220,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="Ver análisis">
            <IconButton onClick={() => navigate(`/patients/${params.row.id}/analyses`)} size="small" color="primary">
              {/* puedes usar una lupa o un beaker */}
              <SearchIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton onClick={() => handleEdit(params.row)} size="small">
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton onClick={() => handleDelete(params.row)} size="small" color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    }
  ], []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listPatients(query, page + 1, pageSize);
      setRows(res.data);
      setRowCount(res.total);
    } catch (e: any) {
      setError(e.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, page, pageSize]);

  const handleCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (p: Patient) => {
    setEditing(p);
    setDialogOpen(true);
  };

  const handleDelete = async (p: Patient) => {
    if (!confirm(`Eliminar a ${p.firstName} ${p.lastName}?`)) return;
    try {
      await deletePatient(p.id);
      fetchData();
    } catch (e: any) {
      setError(e.message || 'No se pudo eliminar');
    }
  };

  const onSubmitDialog = async (payload: Partial<Patient>) => {
    try {
      const res = editing
        ? await updatePatient(editing.id, payload)
        : await createPatient(payload);

      setDialogOpen(false);
      setNotice({
        open: true,
        message: res?.message || (editing ? 'Paciente actualizado' : 'Paciente creado'),
      });
      await fetchData();
    } catch (e: any) {
      setError(e.message || 'No se pudo guardar');
    }
  };

  const handleCloseNotice = (_e?: any, reason?: string) => {
    if (reason === 'clickaway') return;
    setNotice({ open: false, message: '' });
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Snackbar
        open={notice.open}
        autoHideDuration={3000}
        onClose={handleCloseNotice}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotice} severity="success" variant="filled" sx={{ width: '100%' }}>
          {notice.message}
        </Alert>
      </Snackbar>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
        <TextField
          size="small"
          placeholder="Buscar por DNI, nombre, apellido, email..."
          InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1 }} /> }}
          value={query}
          onChange={(e) => { setPage(0); setQuery(e.target.value); }}
          sx={{ width: 420 }}
        />
        <Button startIcon={<AddIcon />} variant="contained" onClick={handleCreate}>
          Nuevo Paciente
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

      <Box sx={{ height: 560, width: '100%' }}>
        <DataGrid
          rows={rows}
          getRowId={(r) => r.id}
          columns={cols}
          loading={loading}
          pageSizeOptions={[10, 20, 50]}
          pagination
          paginationMode="server"
          onPaginationModelChange={({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); }}
          rowCount={rowCount}
          disableRowSelectionOnClick
        />
      </Box>

      <PatientFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={onSubmitDialog}
        initial={editing}
      />
    </Paper>
  );
}

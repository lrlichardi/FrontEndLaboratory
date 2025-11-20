import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Snackbar, Stack, TextField, Tooltip
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import {
  listSocialWorks, createSocialWork, updateSocialWork, deleteSocialWork,
  type SocialWork
} from '../api/SocialWorkApi';

export default function SocialWorksPage() {
  const [rows, setRows] = useState<SocialWork[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SocialWork | null>(null);
  const [name, setName] = useState('');

  const cols: GridColDef[] = useMemo(() => [
    { field: 'name', headerName: 'Nombre', flex: 1, minWidth: 280 },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 160,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => {
              setEditing(p.row); setName(p.row.name); setDialogOpen(true);
            }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={async () => {
              if (!confirm(`Eliminar "${p.row.name}"?`)) return;
              try {
                await deleteSocialWork(p.row.id);
                await load();
              } catch (e: any) { setErr(e.message || 'No se pudo eliminar'); }
            }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    },
  ], []);

  const load = async () => {
    try {
      setLoading(true); setErr(null);
      const res = await listSocialWorks(query, page + 1, pageSize);
      setRows(res.data); setRowCount(res.total);
    } catch (e: any) {
      setErr(e.message || 'Error cargando datos');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [query, page, pageSize]);

  const onCreate = () => { setEditing(null); setName(''); setDialogOpen(true); };

  const onSubmit = async () => {
    try {
      if (!name.trim()) { setErr('El nombre es obligatorio'); return; }
      if (editing) {
        await updateSocialWork(editing.id, { name: name.trim() });
      } else {
        await createSocialWork({ name: name.trim() });
      }
      setDialogOpen(false);
      setNotice({ open: true, message: editing ? 'Obra Social actualizada' : 'Obra Social creada' });
      await load();
    } catch (e: any) {
      setErr(e.message || 'No se pudo guardar');
    }
  };

  return (
    <Box sx={{          
        display: 'flex',
        justifyContent: 'center',    
        alignItems: 'center',       
      }}>
    <Paper sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.82)',
      backdropFilter: 'blur(4px)',
      border: 'none',width: '50%'}}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
        <TextField
          size="small"
          placeholder="Buscar por nombre..."
          InputProps={{ startAdornment: <SearchIcon fontSize="small" style={{ marginRight: 6 }} /> as any }}
          value={query}
          onChange={(e) => { setPage(0); setQuery(e.target.value); }}
          sx={{ width: 360 }}
        />
        <Button startIcon={<AddIcon />} variant="contained" onClick={onCreate}>
          Nueva Obra Social
        </Button>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}

      <Box sx={{ height: 520 }}>
        <DataGrid
          rows={rows}
          getRowId={(r) => r.id}
          columns={cols}
          loading={loading}
          pagination
          paginationMode="server"
          pageSizeOptions={[10, 20, 50]}
          onPaginationModelChange={({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); }}
          rowCount={rowCount}
          disableRowSelectionOnClick
        />
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? 'Editar Obra Social' : 'Nueva Obra Social'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={onSubmit}>{editing ? 'Guardar' : 'Crear'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notice.open}
        autoHideDuration={2500}
        onClose={() => setNotice({ open: false, message: '' })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ width: '100%' }}>
          {notice.message}
        </Alert>
      </Snackbar>
    </Paper>
    </Box>
  );
}

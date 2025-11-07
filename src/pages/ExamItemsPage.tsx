import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, MenuItem, Stack, TextField, Typography
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

import {
  fetchExamItemsByCode, createExamItemDef, updateExamItemDef, deleteExamItemDef,
  type ExamItemDef
} from '../api';

const KINDS = ['NUMERIC', 'TEXT', 'BOOLEAN', 'ENUM'];

export default function ExamItemsPage() {
  const [code, setCode] = useState('');
  const [examName, setExamName] = useState<string>('');
  const [ub, setUb] = useState<number | null>(null);

  const [rows, setRows] = useState<ExamItemDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExamItemDef | null>(null);
  const [form, setForm] = useState({ key: '', label: '', unit: '', kind: 'NUMERIC', sortOrder: 0, refText: '' });
  
  const load = async () => {
    if (!/^\d{5,7}$/.test(code.trim())) { setErr('Ingresá un código válido (5–7 dígitos)'); return; }
    setLoading(true); setErr(null);
    try {
      const data = await fetchExamItemsByCode(code.trim());
      setRows(data.items);
      setExamName(data.examType.name);
      //   setUb(data.examType.ub);
    } catch (e: any) {
      setErr(e.message || 'No se pudo cargar');
      setRows([]);
      setExamName('');
      setUb(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { /* opcional: autoload si querés */ }, []);

  const cols: GridColDef[] = useMemo(() => [
    { field: 'sortOrder', headerName: 'Orden', width: 90 },
    { field: 'key', headerName: 'Clave', minWidth: 140, flex: 1 },
    { field: 'label', headerName: 'Nombre del ítem', minWidth: 240, flex: 1.2 },
    { field: 'unit', headerName: 'Unidad', minWidth: 120 },
    { field: 'kind', headerName: 'Tipo', minWidth: 120 },
    { field: 'refText', headerName: 'V. ref', minWidth: 160, flex: 1 },
    {
      field: 'actions', headerName: 'Acciones', minWidth: 140, sortable: false, filterable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={() => {
            setEditing(p.row as ExamItemDef);
            setForm({
              key: p.row.key, label: p.row.label, unit: p.row.unit || '',
              kind: p.row.kind || 'NUMERIC', sortOrder: p.row.sortOrder ?? 0,
              refText: p.row.refText || ''
            });
            setOpen(true);
          }}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={async () => {
            if (!window.confirm('¿Eliminar ítem?')) return;
            await deleteExamItemDef(p.row.id);
            load();
          }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      )
    }
  ], [load]);

  const onOpenNew = () => {
    setEditing(null);
    setForm({ key: '', label: '', unit: '', kind: 'NUMERIC', sortOrder: rows.length, refText: '' });
    setOpen(true);
  };

  const onSave = async () => {
    try {
      if (!form.key.trim() || !form.label.trim()) { setErr('Key y Nombre son obligatorios'); return; }
      if (!/^\d{5,7}$/.test(code.trim())) { setErr('Ingresá un código válido'); return; }

      if (editing) {
        await updateExamItemDef(editing.id, {
          key: form.key.trim(),
          label: form.label.trim(),
          unit: form.unit?.trim() || '',
          kind: form.kind,
          sortOrder: Number(form.sortOrder) || 0,
          refText: form.refText?.trim() || undefined,
        });
      } else {
        await createExamItemDef({
          code: code.trim(),
          key: form.key.trim(),
          label: form.label.trim(),
          unit: form.unit?.trim() || undefined,
          kind: form.kind,
          sortOrder: Number(form.sortOrder) || 0,
          refText: form.refText?.trim() || undefined,
        });
      }
      setOpen(false);
      load();
    } catch (e: any) {
      setErr(e.message || 'Error al guardar');
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>ExamItems (definiciones por código)</Typography>

      <Grid container spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Grid item xs={12} sm="auto">
          <TextField
            label="Código (Nomenclador)"
            size="small"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="660042"
          />
        </Grid>
        <Grid item xs="auto">
          <Button variant="contained" onClick={load}>Cargar</Button>
        </Grid>
        {!!examName && (
          <Grid item xs={12} sm>
            <Typography color="text.secondary">
              {examName}{ub != null ? ` — ${ub} U.B.` : ''}
            </Typography>
          </Grid>
        )}
        <Grid item xs="auto">
          <Button startIcon={<AddIcon />} onClick={onOpenNew} variant="outlined" disabled={!code || loading}>
            Nuevo ítem
          </Button>
        </Grid>
      </Grid>

      {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}

      <div style={{ height: 520 }}>
        <DataGrid
          rows={rows}
          columns={cols}
          loading={loading}
          getRowId={(r) => r.id}
          disableRowSelectionOnClick
        />
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar ítem' : 'Nuevo ítem'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField label="Clave (key)" value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Orden" type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} fullWidth />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Nombre del ítem" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Unidad" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Valor de referencia"
                value={form.refText ?? ''}
                onChange={e => setForm({ ...form, refText: e.target.value })}
                fullWidth
                multiline
              /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Tipo"
                select fullWidth
                value={form.kind}
                onChange={e => setForm({ ...form, kind: e.target.value })}
              >
                {KINDS.map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={onSave}>{editing ? 'Guardar' : 'Crear'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

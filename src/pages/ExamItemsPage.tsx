import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, MenuItem, Stack, TextField, Typography, Autocomplete
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

import {
  fetchExamItemsByCode, createExamItemDef, updateExamItemDef, deleteExamItemDef,
  type ExamItemDef
} from '../api/ExamItemDefApi';
import { type NomenOpt } from '../pages/OrderDetailPage'
import { getNomencladorAll } from '../api/OrderApi'

const KINDS = ['NUMERIC', 'TEXT', 'BOOLEAN', 'ENUM'];

const method = ['-', 'Enzimático', 'Cinético', 'Humedo', 'ELISA', 'Quimioluminiscencia', 'Calmagita', 'Turbidimetría', 'ECLIA', 'Colorimetría', 'QLIA', 'Color diazo', 'Inmunoturbidimetrico', 'Arsenazo', 'Aglutinación'];

export default function ExamItemsPage() {
  const [code, setCode] = useState('');
  const [examName, setExamName] = useState<string>('');
  const [ub, setUb] = useState<number | null>(null);

  const [rows, setRows] = useState<ExamItemDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExamItemDef | null>(null);
  const [form, setForm] = useState({ key: '', label: '', unit: '', kind: 'NUMERIC', method: 'Enzimático', sortOrder: 0, refText: '' });
  const [allNomen, setAllNomen] = useState<any[] | null>(null);
  const [opts, setOpts] = useState<NomenOpt[]>([]);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [loadingOpts, setLoadingOpts] = useState(false);

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
    { field: 'method', headerName: 'Metodo', minWidth: 160, flex: 1 },
    {
      field: 'actions', headerName: 'Acciones', minWidth: 140, sortable: false, filterable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={() => {
            setEditing(p.row as ExamItemDef);
            setForm({
              key: p.row.key, label: p.row.label, unit: p.row.unit || '',
              kind: p.row.kind || 'NUMERIC', method: p.row.method || 'Enzimático', sortOrder: p.row.sortOrder ?? 0,
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
    setForm({ key: '', label: '', unit: '', kind: 'NUMERIC', method: 'Enzimático', sortOrder: rows.length, refText: '' });
    setOpen(true);
  };

  useEffect(() => {
    // Cargá el catálogo cuando se abre el modal
    if (allNomen === null) {
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
  }, [allNomen]);

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
      label: `${r.codigo} — ${r.determinacion} (${r.ub} U.B.)`,
      ub: r.ub,
    }));
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
          refText: form.refText?.trim() || null,
          method: form.method?.trim() || '',
        });
      } else {
        await createExamItemDef({
          code: code.trim(),
          key: form.key.trim(),
          label: form.label.trim(),
          unit: form.unit?.trim() || undefined,
          kind: form.kind,
          sortOrder: Number(form.sortOrder) || 0,
          refText: form.refText?.trim() || null,
          method: form.method?.trim(),
        });
      }
      setOpen(false);
      load();
    } catch (e: any) {
      setErr(e.message || 'Error al guardar');
    }
  };

  return (
    <Box sx={{
      backgroundColor: 'rgba(255, 255, 255, 0.82)',
      backdropFilter: 'blur(4px)',
      border: 'none', p: 2
    }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>ExamItems (definiciones por código)</Typography>
      {addErr && <Alert severity="error">{addErr}</Alert>}
      <Grid container spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Grid item xs={3}>
          <Autocomplete
            freeSolo
            options={opts}
            loading={loadingOpts}
            filterOptions={(x) => x}
            getOptionLabel={(o) => typeof o === 'string' ? o : o.label}
            value={null}
            inputValue={code}
            onInputChange={(_, v, reason) => {
              setCode(v);
              if (reason === 'input') {
                setOpts(filterLocal(v));
              }
            }}
            onChange={(_, opt) => {
              const val = typeof opt === 'string' ? opt : (opt as NomenOpt)?.value;
              if (val) setCode(val);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Código (Nomenclador)"
                size="small"
                placeholder="660042"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault(); 
                    if (!loading) load(); 
                  }
                }}
              />
            )}
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
        <Grid item xs="auto" sx={{ ml: 'auto' }}>
          <Button
            startIcon={<AddIcon />}
            onClick={onOpenNew}
            variant="outlined"
            disabled={!code || loading}
          >
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
              />
            </Grid>
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
            <Grid item xs={12} sm={6}>
              <TextField
                label="Metodo"
                select fullWidth
                value={form.method}
                onChange={e => setForm({ ...form, method: e.target.value })}
              >
                {method.map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}

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

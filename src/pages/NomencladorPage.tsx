import { useEffect, useMemo, useState } from 'react';
import { TextField, Box } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { getNomencladorAll, type Nomen } from '../api';

export default function NomencladorPage() {
  const [rows, setRows] = useState<Nomen[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => { getNomencladorAll().then(setRows); }, []);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    const isNum = /^\d+$/.test(s);
    return rows.filter(r =>
      isNum ? String(r.codigo).startsWith(s) : r.determinacion.toLowerCase().includes(s));
  }, [rows, q]);

  const cols: GridColDef[] = [
    { field: 'codigo', headerName: 'Código', minWidth: 120 },
    { field: 'determinacion', headerName: 'Determinación', flex: 1, minWidth: 300 },
    { field: 'ub', headerName: 'U.B.', minWidth: 100 },
  ];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <TextField
        label="Buscar"
        size="small"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        sx={{ mb: 1 }}
      />
      <div style={{ height: 520 }}>
        <DataGrid rows={filtered} columns={cols} getRowId={(r) => String(r.codigo)} />
      </div>
    </Box>
  );
}
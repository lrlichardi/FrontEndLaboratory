import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  TextField,
  Typography,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { getNomencladorAll, type Nomen } from '../api/OrderApi';

const glassPaper = {
  p: 3,
  borderRadius: 3,
  backgroundColor: 'rgba(255,255,255,0.9)',
  backdropFilter: 'blur(8px)',
  border: 'none',
  boxShadow: '0 14px 32px rgba(0,0,0,0.18)',
} as const;

export default function NomencladorPage() {
  const [rows, setRows] = useState<Nomen[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    getNomencladorAll().then(setRows).catch(() => setRows([]));
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    const isNum = /^\d+$/.test(s);
    return rows.filter((r) =>
      isNum
        ? String(r.codigo).startsWith(s)
        : r.determinacion.toLowerCase().includes(s),
    );
  }, [rows, q]);

  const cols: GridColDef[] = [
    {
      field: 'codigo',
      headerName: 'Código',
      minWidth: 120,
      valueGetter: (p) => String(p.row.codigo),
    },
    {
      field: 'determinacion',
      headerName: 'Determinación',
      flex: 1,
      minWidth: 320,
    },
    {
      field: 'ub',
      headerName: 'U.B.',
      minWidth: 100,
      type: 'number',
      headerAlign: 'right',
      align: 'right',
    },
  ];

  return (
    <Box
      sx={{
        p: 3,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Paper sx={{ ...glassPaper, width: '100%', maxWidth: 1200 }}>
        {/* Header */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Nomenclador
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Consultá los códigos, determinaciones y unidades bioquímicas.
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }} />

          <TextField
            size="small"
            placeholder="Buscar por código o determinación…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="disabled" fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{
              minWidth: { xs: '100%', sm: 320 },
              maxWidth: 380,
              '& .MuiOutlinedInput-root': {
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.95)',
              },
            }}
          />
        </Stack>

        <Box sx={{ height: 560 }}>
          <DataGrid
            rows={filtered}
            columns={cols}
            getRowId={(r) => String(r.codigo)}
            disableRowSelectionOnClick
            pageSizeOptions={[25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            sx={{
              borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.9)',
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'rgba(248,249,250,0.95)',
                fontWeight: 600,
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'rgba(25,118,210,0.04)',
              },
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
}

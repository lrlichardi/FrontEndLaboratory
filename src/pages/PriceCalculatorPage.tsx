// src/pages/PriceCalculatorPage.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Typography,
  Button,
  Divider,
  Chip,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';

import NomenMiniTable, { NomenRow } from '../components/NomenMiniTable';
import { apiGetPriceFactor, apiUpdatePriceFactor } from '../api/priceFactorApi';
import { getNomencladorAll, Nomen } from '../api/OrderApi';

type NomenOption = {
  value: string;
  label: string;
};

const isFullCode = (v: string) => /^\d{6}$/.test(v);

// estilos "glass" reutilizables
const glassPaper = {
  p: 2.5,
  borderRadius: 3,
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  backdropFilter: 'blur(6px)',
  border: 'none',
  boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
};

export default function PriceCalculatorPage() {
  const [rows, setRows] = useState<NomenRow[]>([]);
  const [factor, setFactor] = useState<number>(1);
  const [factorDraft, setFactorDraft] = useState<string>('1');
  const [loadingFactor, setLoadingFactor] = useState(true);
  const [savingFactor, setSavingFactor] = useState(false);
  const [allNomen, setAllNomen] = useState<Nomen[]>([]);
  const [nomenInput, setNomenInput] = useState('');
  const [opts, setOpts] = useState<NomenOption[]>([]);

  useEffect(() => {
    const loadFactor = async () => {
      try {
        const f = await apiGetPriceFactor();
        setFactor(f);
        setFactorDraft(String(f));
      } catch (e) {
        console.error('Error obteniendo factor', e);
      } finally {
        setLoadingFactor(false);
      }
    };
    loadFactor();
  }, []);

  useEffect(() => {
    const loadNomen = async () => {
      try {
        const data = await getNomencladorAll();
        setAllNomen(data);
      } catch (e) {
        console.error('Error cargando nomenclador', e);
      }
    };
    loadNomen();
  }, []);

  const totalUB = useMemo(
    () => rows.reduce((acc, r) => acc + (r.ub || 0), 0),
    [rows]
  );
  const totalPrice = totalUB * factor;

  const filterLocal = (q: string): NomenOption[] => {
    if (!allNomen.length) return [];
    const s = q.trim().toLowerCase();
    if (!s) return [];

    const b = 66 + s;
    const isNum = /^\d+$/.test(b);
    const pool = allNomen;

    const filtered = isNum
      ? pool.filter((r) => String(r.codigo).startsWith(b))
      : pool.filter((r) =>
        r.determinacion.toLowerCase().includes(s)
      );

    return filtered.slice(0, 20).map((r) => ({
      value: String(r.codigo),
      label: `${r.codigo} — ${r.determinacion} (${r.ub} U.B.)`,
    }));
  };

  const addCode = (raw: string) => {
    const v = (raw || '').trim();
    if (!isFullCode(v)) return;
    if (!allNomen.length) return;

    const found = allNomen.find((n) => String(n.codigo) === v);
    if (!found) return;

    const newRow: NomenRow = {
      codigo: String(found.codigo),
      determinacion: found.determinacion,
      ub: found.ub,
    };

    setRows((prev) =>
      prev.some((r) => r.codigo === newRow.codigo) ? prev : [...prev, newRow]
    );
    setNomenInput('');
    setOpts([]);
  };

  const handleSaveFactor = async () => {
    const parsed = Number(factorDraft.replace(',', '.'));
    if (!parsed || parsed <= 0) {
      alert('Factor inválido');
      return;
    }
    setSavingFactor(true);
    try {
      const saved = await apiUpdatePriceFactor(parsed);
      setFactor(saved);
      setFactorDraft(String(saved));
    } catch (e) {
      console.error(e);
      alert('Error guardando factor');
    } finally {
      setSavingFactor(false);
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        maxWidth: 900,
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >

      <Paper sx={{ ...glassPaper }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Calculadora de precio
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Seleccioná los estudios, ajustá el factor y obtené un precio
            estimado en segundos.
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            alignItems: { xs: 'flex-start', md: 'center' },
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Factor (precio por U.B.)"
              size="small"
              value={factorDraft}
              disabled={loadingFactor}
              onChange={(e) => setFactorDraft(e.target.value)}
            />
            <Button
              variant="contained"
              onClick={handleSaveFactor}
              disabled={savingFactor || loadingFactor}
            >
              Guardar factor
            </Button>
          </Box>

          <Box
            sx={{
              ml: { md: 'auto' },
              textAlign: { xs: 'left', md: 'right' },
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Factor actual
            </Typography>
            <Typography fontWeight="bold">{factor}</Typography>

            <Typography variant="caption" color="text.secondary">
              Total U.B.
            </Typography>
            <Typography fontWeight="bold">{totalUB}</Typography>
          </Box>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ display: { xs: 'none', md: 'block' }, mx: 2 }}
          />

          {/* Precio grande destacado */}
          <Box
            sx={{
              ml: { md: 1 },
              textAlign: { xs: 'left', md: 'right' },
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Precio total estimado
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              ${totalPrice.toFixed(2)}
            </Typography>
            <Chip
              size="small"
              label="Estimado"
              sx={{ mt: 0.5, fontSize: 11 }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Card de búsqueda / Autocomplete */}
      <Paper sx={{ ...glassPaper }}>
        <Typography
          variant="subtitle2"
          sx={{ mb: 1, fontWeight: 600 }}
        >
          Agregar estudios
        </Typography>
        <Autocomplete<NomenOption, false, false, true>
          freeSolo
          options={opts}
          filterOptions={(x) => x}
          value={null}
          inputValue={nomenInput}
          sx={{
            '& .MuiInputBase-root': {
              backgroundColor: 'rgba(255,255,255,0.9)',
            },
          }}
          onInputChange={(_, v, reason) => {
            setNomenInput(v);
            if (reason === 'input') setOpts(filterLocal(v));
          }}
          onChange={(_, opt) => {
            const raw =
              typeof opt === 'string'
                ? opt
                : (opt as NomenOption | null)?.value;
            if (!raw) return;
            let val = String(raw).trim();
            if (/^\d{4}$/.test(val)) {
              val = `66${val}`;
            }
            addCode(val);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Agregar código de nomenclador"
              placeholder="Tipeá código (6 dígitos) o nombre…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  let val = nomenInput.trim();
                  if (/^\d{4}$/.test(val)) {
                    val = `66${val}`;
                  }
                  if (isFullCode(val)) addCode(val);
                }
              }}
              helperText="Ingresá el código completo (6 dígitos) o elegí de la lista"
            />
          )}
        />
      </Paper>

      {/* Tabla con totales */}
      <NomenMiniTable
        rows={rows}
        onRemove={(codigo) =>
          setRows((prev) => prev.filter((r) => r.codigo !== codigo))
        }
        showTotals
        containerSx={{
          ...glassPaper,
          mt: 0,
          maxHeight: 320,
          width: '98%',
        }}
      />
    </Box>
  );
}

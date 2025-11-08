import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, TextField, Button, MenuItem
} from '@mui/material';
import type { Doctor } from '../api';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: Partial<Doctor>) => Promise<void>;
  initial?: Doctor | null;
};

type Prefix = '' | 'Dr.' | 'Dra.';

const norm = (s?: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();

/** Si el fullName ya viene con Dr./Dra., lo separa */
function splitPrefix(fullName?: string | null): { prefix: Prefix; base: string } {
  const n = norm(fullName);
  const m = n.match(/^(dr\.|dra\.)\s+/i);
  if (!m) return { prefix: '', base: n };
  const p: Prefix = m[1].toLowerCase() === 'dra.' ? 'Dra.' : 'Dr.';
  return { prefix: p, base: n.slice(m[0].length).trim() };
}

export default function DoctorFormDialog({ open, onClose, onSubmit, initial }: Props) {
  // prefijo + nombre base
  const [prefix, setPrefix] = useState<Prefix>('');
  const [name, setName] = useState<string>('');

  const [values, setValues] = useState<Partial<Doctor>>({
    licenseNumber: '',
    phone: '',
    email: '',
  });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      const { prefix: pf, base } = splitPrefix(initial.fullName);
      setPrefix(pf);
      setName(base);
      setValues({
        id: initial.id,
        licenseNumber: initial.licenseNumber || '',
        phone: initial.phone || '',
        email: initial.email || '',
      });
    } else {
      setPrefix('');
      setName('');
      setValues({ licenseNumber: '', phone: '', email: '' });
    }
    setErrs({});
  }, [initial, open]);

  const set = (k: keyof Doctor) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues(v => ({ ...v, [k]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!norm(name)) e.fullName = 'El nombre es obligatorio';
    if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) e.email = 'Email inválido';
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = (): Partial<Doctor> => {
    const fullName = norm(`${prefix ? prefix + ' ' : ''}${name}`);
    return {
      fullName,
      licenseNumber: norm(values.licenseNumber) || null,
      phone: norm(values.phone) || null,
      email: norm(values.email) || null,
    };
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      await onSubmit(buildPayload());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(open)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'Editar doctor' : 'Nuevo doctor'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Prefijos"
              select
              value={prefix}
              onChange={(e) => setPrefix(e.target.value as Prefix)}
              fullWidth
            >
              <MenuItem value="">(Sin prefijo)</MenuItem>
              <MenuItem value="Dr.">Dr.</MenuItem>
              <MenuItem value="Dra.">Dra.</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField
              label="Nombre y apellido"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!!errs.fullName}
              helperText={errs.fullName}
              fullWidth
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Matrícula (opcional)"
              value={values.licenseNumber || ''}
              onChange={set('licenseNumber')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Teléfono (opcional)"
              value={values.phone || ''}
              onChange={set('phone')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Email (opcional)"
              value={values.email || ''}
              onChange={set('email')}
              error={!!errs.email}
              helperText={errs.email}
              fullWidth
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {initial ? 'Guardar' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

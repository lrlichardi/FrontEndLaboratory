import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Grid, MenuItem, FormGroup, FormControlLabel, Checkbox } from '@mui/material';
import dayjs from 'dayjs';
import type { Patient } from '../api';
import { listSocialWorks, type SocialWork } from '../api';
import { patientSchema } from '../validator/validatorForm';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: Partial<Patient>) => Promise<void>;
  initial?: Patient | null;
};

// extendemos el tipo por si Patient no declara estos campos
type PatientX = Patient & { obraSocial?: string | null; codigoAfiliado?: string | null, notes?: string | null, diabetico?: boolean | null, tiroides?: boolean | null };

const sexOptions = ['F', 'M'];

export default function PatientFormDialog({ open, onClose, onSubmit, initial }: Props) {
  const [values, setValues] = useState<Partial<PatientX>>({
    dni: '',
    firstName: '',
    lastName: '',
    birthDate: dayjs().subtract(30, 'year').format('YYYY-MM-DD'),
    sex: '',
    phone: '',
    email: '',
    address: '',
    obraSocial: '',
    codigoAfiliado: '',
    notes: '',
  });

  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // obras sociales desde el backend
  const [works, setWorks] = useState<SocialWork[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(false);

  async function loadWorks() {
    try {
      setLoadingWorks(true);
      // traemos "muchas" para llenar el combo; ajustá si querés
      const res = await listSocialWorks('', 1, 1000);
      setWorks(res.data);
    } catch (e) {
      console.error('No se pudieron cargar las obras sociales', e);
    } finally {
      setLoadingWorks(false);
    }
  }


  const onBlurField = (field: string, value: any) => {
    const one = patientSchema.pick({ [field]: true } as any).safeParse({ [field]: value });
    setErrs(e => ({ ...e, [field]: one.success ? '' : one.error.issues[0]?.message || 'Dato inválido' }));
  };

  useEffect(() => {
    if (open) loadWorks();
  }, [open]);

  useEffect(() => {
    if (initial) {
      setValues({
        ...initial,
        birthDate: initial.birthDate?.slice(0, 10),
        obraSocial: (initial as any).obraSocial ?? '',
        codigoAfiliado: (initial as any).codigoAfiliado ?? '',
      });
    } else {
      setValues(prev => ({
        ...prev,
        dni: '',
        firstName: '',
        lastName: '',
        obraSocial: '',
        codigoAfiliado: '',
        address: '',
        email: '',
        phone: '',
        notes: '',
        sex: '',
        birthDate: dayjs().subtract(30, 'year').format('YYYY-MM-DD'),
      }));
    }
  }, [initial]);

  const handleChange = (field: keyof PatientX) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async () => {
    const payload: any = {
      ...values,
      birthDate: new Date(values.birthDate as string).toISOString(),
    };

    (['phone', 'email', 'address', 'obraSocial', 'codigoAfiliado', 'notes'] as const).forEach(k => {
      if (payload[k] === '') payload[k] = null;
    });

    try {
      setSaving(true);
      await onSubmit(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'Editar Paciente' : 'Nuevo Paciente'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              label="DNI"
              value={values.dni || ''}
              onChange={handleChange('dni')}
              onBlur={(e) => onBlurField('dni', e.target.value)}
              error={!!errs.dni}
              helperText={errs.dni}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Nombre"
              value={values.firstName || ''}
              onChange={handleChange('firstName')}
              onBlur={(e) => onBlurField('firstName', e.target.value)}
              error={!!errs.firstName}
              helperText={errs.firstName}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Apellido"
              value={values.lastName || ''}
              onChange={handleChange('lastName')}
              onBlur={(e) => onBlurField('lastName', e.target.value)}
              error={!!errs.lastName}
              helperText={errs.lastName}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Fecha de Nacimiento"
              type="date"
              value={(values.birthDate as string) || ''}
              onChange={handleChange('birthDate')}
              onBlur={(e) => onBlurField('birthDate', e.target.value)}
              error={!!errs.birthDate}
              helperText={errs.birthDate}
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Sexo"
              select
              value={values.sex || ''}
              onChange={handleChange('sex')}
              onBlur={(e) => onBlurField('sex', e.target.value)}
              error={!!errs.sex}
              helperText={errs.sex}
              fullWidth
              required
            >
              {sexOptions.map(opt => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Teléfono" value={values.phone || ''} onChange={handleChange('phone')} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Email" value={values.email || ''} onChange={handleChange('email')} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Dirección" value={values.address || ''} onChange={handleChange('address')} fullWidth />
          </Grid>

          {/* Obra Social desde backend */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Obra Social"
              select
              value={values.obraSocial || ''}
              onChange={handleChange('obraSocial')}
              fullWidth
              disabled={loadingWorks}
            >
              {works.map(w => (
                <MenuItem key={w.id} value={w.name}>{w.name}</MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="N° de Afiliado"
              value={values.codigoAfiliado || ''}
              onChange={handleChange('codigoAfiliado')}
              fullWidth
            />
          </Grid>
        </Grid>
        <Grid item xs={12} sm={6} mt={1} mb={1}>
          <FormGroup sx={{display: 'flex' , flexDirection: 'row'}} >
            <FormControlLabel
              control={<Checkbox checked={values.diabetico || false} onChange={(e) => setValues(prev => ({ ...prev, diabetico: e.target.checked }))} />}
              label="Diabético"
            />
            <FormControlLabel
              control={<Checkbox checked={values.tiroides || false} onChange={(e) => setValues(prev => ({ ...prev, tiroides: e.target.checked }))} />}
              label="Tiroides"
            />
          </FormGroup>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Notas sobre el paciente"
            value={values.notes || ''}
            onChange={handleChange('notes')}
            fullWidth
            multiline
            rows={3}
          />
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={Object.values(errs).some(Boolean) || saving}>
          {initial ? 'Guardar' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

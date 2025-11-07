import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Grid, MenuItem } from '@mui/material';
import dayjs from 'dayjs';
import type { Patient } from '../api';
import { patientSchema } from '../validator/validatorForm';
type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: Partial<Patient>) => Promise<void>;
  initial?: Patient | null;
};

const sexOptions = ['F', 'M'];

export default function PatientFormDialog({ open, onClose, onSubmit, initial }: Props) {
  const [values, setValues] = useState<Partial<Patient>>({
    dni: '',
    firstName: '',
    lastName: '',
    birthDate: dayjs().subtract(30, 'year').format('YYYY-MM-DD'),
    sex: '',
    phone: '',
    email: '',
    address: '',
  });

  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function validate(values: any) {
    const parsed = patientSchema.safeParse(values);
    if (parsed.success) {
      setErrs({});
      return true;
    }
    const fieldErrors: Record<string, string> = {};
    const flat = parsed.error.flatten().fieldErrors;
    for (const [k, msgs] of Object.entries(flat)) {
      if (msgs && msgs.length) fieldErrors[k] = msgs[0]!;
    }
    setErrs(fieldErrors);
    return false;
  }

  const onBlurField = (field: string, value: any) => {
    const one = patientSchema.pick({ [field]: true } as any).safeParse({ [field]: value });
    setErrs(e => ({ ...e, [field]: one.success ? '' : one.error.issues[0]?.message || 'Dato inválido' }));
  };

  useEffect(() => {
    if (initial) {
      setValues({
        ...initial,
        birthDate: initial.birthDate?.slice(0, 10),
      });
    } else {
      setValues((prev) => ({ ...prev, dni: '', firstName: '', lastName: '' }));
    }
  }, [initial]);

  const handleChange = (field: keyof Patient) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async () => {
    console.log('Submitting patient form with values:', values);
    const payload: any = {
      ...values,
      birthDate: values.birthDate,
    };

    (['phone', 'email', 'address', 'obraSocial', 'codigoAfiliado'] as const).forEach((k) => {
      if (payload[k] === '') payload[k] = null;
    });

    // convertir fecha a ISO recién al enviar
    payload.birthDate = new Date(values.birthDate as string).toISOString();
     console.log(payload);

    try {
      setSaving(true);
      await onSubmit(payload); // si tira error, lo captura PatientsPage y NO se cierra
      onClose();               // ← cierra también desde el diálogo
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
              {sexOptions.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
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
          <Grid item xs={12} sm={6}>
            <TextField label="Obra Social" value={values.obraSocial || ''} onChange={handleChange('obraSocial')} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="N° de Obra Social" value={values.NumberObraSocial || 0} onChange={handleChange('NumberObraSocial')} fullWidth />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={Object.values(errs).some(Boolean)}>
          {initial ? 'Guardar' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

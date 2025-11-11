// src/components/PatientNotes.tsx
import { useEffect, useState } from 'react';
import {
  Alert, Card, CardContent, CardHeader, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, Stack, TextField, Tooltip,
  Typography, Button
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import NotesIcon from '@mui/icons-material/Notes';
import { updatePatient } from '../api';

type Props = {
  patientId: string;
  notes?: string | null;
  onSaved?: (newNotes: string | null) => void; // opcional, para refrescar el padre
};

export default function PatientNotes({ patientId, notes, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string>(notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(notes ?? null);

  useEffect(() => {
    setCurrent(notes ?? null);
    setValue(notes || '');
  }, [notes]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const clean = value.trim();
      const payload = { notes: clean === '' ? null : clean };
      await updatePatient(patientId, payload);
      setCurrent(payload.notes ?? null);
      onSaved?.(payload.notes ?? null);
      setOpen(false);
    } catch (e: any) {
      setError(e.message || 'No se pudo guardar la nota');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card variant="outlined" sx={{ mt: 1 }}>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <NotesIcon fontSize="small" />
              <Typography variant="subtitle1" fontWeight={600}>
                Notas del paciente
              </Typography>
            </Stack>
          }
          action={
            <Tooltip title={current ? 'Editar nota' : 'Agregar nota'}>
              <IconButton onClick={() => setOpen(true)} size="small">
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          }
          sx={{ pb: 0.5 }}
        />
        <CardContent sx={{ pt: 1.5 }}>
          {current ? (
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{current}</Typography>
          ) : (
            <Typography color="text.secondary">Sin notas.</Typography>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{current ? 'Editar nota' : 'Agregar nota'}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={4}
            placeholder="Escribí observaciones clínicas, alergias, aclaraciones, etc."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === 'Enter') handleSave();
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Tip: Ctrl + Enter para guardar
          </Typography>
        </DialogContent>
        <DialogActions>
          {value.trim() !== '' && (
            <Button
              color="warning"
              onClick={() => setValue('')}
              disabled={saving}
            >
              Borrar nota
            </Button>
          )}
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

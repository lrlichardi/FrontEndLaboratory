// src/components/PatientNotes.tsx
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
  Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import NotesIcon from '@mui/icons-material/Notes';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  type PatientNote,
  listPatientNotes,
  createPatientNote,
  updatePatientNote,
  deletePatientNote,
} from '../api/noteApi';

type Props = {
  patientId: string;
};

export default function PatientNotes({ patientId }: Props) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<PatientNote | null>(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listPatientNotes(patientId);
      // Ordenamos por fecha de creación desc, por si el back no lo hace
      data.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setNotes(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'No se pudieron cargar las notas');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Cargamos una vez para mostrar resumen en la card
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleOpen = () => {
    setOpen(true);
    loadNotes(); // refrescar al abrir
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    setText('');
    setError(null);
  };

  const handleSave = async () => {
    const clean = text.trim();
    if (!clean) {
      setError('La nota no puede estar vacía');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (editing) {
        const updated = await updatePatientNote(editing.id, clean);
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      } else {
        const created = await createPatientNote(patientId, clean);
        setNotes((prev) => [created, ...prev]);
      }

      setText('');
      setEditing(null);
    } catch (e: any) {
      setError(e.message || 'No se pudo guardar la nota');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (note: PatientNote) => {
    if (!window.confirm('¿Eliminar esta nota?')) return;
    try {
      await deletePatientNote(note.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      if (editing?.id === note.id) {
        setEditing(null);
        setText('');
      }
    } catch (e: any) {
      setError(e.message || 'No se pudo eliminar la nota');
    }
  };

  const lastNote = notes[0] ?? null;

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

  return (
    <>
      <Card variant="outlined">
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <NotesIcon fontSize="small" />
              <Typography variant="subtitle1" fontWeight={600}>
                Notas del paciente
              </Typography>
              {notes.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  ({notes.length} nota{notes.length === 1 ? '' : 's'})
                </Typography>
              )}
            </Stack>
          }
          action={
            <Tooltip title="Ver / editar notas">
              <IconButton onClick={handleOpen} size="small">
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          }
          sx={{ pb: 0.5 }}
        />
        <CardContent>
          {loading ? (
            <Typography color="text.secondary">Cargando notas…</Typography>
          ) : lastNote ? (
            <>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                {lastNote.text.length > 160
                  ? `${lastNote.text.slice(0, 160)}…`
                  : lastNote.text}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Última actualización: {formatDateTime(lastNote.updatedAt)}
              </Typography>
            </>
          ) : (
            <Typography color="text.secondary">Sin notas.</Typography>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle>Notas del paciente</DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Stack alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={24} />
            </Stack>
          ) : (
            <>
              {notes.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Creada</TableCell>
                      <TableCell>Última modif.</TableCell>
                      <TableCell>Nota</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {notes.map((n) => (
                      <TableRow key={n.id} hover>
                        <TableCell>{formatDateTime(n.createdAt)}</TableCell>
                        <TableCell>{formatDateTime(n.updatedAt)}</TableCell>
                        <TableCell sx={{ whiteSpace: 'pre-wrap', maxWidth: 360 }}>
                          {n.text}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditing(n);
                              setText(n.text);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(n)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography color="text.secondary" sx={{ mb: 1 }}>
                  Sin notas registradas.
                </Typography>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                {editing ? 'Editar nota' : 'Nueva nota'}
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escribí observaciones clínicas, alergias, aclaraciones, etc."
                onKeyDown={(e) => {
                  if (e.ctrlKey && e.key === 'Enter') handleSave();
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Tip: Ctrl + Enter para guardar
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          {editing && (
            <Button
              onClick={() => {
                setEditing(null);
                setText('');
              }}
              disabled={saving}
            >
              Cancelar edición
            </Button>
          )}
          <Button onClick={handleClose}>Cerrar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !text.trim()}
          >
            {editing ? 'Guardar cambios' : 'Agregar nota'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

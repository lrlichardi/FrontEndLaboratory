// src/pages/PatientAccountTab.tsx
import { useEffect, useMemo, useState } from 'react'
import { Box, Stack, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField, MenuItem, Chip, IconButton, Alert } from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import dayjs from 'dayjs'
import { listAccountEntries, getAccountSummary, createAccountEntry, deleteAccountEntry, type AccountEntry } from '../api'


const KINDS = [
    { value: 'CHARGE', label: 'Cargo' },
    { value: 'PAYMENT', label: 'Pago' },
    { value: 'ADJUSTMENT', label: 'Ajuste' },
] as const


type Props = { patientId: string; orders: { id: string; orderNumber?: string | null }[]; items?: { id: string; label?: string }[] }


export default function PatientAccountTab({ patientId, orders = [], items = [] }: Props) {
    const [rows, setRows] = useState<AccountEntry[]>([])
    const [sum, setSum] = useState<{ total: number; pagado: number; ajustes: number; saldoDeudor: number; tieneDeuda: boolean } | null>(null)
    const [loading, setLoading] = useState(false)
    const [err, setErr] = useState<string | null>(null)


    const [open, setOpen] = useState(false)
    const [form, setForm] = useState<{ kind: 'CHARGE' | 'PAYMENT' | 'ADJUSTMENT'; amount: string; description: string; testOrderId: string | ''; orderItemId: string | '' }>({
        kind: 'CHARGE', amount: '', description: '', testOrderId: '', orderItemId: ''
    })


    const load = async () => {
        setLoading(true); setErr(null)
        try {
            const [e, s] = await Promise.all([listAccountEntries(patientId), getAccountSummary(patientId)])
            setRows(e)
            setSum(s)
        } catch (e: any) {
            setErr(e.message || 'No se pudo cargar la cuenta')
        } finally { setLoading(false) }
    }


    useEffect(() => { load() }, [patientId])


    const cols: GridColDef[] = useMemo(() => [
        { field: 'createdAt', headerName: 'Fecha', width: 110, valueGetter: p => dayjs(p.value as string).format('DD/MM/YY') },
        { field: 'kind', headerName: 'Tipo', width: 120, renderCell: p => <Chip size="small" label={p.value} color={p.value === 'PAYMENT' ? 'success' : p.value === 'CHARGE' ? 'warning' : 'default'} /> },
        { field: 'amountCents', headerName: 'Monto', width: 120, valueFormatter: p => `$ ${(Number(p.value) / 100).toFixed(2)}` },
        { field: 'description', headerName: 'Descripción', flex: 1, minWidth: 200 },
        { field: 'testOrder', headerName: 'Orden', width: 160, valueGetter: p => p.value?.orderNumber ? `#${p.value.orderNumber}` : p.row.testOrder?.id || '' },
        { field: 'orderItem', headerName: 'Ítem', width: 160, valueGetter: p => p.value?.id || '' },
        {
            field: 'actions', headerName: 'Acciones', width: 90, sortable: false, filterable: false,
            renderCell: (p) => (
                <IconButton size="small" color="error" onClick={async () => { if (!confirm('¿Eliminar movimiento?')) return; await deleteAccountEntry(patientId, p.row.id); load() }}>
                    <DeleteIcon fontSize="small" />
                </IconButton>
            )
        },
    ], [patientId])

    const onSave = async () => {
        try {
            if (!form.amount.trim()) throw new Error('Ingresá un monto');

            await createAccountEntry(patientId, {
                kind: form.kind,
                amount: form.amount,                
                description: form.description || undefined,
                testOrderId: form.testOrderId || undefined,
                orderItemId: form.orderItemId || undefined,
            });

            setOpen(false);
            setForm({ kind: 'CHARGE', amount: '', description: '', testOrderId: '', orderItemId: '' });
            load();
        } catch (e: any) {
            setErr(e.message || 'Error al guardar');
        }
    };


    return (
        <Box>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6" fontWeight={700}>Cuenta del paciente</Typography>
                {!!sum && (
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip label={`Facturado $ ${(sum.total / 100).toFixed(2)}`} color="warning" />
                        <Chip label={`Pagado $ ${(sum.pagado / 100).toFixed(2)}`} color="success" />
                        <Chip label={`Ajustes $ ${(sum.ajustes / 100).toFixed(2)}`} />
                        <Chip label={`Saldo $ ${(sum.saldoDeudor / 100).toFixed(2)}`} color={sum.tieneDeuda ? 'error' : 'default'} />
                    </Stack>
                )}
                <Box flex={1} />
                <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpen(true)}>Nuevo movimiento</Button>
            </Stack>


            {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}


            <div style={{ height: 420 }}>
                <DataGrid rows={rows} columns={cols} getRowId={(r) => r.id} loading={loading} disableRowSelectionOnClick />
            </div>


            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Nuevo movimiento</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12} sm={4}>
                            <TextField select label="Tipo" fullWidth value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value as any }))}>
                                {KINDS.map(k => <MenuItem key={k.value} value={k.value}>{k.label}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Monto ($)" fullWidth inputMode="decimal" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Ítem (opcional)" select value={form.orderItemId} onChange={e => setForm(f => ({ ...f, orderItemId: e.target.value }))} fullWidth>
                                <MenuItem value="">—</MenuItem>
                                {items.map(it => <MenuItem key={it.id} value={it.id}>{it.label || it.id}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField label="Orden (opcional)" select value={form.testOrderId} onChange={e => setForm(f => ({ ...f, testOrderId: e.target.value }))} fullWidth>
                                <MenuItem value="">—</MenuItem>
                                {orders.map(o => <MenuItem key={o.id} value={o.id}>{o.orderNumber ? `#${o.orderNumber}` : o.id}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField label="Descripción" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} fullWidth multiline minRows={2} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={onSave}>Guardar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
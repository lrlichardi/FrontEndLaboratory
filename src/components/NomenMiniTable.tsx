import {
  Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, IconButton, TableFooter
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

export type NomenRow = { codigo: string; determinacion: string; ub: number };

type Props = {
  rows: NomenRow[];
  onRemove?: (codigo: string) => void;  // si lo pasás, muestra la columna Acciones
  maxHeight?: number | string;
  dense?: boolean;
  showTotals?: boolean;
};

export default function NomenMiniTable({
  rows, onRemove, maxHeight = 260, dense = true, showTotals = true,
}: Props) {
  const totalUB = rows.reduce((a, r) => a + (r.ub || 0), 0);

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ mt: 1, maxHeight }}>
      <Table size={dense ? 'small' : 'medium'} stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell width={120}>Código</TableCell>
            <TableCell>Determinación</TableCell>
            <TableCell width={90} align="right">U.B.</TableCell>
            {onRemove && <TableCell width={64} align="center">Acciones</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={onRemove ? 4 : 3} sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                No hay códigos seleccionados.
              </TableCell>
            </TableRow>
          ) : rows.map(r => (
            <TableRow key={r.codigo}>
              <TableCell><code>{r.codigo}</code></TableCell>
              <TableCell>{r.determinacion}</TableCell>
              <TableCell align="right">{r.ub}</TableCell>
              {onRemove && (
                <TableCell align="center">
                  <IconButton size="small" color="error" onClick={() => onRemove(r.codigo)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>

        {showTotals && rows.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={onRemove ? 2 : 1}><strong>Ítems:</strong> {rows.length}</TableCell>
              <TableCell align="right"><strong>Total U.B.:</strong> {totalUB}</TableCell>
              {onRemove && <TableCell />}
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </TableContainer>
  );
}

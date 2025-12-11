import {
  Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, IconButton, TableFooter,Box
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';

export type NomenRow = { codigo: string; determinacion: string; ub: number };

type Props = {
  rows: NomenRow[];
  onRemove?: (codigo: string) => void;
  maxHeight?: number | string;
  dense?: boolean;
  showTotals?: boolean;
  containerSx?: SxProps<Theme>;
  /** Factor de precio para calcular “Total a pagar”.
   *  Si viene null/undefined, sólo se muestra Total U.B.
   */
  priceFactor?: number | null;
};

export default function NomenMiniTable({
  rows,
  onRemove,
  maxHeight = 260,
  dense = true,
  showTotals = true,
  containerSx,
  priceFactor,
}: Props) {
  const totalUB = rows.reduce((a, r) => a + (r.ub || 0), 0);
  const totalToPay =
    priceFactor != null && totalUB > 0 ? totalUB * priceFactor : null;

  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{
        mt: 1,
        maxHeight,
        width: '100%',
        ...(containerSx || {}),
      }}
    >
      <Table size={dense ? 'small' : 'medium'} stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell width={120}>Código</TableCell>
            <TableCell>Determinación</TableCell>
            <TableCell width={90} align="right">
              U.B.
            </TableCell>
            {onRemove && (
              <TableCell width={64} align="center">
                Acciones
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={onRemove ? 4 : 3}
                sx={{ color: 'text.secondary', fontStyle: 'italic' }}
              >
                No hay códigos seleccionados.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r, index) => (
              <TableRow key={`${r.codigo}-${index}`}>
                <TableCell>
                  <code>{r.codigo}</code>
                </TableCell>
                <TableCell>{r.determinacion}</TableCell>
                <TableCell align="right">{r.ub}</TableCell>
                {onRemove && (
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onRemove(r.codigo)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>

        {showTotals && rows.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={onRemove ? 2 : 1}>
                <strong>Ítems:</strong> {rows.length}
              </TableCell>
              <TableCell align="right">
                <Box component="span" sx={{ whiteSpace: 'nowrap', mr: 1 }}>
                  <strong>Total U.B.:</strong> {totalUB}
                </Box>

                {totalToPay != null && (
                  <Box component="span" sx={{ whiteSpace: 'nowrap', ml: 1 }}>
                    <strong>Total a pagar:</strong> ${totalToPay.toFixed(2)}
                  </Box>
                )}
              </TableCell>
              {onRemove && <TableCell />}
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </TableContainer>
  );
}

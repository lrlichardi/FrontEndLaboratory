import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { fetchDashboardData , DashboardData } from '../api/dashboardApi';

const formatCurrency = (value: number) =>
  value.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  });

const SummaryCard = ({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) => (
  <Card elevation={3}>
    <CardContent>
      <Typography variant="subtitle2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h5" fontWeight="bold">
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

export const DashboardPage = () => {
  const [month, setMonth] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`; // formato compatible con <input type="month">
  });

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (selectedMonth: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchDashboardData(selectedMonth);
      setData(res);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(month);
  }, [month]);

  return (
    <Box p={3}>
      {/* Título y filtro de mes */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Dashboard del Laboratorio
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Resumen de análisis y facturación
          </Typography>
        </Box>

        {/* Filtro de mes */}
        <TextField
          label="Mes"
          type="month"
          size="small"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      {/* Loading / Error */}
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Box mb={2}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      {!loading && data && (
        <>
          {/* Tarjetas de resumen */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Total de análisis del mes"
                value={data.summary.totalAnalysesMonth.toString()}
                subtitle="Incluye particulares + obras sociales"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Análisis particulares"
                value={data.summary.totalPrivateAnalyses.toString()}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Análisis con obra social"
                value={data.summary.totalSocialWorkAnalyses.toString()}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard
                title="Total estimado a cobrar"
                value={formatCurrency(data.summary.totalAmountExpected)}
              />
            </Grid>
          </Grid>

          {/* Tabla: Análisis por Obra Social */}
          <Box mb={3}>
            <Typography variant="h6" mb={1}>
              Análisis por obra social (mes seleccionado)
            </Typography>
            <Paper variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Obra social</TableCell>
                    <TableCell align="right">Cantidad de análisis</TableCell>
                    <TableCell align="right">Monto estimado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.analysesBySocialWork.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No hay datos para este mes.
                      </TableCell>
                    </TableRow>
                  )}
                  {data.analysesBySocialWork.map((row) => (
                    <TableRow key={row.socialWorkName}>
                      <TableCell>{row.socialWorkName}</TableCell>
                      <TableCell align="right">{row.analysesCount}</TableCell>
                      <TableCell align="right">{formatCurrency(row.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>

          {/* (Opcional) Tabla simple de evolución por mes */}
          <Box>
            <Typography variant="h6" mb={1}>
              Evolución de análisis por mes
            </Typography>
            <Paper variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Mes</TableCell>
                    <TableCell align="right">Cantidad de análisis</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.analysesPerMonth.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        No hay datos históricos.
                      </TableCell>
                    </TableRow>
                  )}
                  {data.analysesPerMonth.map((p) => (
                    <TableRow key={p.month}>
                      <TableCell>{p.month}</TableCell>
                      <TableCell align="right">{p.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        </>
      )}
    </Box>
  );
};

export default DashboardPage;

import { Box, Button, Typography, Paper, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent', // respeta el fondo global
        p: 3,
      }}
    >
      <Paper
        elevation={4}
        sx={{
          px: { xs: 3, sm: 5 },
          py: { xs: 3, sm: 4 },
          borderRadius: 4,
          textAlign: 'center',
          maxWidth: 500,
        }}
      >
        <Stack spacing={2} alignItems="center">
          <Typography
            variant="h2"
            sx={{ fontWeight: 'bold', lineHeight: 1 }}
          >
            404
          </Typography>

          <Typography variant="h6">
            La página que está buscando no existe.
          </Typography>

          <Button
            variant="contained"
            component={RouterLink}
            to="/"
            sx={{ mt: 1 }}
          >
            Volver al inicio
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

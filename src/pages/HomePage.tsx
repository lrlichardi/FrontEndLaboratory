import { Box, Typography, Paper, Stack } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';

export default function HomePage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent', 
        p: 3,
        
      }}
    >
      <Paper
        elevation={4}
        sx={{
          px: { xs: 3, sm: 6 },
          py: { xs: 3, sm: 5 },
          borderRadius: 4,
          textAlign: 'center',
          maxWidth: 800,
        }}
      >
        <Stack spacing={2} alignItems="center">
          <ScienceIcon sx={{ fontSize: 60 }} />

          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 'bold',
              fontSize: { xs: '2rem', sm: '2.5rem' },
            }}
          >
            Bienvenida, Bioquímica
          </Typography>

          <Typography
            variant="h4"
            component="h2"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1.8rem', sm: '2.2rem' },
            }}
          >
            Fátima Pérez
          </Typography>

          <Typography
            variant="h6"
            component="p"
            sx={{ mt: 1 }}
          >
            Que tengas un excelente día 💙
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}

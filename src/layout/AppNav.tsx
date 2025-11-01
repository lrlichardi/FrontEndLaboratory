import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, IconButton, Box, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Container, Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import ScienceIcon from '@mui/icons-material/Science';

const links = [
  { to: '/', label: 'Inicio', icon: <HomeIcon />, exact: true },
  { to: '/patients', label: 'Pacientes', icon: <PeopleIcon /> },
  { to: '/nomenclador', label: 'Nomenclador', icon: <ScienceIcon /> },
];

export default function AppNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => setOpen(true)} sx={{ display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Admin Pacientes – Lab
          </Typography>

          {/* Desktop */}
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            {links.map(l => (
              <Button
                key={l.to}
                component={NavLink}
                to={l.to}
                end={l.exact as any}
                color="inherit"
                startIcon={l.icon}
                sx={{
                  mx: 0.5,
                  '&.active': {
                    bgcolor: 'primary.dark',
                  }
                }}
              >
                {l.label}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer mobile */}
      <Drawer open={open} onClose={() => setOpen(false)} sx={{ display: { sm: 'none' } }}>
        <Box sx={{ width: 260 }} role="presentation" onClick={() => setOpen(false)}>
          <Typography variant="h6" sx={{ p: 2 }}>Menú</Typography>
          <Divider />
          <List>
            {links.map(l => (
              <ListItemButton key={l.to} component={NavLink} to={l.to} end={l.exact as any}>
                <ListItemIcon>{l.icon}</ListItemIcon>
                <ListItemText primary={l.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Contenido de cada página */}
      <Container sx={{ py: 2 }}>
        <Outlet />
      </Container>
    </>
  );
}

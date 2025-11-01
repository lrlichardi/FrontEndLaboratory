import { useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CancelIcon from '@mui/icons-material/Cancel';
import type { OrderStatus } from '../utils/status';

const ICON: Record<OrderStatus, JSX.Element> = {
  PENDING:   <ScheduleIcon />,
  COMPLETED: <CheckCircleIcon />,
  CANCELED:  <CancelIcon />,
};
const COLOR: Record<OrderStatus, 'inherit'|'success'|'error'|'warning'> = {
  PENDING: 'warning',
  COMPLETED: 'success',
  CANCELED: 'error',
};

type Props = {
  value: OrderStatus;
  label: string;     // STATUS_LABEL[value]
  onChange: (next: OrderStatus) => void;
};

export default function StatusCell({ value, label, onChange }: Props) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color={COLOR[value]}
        startIcon={ICON[value]}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ textTransform: 'none', fontWeight: 700, minWidth: 0, px: 1.25, py: 0.25 }}
      >
        {label}
      </Button>

      <Menu anchorEl={anchor} open={open} onClose={() => setAnchor(null)}>
        {(['PENDING','COMPLETED','CANCELED'] as OrderStatus[]).map((s) => (
          <MenuItem
            key={s}
            selected={s === value}
            onClick={() => { onChange(s); setAnchor(null); }}
          >
            <ListItemIcon>{ICON[s]}</ListItemIcon>
            <ListItemText
              primary={s === 'PENDING' ? 'PENDIENTE' : s === 'COMPLETED' ? 'COMPLETADO' : 'CANCELADO'}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

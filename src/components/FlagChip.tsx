import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Chip } from '@mui/material';
import React from 'react';

type FlagChipProps = {
  label: string;
  value: boolean | null | undefined;
  icon?: React.ReactElement; // 👈 antes ReactNode
  trueColor?: 'default'|'primary'|'secondary'|'error'|'warning'|'success'|'info';
};

function FlagChip({ label, value, icon, trueColor = 'error' }: FlagChipProps) {
  if (value === true) {
    return (
      <Chip
        size="small"
        icon={icon}
        label={`${label}`}
        color={trueColor}
        variant="filled"
      />
    );
  }
  
  ;
}
export default FlagChip;
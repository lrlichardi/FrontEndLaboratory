export type OrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELED';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'PENDIENTE',
  COMPLETED: 'COMPLETADO',
  CANCELED: 'CANCELADO',
};

export const STATUS_COLOR: Record<OrderStatus, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  COMPLETED: 'success',
  CANCELED: 'error',
};

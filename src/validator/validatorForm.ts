// imports de React/MUI existentes…
import { z } from 'zod';

// --- schema de validación del form (fuera del componente)
const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(v => (v === '' ? undefined : v), schema);

export const patientSchema = z.object({
  dni: z.string().trim().min(6, 'DNI: debe ingresar un DNI'),
  firstName: z.string().trim().min(1, 'Nombre es obligatorio'),
  lastName: z.string().trim().min(1, 'Apellido es obligatorio'),
  birthDate: z.string()
    .min(1, 'Fecha de nacimiento es obligatoria')
    .refine(v => !Number.isNaN(Date.parse(v)), 'Fecha inválida'),
  sex: z.string().min(1, 'Sexo es obligatorio'),
  phone: z.string().optional(),
  email: emptyToUndef(z.string().email('Email inválido').optional()),
  address: z.string().optional(),
  obraSocial: z.string().optional(),
  codigoAfiliado: z.string().optional(),
});
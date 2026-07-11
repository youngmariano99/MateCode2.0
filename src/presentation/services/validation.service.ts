import { z } from "zod";

export const cuitRegExp = /^\d{2}-\d{8}-\d{1}$/;

export const validarCUIT = (cuit: string): boolean => {
  const clean = cuit.replace(/-/g, "");
  if (clean.length !== 11) return false;

  const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean[i]) * factors[i];
  }

  const mod = sum % 11;
  const verifier = mod === 0 ? 0 : mod === 1 ? 9 : 11 - mod;
  return verifier === parseInt(clean[10]);
};

export const ValidationService = {
  correo: z
    .string()
    .min(1, { message: "El correo es requerido" })
    .email({ message: "Formato de correo inválido" }),

  password: z
    .string()
    .min(1, { message: "La contraseña es requerida" })
    .min(8, { message: "Debe tener al menos 8 caracteres" })
    .regex(/[A-Z]/, { message: "Debe incluir al menos una letra mayúscula" })
    .regex(/[0-9]/, { message: "Debe incluir al menos un número" }),

  cuit: z
    .string()
    .min(1, { message: "El CUIT es requerido" })
    .refine((val) => cuitRegExp.test(val) || /^\d{11}$/.test(val), {
      message: "Formato de CUIT inválido (debe ser XX-XXXXXXXX-X o 11 dígitos)",
    })
    .refine((val) => validarCUIT(val), {
      message: "Número de CUIT inválido (dígito verificador incorrecto)",
    }),

  telefono: z
    .string()
    .min(1, { message: "El teléfono es requerido" })
    .min(8, { message: "El teléfono debe tener al menos 8 caracteres" })
    .regex(/^[+0-9\s-]+$/, {
      message: "El teléfono contiene caracteres inválidos",
    }),

  dinero: z
    .number({ message: "El monto es requerido" })
    .positive({ message: "El monto debe ser un número positivo" }),

  fecha: z
    .date({ message: "La fecha es requerida" })
    .min(new Date("2000-01-01"), {
      message: "La fecha no puede ser anterior al año 2000",
    }),

  url: z
    .string()
    .min(1, { message: "La URL es requerida" })
    .url({ message: "Formato de URL inválido" }),

  markdown: z
    .string()
    .min(1, { message: "El contenido es requerido" })
    .min(5, { message: "Debe tener al menos 5 caracteres de contenido" }),

  coordenadas: z.object({
    latitud: z
      .number()
      .min(-90, { message: "Latitud debe estar entre -90 y 90" })
      .max(90, { message: "Latitud debe estar entre -90 y 90" }),
    longitud: z
      .number()
      .min(-180, { message: "Longitud debe estar entre -180 y 180" })
      .max(180, { message: "Longitud debe estar entre -180 y 180" }),
  }),
};

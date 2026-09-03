import "dotenv/config";
import { db } from "../src/infrastructure/persistencia/drizzle-db";
import * as schema from "../src/infrastructure/persistencia/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "Falta DATABASE_URL en el entorno (.env). El runner necesita conexión directa a Supabase para leer/escribir checkpoints."
  );
}

export { db, schema };

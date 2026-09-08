import { db } from "../src/infrastructure/persistencia/drizzle-db";
import { tareas } from "../src/infrastructure/persistencia/schema";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const t = await db
      .select()
      .from(tareas)
      .where(eq(tareas.proyectoId, "pro_1788788300301"));
    console.log(JSON.stringify(t, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();

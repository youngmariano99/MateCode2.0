import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);

export interface CrearCommitYPROptions {
  rutaRepo: string;
  mensajeCommit: string;
  tituloPR: string;
  cuerpoPR: string;
}

export interface CrearCommitYPRResultado {
  ok: boolean;
  prUrl?: string;
  error?: string;
  /** true si no había cambios para commitear (nada que hacer, no es un fallo). */
  sinCambios?: boolean;
}

/**
 * Commit + push + PR del trabajo que el agente dejó en el working tree.
 * Usa execFile (sin shell) y los mensajes largos van por archivo temporal
 * (`git commit -F`, `gh pr create --body-file`) para no depender de escapar
 * comillas/backticks del resumen técnico dentro de un comando de shell.
 *
 * Nunca lanza: un fallo acá (push rechazado, gh no autenticado, etc.) no
 * debe tirar abajo el checkpoint — el ticket igual queda listo para
 * revisión humana con el diff local, que es el equivalente manual.
 */
export async function crearCommitYPR({
  rutaRepo,
  mensajeCommit,
  tituloPR,
  cuerpoPR,
}: CrearCommitYPROptions): Promise<CrearCommitYPRResultado> {
  try {
    const { stdout: statusOut } = await execFileAsync(
      "git",
      ["status", "--porcelain"],
      { cwd: rutaRepo }
    );
    if (!statusOut.trim()) {
      return { ok: true, sinCambios: true };
    }

    const { stdout: branchOut } = await execFileAsync(
      "git",
      ["branch", "--show-current"],
      { cwd: rutaRepo }
    );
    const branch = branchOut.trim();
    if (!branch) {
      return {
        ok: false,
        error: "No se pudo determinar la rama actual (HEAD desprendido?).",
      };
    }

    const commitMsgFile = path.join(
      os.tmpdir(),
      `matecode-commit-${Date.now()}.txt`
    );
    const prBodyFile = path.join(
      os.tmpdir(),
      `matecode-pr-body-${Date.now()}.md`
    );

    try {
      await writeFile(commitMsgFile, mensajeCommit, "utf-8");
      await execFileAsync("git", ["add", "-A"], { cwd: rutaRepo });
      await execFileAsync("git", ["commit", "-F", commitMsgFile], {
        cwd: rutaRepo,
      });

      await execFileAsync("git", ["push", "-u", "origin", branch], {
        cwd: rutaRepo,
      });

      await writeFile(prBodyFile, cuerpoPR, "utf-8");
      const { stdout: prOut } = await execFileAsync(
        "gh",
        ["pr", "create", "--title", tituloPR, "--body-file", prBodyFile],
        { cwd: rutaRepo }
      );
      const prUrl = prOut.trim().split("\n").pop()?.trim();

      return { ok: true, prUrl };
    } finally {
      await unlink(commitMsgFile).catch(() => {});
      await unlink(prBodyFile).catch(() => {});
    }
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    return { ok: false, error: mensaje };
  }
}

/**
 * Commit + push de un fix sobre un PR ya existente (no crea uno nuevo) — usado
 * por el gate de CI post-PR cuando hay que corregir algo y empujarlo a la
 * misma rama.
 */
export async function commitYPushFix(
  rutaRepo: string,
  mensajeCommit: string
): Promise<{ ok: boolean; sinCambios?: boolean; error?: string }> {
  try {
    const { stdout: statusOut } = await execFileAsync(
      "git",
      ["status", "--porcelain"],
      { cwd: rutaRepo }
    );
    if (!statusOut.trim()) return { ok: true, sinCambios: true };

    const { stdout: branchOut } = await execFileAsync(
      "git",
      ["branch", "--show-current"],
      { cwd: rutaRepo }
    );
    const branch = branchOut.trim();

    const commitMsgFile = path.join(
      os.tmpdir(),
      `matecode-fix-${Date.now()}.txt`
    );
    try {
      await writeFile(commitMsgFile, mensajeCommit, "utf-8");
      await execFileAsync("git", ["add", "-A"], { cwd: rutaRepo });
      await execFileAsync("git", ["commit", "-F", commitMsgFile], {
        cwd: rutaRepo,
      });
      await execFileAsync("git", ["push", "origin", branch], {
        cwd: rutaRepo,
      });
      return { ok: true };
    } finally {
      await unlink(commitMsgFile).catch(() => {});
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

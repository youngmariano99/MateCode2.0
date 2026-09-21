/**
 * Avisos de Oficina (sonido, vibración, notificación del sistema). Todo
 * best-effort: si el navegador no soporta algo o no hay permiso, se ignora en
 * silencio — el aviso dentro de la app siempre está. OJO: con el celu
 * bloqueado o la pestaña cerrada los navegadores frenan los timers de la
 * página, así que esto solo suena si la app está abierta (o en segundo plano
 * en la PC); para el resto haría falta push desde un servidor.
 */

export function pedirPermisoNotificaciones(): void {
  try {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      void Notification.requestPermission();
    }
  } catch {
    // sin soporte: nada que hacer
  }
}

function sonar(): void {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.2);
    });
    setTimeout(() => void ctx.close(), 1500);
  } catch {
    // sin audio: nada que hacer
  }
}

export function avisar(titulo: string, cuerpo: string): void {
  sonar();
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // sin vibración
  }
  try {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted" &&
      document.visibilityState === "hidden"
    ) {
      new Notification(titulo, { body: cuerpo });
    }
  } catch {
    // sin notificaciones
  }
}

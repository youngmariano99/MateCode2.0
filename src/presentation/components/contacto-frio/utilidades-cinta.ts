import type { FichaDigital } from "../../../domain/entidades/contacto-frio.entity";

/** Reloj como función (evita `Date.now()` suelto en el render). */
export const ahoraMs = () => Date.now();

export type Canal = "Instagram" | "WhatsApp" | "Email" | "Facebook";

export const OPCIONES_CANAL: { value: Canal; label: Canal }[] = [
  { value: "Instagram", label: "Instagram" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Email", label: "Email" },
  { value: "Facebook", label: "Facebook" },
];

/** Links directos para abrir el perfil/chat del prospecto con un click. */
export function enlacesRedes(
  ficha:
    | Pick<FichaDigital, "instagram" | "whatsapp" | "facebook" | "email">
    | undefined
): { label: string; href: string }[] {
  if (!ficha) return [];
  const links: { label: string; href: string }[] = [];
  if (ficha.instagram) {
    const usuario = ficha.instagram.replace(/^@/, "");
    links.push({
      label: "Abrir Instagram",
      href: usuario.startsWith("http")
        ? usuario
        : `https://instagram.com/${usuario}`,
    });
  }
  if (ficha.whatsapp) {
    links.push({
      label: "Abrir WhatsApp",
      href: `https://wa.me/${ficha.whatsapp.replace(/[^0-9]/g, "")}`,
    });
  }
  if (ficha.facebook) {
    links.push({
      label: "Abrir Facebook",
      href: ficha.facebook.startsWith("http")
        ? ficha.facebook
        : `https://facebook.com/${ficha.facebook}`,
    });
  }
  if (ficha.email) {
    links.push({ label: "Escribir email", href: `mailto:${ficha.email}` });
  }
  return links;
}

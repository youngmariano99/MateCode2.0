"use client";

import React, { useState, useEffect } from "react";
import { MainLayout } from "../../../presentation/components/layout";
import { Button } from "../../../presentation/components/button";
import { Card } from "../../../presentation/components/card";
import { Input } from "../../../presentation/components/input";
import { Select } from "../../../presentation/components/select";
import { useToast } from "../../../presentation/hooks/useToast";
import { ArchivoService } from "../../../presentation/services/archivo.service";
import { ValidationService } from "../../../presentation/services/validation.service";
import { db } from "../../../offline/dexie/db";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type TabActiva =
  "general" | "branding" | "fiscal" | "regional" | "ia" | "auditoria";

export default function AgenciaPage() {
  const [tab, setTab] = useState<TabActiva>("general");
  const { mostrarToast } = useToast();

  const [nombre, setNombre] = useState("MateCode HQ");
  const [tipo, setTipo] = useState("Digital");
  const [descripcion, setDescripcion] = useState(
    "Workspace centralizado para agencias digitales."
  );
  const [email, setEmail] = useState("hola@matecode.com");
  const [telefono, setTelefono] = useState("+54 11 5555-5555");
  const [web, setWeb] = useState("https://matecode.com");

  const [colorPrincipal, setColorPrincipal] = useState("#10B981");
  const [colorSecundario, setColorSecundario] = useState("#06B6D4");
  const [logo, setLogo] = useState<string | null>(null);

  const [razonSocial, setRazonSocial] = useState("MateCode S.A.");
  const [cuit, setCuit] = useState("20-34381898-0");
  const [iva, setIva] = useState("Responsable Inscripto");
  const [responsable, setResponsable] = useState("Mateo Gomez");
  const [cargo, setCargo] = useState("CEO & Fundador");

  const [idioma, setIdioma] = useState("es");
  const [moneda, setMoneda] = useState("ARS");
  const [zonaHoraria, setZonaHoraria] = useState(
    "America/Argentina/Buenos_Aires"
  );

  const [proveedor, setProveedor] = useState("Google Gemini");
  const [modelo, setModelo] = useState("Gemini 1.5 Pro");
  const [contexto, setContexto] = useState(
    "Tomate un mate. La IA hace el code."
  );
  const [designMd, setDesignMd] = useState(
    "# Lineamientos de Diseño\n\n- Colores oscuros por defecto.\n- Estilo visual premium esmeralda."
  );

  const logs =
    useLiveQuery(() =>
      db.logs_sincronizacion.orderBy("id").reverse().toArray()
    ) || [];

  const guardarConfiguracion = async (
    campos: Record<string, string | number | undefined>
  ) => {
    try {
      const current = (await db.agencia_config.get("current")) || {
        id: "current",
      };
      const updated = { ...current, ...campos };
      await db.agencia_config.put(updated);
    } catch {
      // Ignorar silenciosamente
    }
  };

  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        const savedLogo = ArchivoService.obtenerArchivoLocal("logo_agencia");
        if (savedLogo) setLogo(savedLogo);

        const savedDesign = localStorage.getItem("matecode_design_1");
        if (savedDesign) setDesignMd(savedDesign);

        const config = await db.agencia_config.get("current");
        if (config) {
          if (config.nombre) setNombre(config.nombre as string);
          if (config.tipo) setTipo(config.tipo as string);
          if (config.descripcion) setDescripcion(config.descripcion as string);
          if (config.email) setEmail(config.email as string);
          if (config.telefono) setTelefono(config.telefono as string);
          if (config.web) setWeb(config.web as string);

          if (config.colorPrincipal)
            setColorPrincipal(config.colorPrincipal as string);
          if (config.colorSecundario)
            setColorSecundario(config.colorSecundario as string);

          if (config.razonSocial) setRazonSocial(config.razonSocial as string);
          if (config.cuit) setCuit(config.cuit as string);
          if (config.iva) setIva(config.iva as string);
          if (config.responsable) setResponsable(config.responsable as string);
          if (config.cargo) setCargo(config.cargo as string);

          if (config.idioma) setIdioma(config.idioma as string);
          if (config.moneda) setMoneda(config.moneda as string);
          if (config.zonaHoraria) setZonaHoraria(config.zonaHoraria as string);

          if (config.proveedor) setProveedor(config.proveedor as string);
          if (config.modelo) setModelo(config.modelo as string);
          if (config.contexto) setContexto(config.contexto as string);
        }
      } catch {
        // Silencioso
      }
    };

    cargarConfiguracion();
  }, []);

  const guardarGeneral = async () => {
    try {
      ValidationService.correo.parse(email);
      ValidationService.url.parse(web);

      await guardarConfiguracion({
        nombre,
        tipo,
        descripcion,
        email,
        telefono,
        web,
      });

      await db.logs_sincronizacion.add({
        tipo: "exito",
        mensaje: `Datos generales actualizados: ${nombre}`,
        fecha: Date.now(),
      });
      mostrarToast("Datos generales guardados con éxito.", "exito");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      mostrarToast(msg || "Error al guardar los datos.", "error");
    }
  };

  const guardarBranding = async () => {
    await guardarConfiguracion({ colorPrincipal, colorSecundario });

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Branding actualizado: Principal ${colorPrincipal}`,
      fecha: Date.now(),
    });
    mostrarToast("Branding guardado correctamente.", "exito");
  };

  const guardarFiscal = async () => {
    try {
      ValidationService.cuit.parse(cuit);

      await guardarConfiguracion({
        razonSocial,
        cuit,
        iva,
        responsable,
        cargo,
      });

      await db.logs_sincronizacion.add({
        tipo: "exito",
        mensaje: `Datos fiscales y comerciales guardados para ${razonSocial}`,
        fecha: Date.now(),
      });
      mostrarToast("Datos fiscales  actualizados con éxito.", "exito");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      mostrarToast(msg || "Verifique el formato del CUIT.", "error");
    }
  };

  const guardarIA = async () => {
    localStorage.setItem("matecode_design_1", designMd);

    await guardarConfiguracion({ proveedor, modelo, contexto });

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Configuración de IA y Design.md actualizados.`,
      fecha: Date.now(),
    });
    mostrarToast("Parámetros de IA guardados con éxito.", "exito");
  };

  const guardarPreferencias = async () => {
    await guardarConfiguracion({ idioma, moneda, zonaHoraria });

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Preferencias regionales actualizadas: Idioma ${idioma}, Moneda ${moneda}`,
      fecha: Date.now(),
    });
    mostrarToast("Preferencias regionalizadas guardadas.", "exito");
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      ArchivoService.validarImagen(file);
      const b64 = await ArchivoService.convertirABase64(file);
      setLogo(b64);
      ArchivoService.guardarArchivoLocal("logo_agencia", b64);
      await db.logs_sincronizacion.add({
        tipo: "exito",
        mensaje: `Nuevo isotipo/logo cargado: ${file.name}`,
        fecha: Date.now(),
      });
      mostrarToast("Logo cargado con éxito.", "exito");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      mostrarToast(msg || "Error al subir imagen.", "error");
    }
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Agencia" },
  ];

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Configuración de Agencia
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Administra el branding, regionalización, IA y firma de tu workspace.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-[#2A2A2E]">
          {(
            [
              { id: "general", label: "Información General" },
              { id: "branding", label: "Branding" },
              { id: "fiscal", label: "Datos Comerciales" },
              { id: "regional", label: "Región y Preferencias" },
              { id: "ia", label: "IA y Design.md" },
              { id: "auditoria", label: "Auditoría" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-4 py-2.5 font-mono text-xs font-bold tracking-wide whitespace-nowrap transition-all ${
                tab === t.id
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6">
          {tab === "general" && (
            <Card>
              <div className="mb-4 border-b border-[#2A2A2E] pb-4">
                <h2 className="text-base font-bold text-white">
                  Detalles de la Agencia
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Información pública y tipo de negocio.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Nombre comercial"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
                <Input
                  label="Tipo de agencia"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                />
                <div className="md:col-span-2">
                  <Input
                    label="Descripción de la empresa"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                  />
                </div>
                <Input
                  label="Email de contacto"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label="Teléfono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
                <div className="md:col-span-2">
                  <Input
                    label="Sitio web corporativo"
                    value={web}
                    onChange={(e) => setWeb(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button onClick={guardarGeneral}>Guardar Cambios</Button>
              </div>
            </Card>
          )}

          {tab === "branding" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card>
                  <div className="mb-4 border-b border-[#2A2A2E] pb-4">
                    <h2 className="text-base font-bold text-white">
                      Identidad Visual y Colores
                    </h2>
                    <p className="mt-1 text-xs text-zinc-400">
                      Colores representativos de la marca.
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      label="Color principal (HEX)"
                      type="color"
                      value={colorPrincipal}
                      onChange={(e) => setColorPrincipal(e.target.value)}
                    />
                    <Input
                      label="Color secundario (HEX)"
                      type="color"
                      value={colorSecundario}
                      onChange={(e) => setColorSecundario(e.target.value)}
                    />

                    <div className="flex flex-col gap-2.5 md:col-span-2">
                      <span className="font-mono text-xs font-semibold text-zinc-400">
                        Logo de la Agencia
                      </span>
                      <div className="flex items-center gap-4 rounded-xl border border-dashed border-[#2A2A2E] p-4">
                        {logo ? (
                          <img
                            src={logo}
                            alt="Logo"
                            className="h-16 w-16 rounded-xl border border-[#2A2A2E] bg-zinc-950 object-contain p-2"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-[#2A2A2E] bg-zinc-900 text-xs font-bold text-zinc-500">
                            Sin Logo
                          </div>
                        )}
                        <div className="flex flex-col gap-2">
                          <label className="cursor-pointer rounded-lg bg-emerald-500 px-3 py-1.5 font-mono text-xs font-bold text-zinc-950 select-none hover:bg-emerald-600">
                            Seleccionar Archivo
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoUpload}
                            />
                          </label>
                          <span className="text-[10px] text-zinc-500">
                            Formatos recomendados: PNG o WEBP de menos de 2MB.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <Button onClick={guardarBranding}>Guardar Branding</Button>
                  </div>
                </Card>
              </div>

              <div className="flex flex-col gap-6">
                <Card>
                  <div className="mb-4 border-b border-[#2A2A2E] pb-4">
                    <h2 className="text-base font-bold text-white">
                      Previsualización de Marca
                    </h2>
                    <p className="mt-1 text-xs text-zinc-400">
                      Cómo se visualizan tus acentos.
                    </p>
                  </div>
                  <div className="mt-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-3 rounded-xl border border-[#2A2A2E] bg-zinc-950 p-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: colorPrincipal }}
                        />
                        <span className="font-mono text-xs font-bold">
                          Botón Principal
                        </span>
                      </div>
                      <button
                        className="w-full rounded-lg py-2 font-mono text-xs font-bold text-zinc-950 transition-all"
                        style={{ backgroundColor: colorPrincipal }}
                      >
                        Acción Principal
                      </button>
                    </div>

                    <div className="flex flex-col gap-3 rounded-xl border border-[#2A2A2E] bg-zinc-950 p-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: colorSecundario }}
                        />
                        <span className="font-mono text-xs font-bold">
                          Enlaces y Badges
                        </span>
                      </div>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: colorSecundario }}
                      >
                        Texto destacado de la marca
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {tab === "fiscal" && (
            <Card>
              <div className="mb-4 border-b border-[#2A2A2E] pb-4">
                <h2 className="text-base font-bold text-white">
                  Datos Comerciales y Fiscales
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Usados para facturación, presupuestos y contratos de clientes.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Razón Social"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                />
                <Input
                  label="CUIT / CUIL (XX-XXXXXXXX-X)"
                  value={cuit}
                  onChange={(e) => setCuit(e.target.value)}
                />

                <Select
                  label="Condición de IVA"
                  options={[
                    {
                      value: "Responsable Inscripto",
                      label: "Responsable Inscripto",
                    },
                    { value: "Monotributista", label: "Monotributista" },
                    { value: "Exento", label: "Exento" },
                  ]}
                  value={iva}
                  onChange={(val) => setIva(val)}
                />

                <div className="md:col-span-2">
                  <h3 className="mt-2 mb-3 border-b border-[#2A2A2E] pb-2 font-mono text-xs font-bold text-zinc-400">
                    Firma Comercial Autorizada
                  </h3>
                </div>

                <Input
                  label="Nombre del responsable"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                />
                <Input
                  label="Cargo institucional"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button onClick={guardarFiscal}>Guardar Datos Fiscales</Button>
              </div>
            </Card>
          )}

          {tab === "regional" && (
            <Card>
              <div className="mb-4 border-b border-[#2A2A2E] pb-4">
                <h2 className="text-base font-bold text-white">
                  Regionalización y Preferencias
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Formatos de localización aplicados globalmente.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Select
                  label="Idioma del sistema"
                  options={[
                    { value: "es", label: "Español Latinoamericano" },
                    { value: "en", label: "English" },
                  ]}
                  value={idioma}
                  onChange={(val) => setIdioma(val)}
                />

                <Select
                  label="Moneda por defecto"
                  options={[
                    { value: "ARS", label: "Pesos Argentinos (ARS)" },
                    { value: "USD", label: "Dólares Americanos (USD)" },
                  ]}
                  value={moneda}
                  onChange={(val) => setMoneda(val)}
                />

                <div className="md:col-span-2">
                  <Input
                    label="Zona horaria"
                    value={zonaHoraria}
                    onChange={(e) => setZonaHoraria(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button onClick={guardarPreferencias}>
                  Guardar Preferencias
                </Button>
              </div>
            </Card>
          )}

          {tab === "ia" && (
            <Card>
              <div className="mb-4 border-b border-[#2A2A2E] pb-4">
                <h2 className="text-base font-bold text-white">
                  Contexto de Inteligencia Artificial
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Define los lineamientos institucionales y el archivo
                  Design.md.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Select
                  label="Proveedor de IA"
                  options={[
                    {
                      value: "Google Gemini",
                      label: "Google Gemini (Recomendado)",
                    },
                    { value: "OpenAI", label: "OpenAI" },
                  ]}
                  value={proveedor}
                  onChange={(val) => setProveedor(val)}
                />

                <Input
                  label="Modelo preferido"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                />

                <div className="md:col-span-2">
                  <Input
                    label="Contexto permanente / Leyenda"
                    value={contexto}
                    onChange={(e) => setContexto(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2 md:col-span-2">
                  <span className="font-mono text-xs font-semibold text-zinc-400">
                    Archivo Design.md (Markdown)
                  </span>
                  <textarea
                    rows={6}
                    value={designMd}
                    onChange={(e) => setDesignMd(e.target.value)}
                    className="w-full resize-none rounded-xl border border-[#2A2A2E] bg-[#18181B] p-3.5 font-mono text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-500">
                    Este archivo se inyectará automáticamente en todas las
                    consultas de la IA.
                  </span>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button onClick={guardarIA}>Guardar Parámetros IA</Button>
              </div>
            </Card>
          )}

          {tab === "auditoria" && (
            <Card>
              <div className="mb-4 border-b border-[#2A2A2E] pb-4">
                <h2 className="text-base font-bold text-white">
                  Historial y Auditoría de Cambios
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Logs históricos guardados tanto Online como Offline.
                </p>
              </div>
              <div className="mt-4 flex max-h-[350px] flex-col gap-4 overflow-y-auto pr-2">
                {logs.length === 0 ? (
                  <div className="py-6 text-center font-mono text-xs text-zinc-500">
                    No se registran cambios recientes.
                  </div>
                ) : (
                  logs.map((l) => (
                    <div
                      key={l.id}
                      className="relative flex gap-4 border-l border-[#2A2A2E] pb-4 pl-4 last:pb-0"
                    >
                      <div className="absolute top-1.5 -left-[5px] h-2 w-2 rounded-full bg-emerald-500" />
                      <div className="flex-1">
                        <span className="block text-xs font-bold text-zinc-300">
                          {l.mensaje}
                        </span>
                        <span className="mt-1 block font-mono text-[10px] text-zinc-500">
                          {format(l.fecha, "dd/MM/yyyy HH:mm:ss", {
                            locale: es,
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export const descargarArchivo = (content: string, filename: string) => {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const descargarZipDocumentos = async (
  proyectoNombre: string,
  filesMap: Record<string, string>
) => {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  // Add CLAUDE.md in root
  if (filesMap["CLAUDE.md"]) {
    zip.file("CLAUDE.md", filesMap["CLAUDE.md"]);
  }

  const docsFolder = zip.folder("docs");
  if (docsFolder) {
    Object.entries(filesMap).forEach(([name, content]) => {
      if (name !== "CLAUDE.md") {
        docsFolder.file(name, content);
      }
    });
  }

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `documentacion_${proyectoNombre || "proyecto"}.zip`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

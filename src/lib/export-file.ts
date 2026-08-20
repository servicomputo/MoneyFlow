"use client";

/**
 * Descarga o comparte un archivo de texto (JSON o CSV).
 *
 * - En móvil (APK/Capacitor): guarda el archivo en Cache/ con Filesystem
 *   y luego abre el diálogo de compartir con Share
 * - En desktop (navegador): usa blob + <a download>
 *
 * @param content Contenido del archivo (string)
 * @param fileName Nombre del archivo
 * @param mimeType Tipo MIME
 * @returns true si se exportó correctamente
 */
export async function downloadOrShareFile(
  content: string,
  fileName: string,
  mimeType: string
): Promise<boolean> {
  // Verificar si estamos en entorno nativo (APK)
  let isNative = false;
  try {
    const { Capacitor } = await import("@capacitor/core");
    isNative = Capacitor.isNativePlatform();
  } catch {
    // Si no podemos importar @capacitor/core, no estamos en nativo
    isNative = false;
  }

  // Desktop: usar el método tradicional con blob
  if (!isNative) {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch (e) {
      console.error("Error en descarga desktop:", e);
      return false;
    }
  }

  // Móvil (Capacitor): importar plugins dinámicamente
  let Filesystem: typeof import("@capacitor/filesystem").Filesystem | null = null;
  let Share: typeof import("@capacitor/share").Share | null = null;
  let Directory: typeof import("@capacitor/filesystem").Directory | null = null;
  let Encoding: typeof import("@capacitor/filesystem").Encoding | null = null;

  try {
    const fs = await import("@capacitor/filesystem");
    Filesystem = fs.Filesystem;
    Directory = fs.Directory;
    Encoding = fs.Encoding;
  } catch (e) {
    console.error("No se pudo importar @capacitor/filesystem:", e);
    return false;
  }

  try {
    const shareMod = await import("@capacitor/share");
    Share = shareMod.Share;
  } catch (e) {
    console.error("No se pudo importar @capacitor/share:", e);
    // Share es opcional, podemos continuar sin él
  }

  // Paso 1: Guardar el archivo en Cache (no necesita permisos)
  let fileUri: string;
  try {
    const result = await Filesystem!.writeFile({
      path: fileName,
      data: content,
      directory: Directory!.Cache,
      encoding: Encoding!.UTF8,
      recursive: true,
    });
    fileUri = result.uri;
  } catch (e) {
    console.error("Error al escribir archivo en Cache:", e);
    // Intentar con Directory.Data como fallback
    try {
      const result = await Filesystem!.writeFile({
        path: fileName,
        data: content,
        directory: Directory!.Data,
        encoding: Encoding!.UTF8,
        recursive: true,
      });
      fileUri = result.uri;
    } catch (e2) {
      console.error("Error al escribir archivo en Data:", e2);
      return false;
    }
  }

  // Paso 2: Intentar compartir el archivo
  if (Share) {
    try {
      await Share.share({
        title: fileName,
        text: `Archivo exportado: ${fileName}`,
        url: fileUri,
        dialogTitle: "Guardar o compartir",
      });
    } catch (e) {
      // El usuario pudo haber cancelado el diálogo de compartir.
      // El archivo ya está guardado, así que no es un error crítico.
      console.log("Share cancelado o no disponible (archivo ya guardado):", e);
    }
  }

  // El archivo se guardó correctamente
  return true;
}

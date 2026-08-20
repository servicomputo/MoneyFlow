"use client";

import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

/**
 * Descarga o comparte un archivo de texto (JSON o CSV).
 *
 * - En móvil (APK/Capacitor): guarda el archivo en Documents/ con Filesystem
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
  const isNative = Capacitor.isNativePlatform();

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

  // Móvil (Capacitor): guardar archivo en Documents/ y compartir
  // Paso 1: Guardar el archivo
  let fileUri: string;
  try {
    const result = await Filesystem.writeFile({
      path: fileName,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    fileUri = result.uri;
  } catch (e) {
    console.error("Error al escribir archivo:", e);
    return false;
  }

  // Paso 2: Intentar abrir el diálogo de compartir
  // Si el usuario cancela o falla, no importa: el archivo ya está guardado
  try {
    await Share.share({
      title: fileName,
      text: `Archivo exportado: ${fileName}`,
      url: fileUri,
      dialogTitle: "Guardar o compartir",
    });
  } catch (e) {
    // El usuario pudo haber cancelado el diálogo de compartir,
    // o el archivo no se pudo compartir. Pero el archivo YA está guardado
    // en Documents/, así que no es un error crítico.
    console.log("Share cancelado o no disponible (archivo ya guardado):", e);
  }

  // Siempre retornar true porque el archivo se guardó correctamente
  return true;
}

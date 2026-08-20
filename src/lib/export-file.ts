"use client";

import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

/**
 * Detecta si estamos en un entorno nativo (Capacitor/WebView).
 */
function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  // Capacitor inyecta este objeto en el WebView
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
}

/**
 * Descarga o comparte un archivo de texto (JSON o CSV).
 *
 * - En desktop (navegador): usa blob + <a download> (función nativa del navegador)
 * - En móvil (Capacitor WebView): usa Filesystem para guardar + Share para compartir
 *
 * @param content Contenido del archivo (string)
 * @param fileName Nombre del archivo (ej: "moneyflow-export.json")
 * @param mimeType Tipo MIME (ej: "application/json" o "text/csv")
 * @returns true si se exportó correctamente
 */
export async function downloadOrShareFile(
  content: string,
  fileName: string,
  mimeType: string
): Promise<boolean> {
  // Desktop: usar el método tradicional con blob
  if (!isNativePlatform()) {
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

  // Móvil (Capacitor): usar Filesystem + Share
  try {
    // Escribir el archivo en el directorio de Documents de la app
    const result = await Filesystem.writeFile({
      path: fileName,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });

    // Compartir el archivo para que el usuario lo guarde donde quiera
    await Share.share({
      title: fileName,
      text: `Archivo exportado: ${fileName}`,
      url: result.uri,
      dialogTitle: "Guardar o compartir",
    });

    return true;
  } catch (e) {
    console.error("Error en exportación móvil:", e);
    // Intentar solo Share con texto como fallback
    try {
      await Share.share({
        title: fileName,
        text: content,
        dialogTitle: "Guardar o compartir",
      });
      return true;
    } catch {
      return false;
    }
  }
}

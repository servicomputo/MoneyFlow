"use client";

import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

/**
 * Detecta si estamos en un entorno nativo (Capacitor/WebView).
 */
function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
}

/**
 * Verifica si un error es por "usuario canceló la acción" (no es error real).
 * En Android/iOS, cuando el usuario cierra el diálogo de compartir, se lanza
 * una excepción que NO debe tratarse como error.
 */
function isUserCancellation(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const msg = e.message.toLowerCase();
  return (
    msg.includes("cancel") ||
    msg.includes("user canceled") ||
    msg.includes("dismiss") ||
    msg.includes("aborted") ||
    msg.includes("share canceled")
  );
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
 * @returns true si se exportó correctamente, false si hubo error real.
 *          Si el usuario canceló el diálogo de compartir, retorna true (no es error).
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

  // Móvil (Capacitor): usar Filesystem para guardar el archivo
  try {
    await Filesystem.writeFile({
      path: fileName,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });
  } catch (e) {
    console.error("Error al escribir archivo:", e);
    return false;
  }

  // Intentar compartir el archivo. Si el usuario cancela, no es error.
  try {
    // Obtener la URI del archivo recién creado (formato content:// para Android)
    const fileInfo = await Filesystem.getUri({
      directory: Directory.Documents,
      path: fileName,
    });

    await Share.share({
      title: fileName,
      text: `Archivo exportado: ${fileName}`,
      url: fileInfo.uri,
      dialogTitle: "Guardar o compartir",
    });
    return true;
  } catch (e) {
    // Si el usuario simplemente cerró el diálogo de compartir, NO es error.
    // El archivo ya se guardó en Documents/ correctamente.
    if (isUserCancellation(e)) {
      return true;
    }
    console.error("Error al compartir (archivo ya guardado):", e);
    // El archivo ya quedó guardado en Documents/, así que no es un error total
    return true;
  }
}

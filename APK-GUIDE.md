# Money Flow — Generar APK para Android

## 📋 Requisitos
1. **Node.js 20+** o Bun instalado
2. **Android Studio** (incluye Android SDK): https://developer.android.com/studio
3. **Git** (para clonar el repo)

---

## 🚀 Primera vez (clonar y configurar)

### Paso 1: Clonar el repo
```bash
git clone https://github.com/servicomptuo/MoneyFlow.git money-flow
cd money-flow
bun install
```

### Paso 2: Instalar Capacitor (solo la primera vez)
```bash
bun add -D @capacitor/cli
bun add @capacitor/core @capacitor/android
```

### Paso 3: Generar iconos de Android desde el icono fuente
> ⚠️ **IMPORTANTE**: El icono fuente está en `public/icon-512.png` (1024×1024).
> Este paso genera TODOS los tamaños que Android necesita.

```bash
# Instalar generador de assets (solo la primera vez)
bun add -D @capacitor/assets

# Generar iconos y splash en android/app/src/main/res/
bunx cap-assets generate --icon public/icon-512.png
```

Si no tienes `cap-assets`, también funciona:
```bash
npx @capacitor/assets generate --icon public/icon-512.png
```

### Paso 4: Agregar plataforma Android (solo la primera vez)
```bash
npx cap add android
```

Esto crea la carpeta `android/` con el proyecto nativo.
Los iconos del Paso 3 ya quedan en `android/app/src/main/res/`.

---

## 🔄 Actualizar el APK (ya configurado)

Cuando hagas cambios en el código y quieras un APK nuevo:

### Paso 1: Actualizar el repo
```bash
cd money-flow
git pull origin main
bun install   # por si agregamos dependencias
```

### Paso 2: Mover API routes temporalmente
> Las API routes no funcionan en APK offline (no hay servidor).
> Las movemos para que `next build` no las incluya.

```bash
mv src/app/api /tmp/api_backup
```

### Paso 3: Editar `next.config.ts`
Cambia `output: "standalone"` por `output: "export"`:

```typescript
const nextConfig: NextConfig = {
  output: "export",        // ← cambiado
  images: { unoptimized: true },
  trailingSlash: true,
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
  serverExternalPackages: ["dexie"],
};
```

### Paso 4: Build estático
```bash
npx next build
```

Esto genera la carpeta `out/` con la web lista para el APK.

### Paso 5: Restaurar API routes
```bash
mv /tmp/api_backup src/app/api
```

> Restaurar para no perderlas en el repo. Si vas a hacer otro build,
> repite los Pasos 2-5.

### Paso 6: Sincronizar con Android
```bash
npx cap sync android
```

Esto copia `out/` a `android/app/src/main/assets/public/`
y actualiza los plugins nativos.

### Paso 7: Regenerar iconos (solo si cambió el icono)
> Si NO cambiaste `public/icon-512.png`, **salta este paso**.
> Los iconos anteriores se conservan.

```bash
bunx cap-assets generate --icon public/icon-512.png
```

### Paso 8: Generar el APK
**Opción A — Android Studio (recomendado):**
```bash
npx cap open android
```
En Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

**Opción B — Terminal:**
```bash
cd android && ./gradlew assembleDebug
```

El APK está en:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📱 Instalar en Android
1. Envía el APK por WhatsApp, AirDrop, Google Drive, etc.
2. El usuario lo descarga y toca **"Instalar"**
3. Android pide permiso **"Origen desconocido"** → Aceptar
4. La app se instala con el icono de Money Flow (billetera dorada sobre negro)

---

## 🔑 Notas importantes

- **El APK funciona 100% offline** (sin servidor)
- **Los datos se guardan en el celular** (IndexedDB del WebView)
- **El escáner** usa OpenAI GPT-4o mini (el usuario pega su API key en Configuración)
- **Límite**: 50 tickets por día (se reinicia a medianoche)
- **El icono** se genera desde `public/icon-512.png` (1024×1024). No lo borres.

---

## 🐛 Problemas comunes

### El icono no aparece
```bash
# Verifica que el icono fuente existe
ls -la public/icon-512.png

# Regenera los iconos
bunx cap-assets generate --icon public/icon-512.png
npx cap sync android
```

### Build falla por API routes
Asegúrate de haber hecho el Paso 2 (mover `src/app/api` a `/tmp/api_backup`)
antes del `next build`.

### La app se ve en blanco
- Verifica que `next.config.ts` tiene `output: "export"`
- Verifica que `capacitor.config.ts` tiene `webDir: "out"`
- Borra `.next/` y `out/` y reconstruye:
  ```bash
  rm -rf .next out
  npx next build
  npx cap sync android
  ```

### Cambios no se reflejan en el APK
Después de cualquier cambio en el código:
```bash
mv src/app/api /tmp/api_backup
npx next build
mv /tmp/api_backup src/app/api
npx cap sync android
cd android && ./gradlew assembleDebug
```

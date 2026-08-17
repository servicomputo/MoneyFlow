# Money Flow — Generar APK para Android

## 📋 Requisitos
1. Node.js 20+ o Bun instalado
2. Android Studio (incluye Android SDK): https://developer.android.com/studio

## 🚀 Pasos para generar el APK

### Paso 1: Instalar dependencias
```bash
cd money-flow
bun install
```

### Paso 2: Mover API routes temporalmente
```bash
mv src/app/api /tmp/api_backup
```

### Paso 3: Editar next.config.ts
Cambia `output: "standalone"` por `output: "export"` y añade:
```typescript
images: { unoptimized: true },
trailingSlash: true,
```

### Paso 4: Build estático
```bash
npx next build
```

### Paso 5: Restaurar API routes
```bash
mv /tmp/api_backup src/app/api
```

### Paso 6: Sincronizar con Android
```bash
npx cap sync android
```

### Paso 7: Generar APK
En Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
O desde terminal:
```bash
cd android && ./gradlew assembleDebug
```

El APK está en: `android/app/build/outputs/apk/debug/app-debug.apk`

## 📱 Instalar en Android
1. Envía el APK por WhatsApp
2. El usuario lo descarga y toca "Instalar"
3. Android pide permiso "Origen desconocido" → Aceptar
4. La app se instala con el icono de Money Flow

## 🔄 Generar nueva versión
```bash
mv src/app/api /tmp/api_backup
npx next build
mv /tmp/api_backup src/app/api
npx cap sync android
cd android && ./gradlew assembleDebug
```

## 🔑 Notas
- El APK funciona 100% offline (sin servidor)
- Los datos se guardan en el celular (IndexedDB)
- El escáner usa OpenAI GPT-4o mini (usuario pega su API key en Configuración)
- Límite: 50 tickets por día (se reinicia a medianoche)

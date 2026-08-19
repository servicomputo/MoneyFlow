#!/bin/bash
# ============================================================
# Money Flow — Empezar de cero en tu laptop
# ============================================================
# Este script borra TODO y regenera desde GitHub.
# USO:  bash start-fresh.sh
# ============================================================

set -e

MONEYFLOW_DIR="MoneyFlow"
BACKUP_DIR="MoneyFlow_backup_$(date +%Y%m%d_%H%M%S)"

echo "⚠️  Esto va a borrar tu carpeta MoneyFlow actual y empezar de cero."
echo "   Se creará un backup en: $BACKUP_DIR"
echo ""
read -p "¿Continuar? (s/N): " confirm
if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
    echo "Cancelado."
    exit 0
fi

echo ""
echo "1️⃣  Haciendo backup de la carpeta actual..."
if [ -d "$MONEYFLOW_DIR" ]; then
    mv "$MONEYFLOW_DIR" "$BACKUP_DIR"
    echo "   ✓ Backup creado en $BACKUP_DIR"
else
    echo "   (No existe carpeta MoneyFlow, continuando...)"
fi
echo ""

echo "2️⃣  Clonando repo desde GitHub..."
git clone https://github.com/servicomputo/MoneyFlow.git
cd MoneyFlow
echo "   ✓ Repo clonado"
echo ""

echo "3️⃣  Verificando commits más recientes..."
git log --oneline -5
echo ""

echo "4️⃣  Instalando dependencias..."
bun install
echo "   ✓ Dependencias instaladas"
echo ""

echo "5️⃣  Instalando Capacitor..."
bun add @capacitor/core @capacitor/android
bun add -D @capacitor/cli @capacitor/assets
echo "   ✓ Capacitor instalado"
echo ""

echo "6️⃣  Creando proyecto Android..."
npx cap add android
echo "   ✓ Proyecto Android creado"
echo ""

echo "7️⃣  Configurando iconos y recursos..."
bash setup-android.sh
echo ""

echo "8️⃣  Mover API routes temporalmente (para build offline)..."
mv src/app/api /tmp/api_backup
echo "   ✓ API routes movidas"
echo ""

echo "9️⃣  Editando next.config.ts para build estático..."
cat > next.config.ts << 'EOF'
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["dexie"],
};

export default nextConfig;
EOF
echo "   ✓ next.config.ts configurado para export"
echo ""

echo "🔟  Mover examples temporalmente (evita error de build)..."
if [ -d "examples" ]; then
    mv examples /tmp/examples_backup
    echo "   ✓ examples movido"
else
    echo "   (No existe carpeta examples)"
fi
echo ""

echo "1️⃣1️⃣  Build estático..."
npx next build
echo "   ✓ Build completado"
echo ""

echo "1️⃣2️⃣  Restaurando API routes y examples..."
mv /tmp/api_backup src/app/api
[ -d /tmp/examples_backup ] && mv /tmp/examples_backup examples
git checkout next.config.ts
echo "   ✓ Todo restaurado"
echo ""

echo "1️⃣3️⃣  Sincronizando con Android..."
npx cap sync android
echo "   ✓ Sincronizado"
echo ""

echo "============================================================"
echo "✅ TODO LISTO PARA GENERAR EL APK"
echo "============================================================"
echo ""
echo "Siguientes pasos:"
echo ""
echo "  1. Abre Android Studio:"
echo "     npx cap open android"
echo ""
echo "  2. Espera al Gradle Sync (2-3 minutos)"
echo ""
echo "  3. En Android Studio:"
echo "     Build → Clean Project"
echo "     Build → Build Bundle(s) / APK(s) → Build APK(s)"
echo ""
echo "  4. El APK estará en:"
echo "     android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "  5. Instálalo en tu celular (desinstala el anterior primero)"
echo ""
echo "Tu backup anterior está en: ../$BACKUP_DIR"
echo ""

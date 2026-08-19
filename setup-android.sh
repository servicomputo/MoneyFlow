#!/bin/bash
# ============================================================
# Money Flow — Configurar iconos y recursos de Android
# ============================================================
# Este script arregla TODO lo necesario para que el APK tenga
# el icono correcto y no marque errores de recursos faltantes.
#
# USO:
#   cd ~/Downloads/MoneyFlow
#   bash setup-android.sh
#
# Ejecutar DESPUÉS de: npx cap add android
# Se puede ejecutar las veces que sea necesario.
# ============================================================

set -e

echo "🔧 Configurando iconos y recursos de Android..."
echo ""

ANDROID_RES="android/app/src/main/res"

# ----------------------------------------------------------
# 1. Borrar TODO lo relacionado con iconos (adaptive + PNGs viejos)
# ----------------------------------------------------------
echo "1️⃣  Limpiando iconos anteriores..."
rm -rf "$ANDROID_RES/mipmap-anydpi-v26/" 2>/dev/null || true
rm -f "$ANDROID_RES"/mipmap-*/ic_launcher*.png 2>/dev/null || true
rm -f "$ANDROID_RES"/mipmap-*/ic_launcher*.xml 2>/dev/null || true
rm -f "$ANDROID_RES"/mipmap-*/ic_launcher*.webp 2>/dev/null || true
rm -f "$ANDROID_RES"/mipmap-*/ic_launcher_foreground*.* 2>/dev/null || true
rm -f "$ANDROID_RES"/mipmap-*/ic_launcher_background*.* 2>/dev/null || true
rm -f "$ANDROID_RES/drawable/ic_launcher"*.* 2>/dev/null || true
rm -f "$ANDROID_RES/values/ic_launcher_background.xml" 2>/dev/null || true
echo "   ✓ Iconos anteriores borrados (incluyendo .webp)"
echo ""

# ----------------------------------------------------------
# 2. Generar PNGs del icono (5 tamaños, sin XML adaptive)
# ----------------------------------------------------------
echo "2️⃣  Generando iconos PNG..."
python3 << 'PYEOF'
from PIL import Image
import os

src = "public/icon-512.png"
if not os.path.exists(src):
    print(f"❌ No existe {src}")
    exit(1)

img = Image.open(src).convert("RGBA")
print(f"   Icono fuente: {img.size[0]}x{img.size[1]} px")

sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

base = "android/app/src/main/res"
for folder, size in sizes.items():
    out_dir = f"{base}/{folder}"
    os.makedirs(out_dir, exist_ok=True)
    # Icono normal
    resized = img.resize((size, size), Image.LANCZOS)
    resized.save(f"{out_dir}/ic_launcher.png", "PNG")
    # Icono redondo (mismo archivo)
    resized.save(f"{out_dir}/ic_launcher_round.png", "PNG")
    print(f"   ✓ {folder}/ic_launcher.png ({size}x{size})")

print("   ✓ Iconos PNG generados (sin XML adaptive)")
PYEOF
echo ""

# ----------------------------------------------------------
# 3. Crear strings.xml (app_name, title_activity_main)
# ----------------------------------------------------------
echo "3️⃣  Creando strings.xml..."
mkdir -p "$ANDROID_RES/values"
cat > "$ANDROID_RES/values/strings.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Money Flow</string>
    <string name="title_activity_main">Money Flow</string>
    <string name="package_name">com.jema.moneyflow</string>
    <string name="custom_url_scheme">com.jema.moneyflow</string>
</resources>
EOF
echo "   ✓ strings.xml creado"

# ----------------------------------------------------------
# 4. Crear colors.xml
# ----------------------------------------------------------
echo "4️⃣  Creando colors.xml..."
cat > "$ANDROID_RES/values/colors.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#0A0A0A</color>
    <color name="colorPrimaryDark">#000000</color>
    <color name="colorAccent">#D4AF37</color>
    <color name="background">#0A0A0A</color>
</resources>
EOF
echo "   ✓ colors.xml creado"

# ----------------------------------------------------------
# 5. Crear styles.xml (tema de la app)
# ----------------------------------------------------------
echo "5️⃣  Creando styles.xml..."
cat > "$ANDROID_RES/values/styles.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
    </style>
    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme">
        <item name="android:windowBackground">@drawable/splash</item>
    </style>
</resources>
EOF
echo "   ✓ styles.xml creado"
echo ""

# ----------------------------------------------------------
# 6. Crear splash.png en drawable/
# ----------------------------------------------------------
echo "6️⃣  Creando splash.png..."
mkdir -p "$ANDROID_RES/drawable"
python3 << 'PYEOF'
from PIL import Image
import os

src = "public/icon-512.png"
img = Image.open(src).convert("RGBA")
out = "android/app/src/main/res/drawable/splash.png"
# Splash debe ser más grande (pantalla completa)
img.resize((432, 432), Image.LANCZOS).save(out, "PNG")
print(f"   ✓ {out} creado (432x432)")
PYEOF
echo ""

# ----------------------------------------------------------
# 7. Crear file_paths.xml (necesario para FileProvider)
# ----------------------------------------------------------
echo "7️⃣  Creando file_paths.xml..."
mkdir -p "$ANDROID_RES/xml"
cat > "$ANDROID_RES/xml/file_paths.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <files-path name="files" path="." />
    <cache-path name="cache" path="." />
    <external-files-path name="external_files" path="." />
    <external-cache-path name="external_cache" path="." />
</paths>
EOF
echo "   ✓ file_paths.xml creado"
echo ""

# ----------------------------------------------------------
# 8. Verificar AndroidManifest.xml
# ----------------------------------------------------------
echo "8️⃣  Verificando AndroidManifest.xml..."
MANIFEST="$ANDROID_RES/AndroidManifest.xml"
if [ -f "$MANIFEST" ]; then
    if grep -q "android:icon=\"@mipmap/ic_launcher\"" "$MANIFEST" && \
       grep -q "android:roundIcon=\"@mipmap/ic_launcher_round\"" "$MANIFEST"; then
        echo "   ✓ AndroidManifest.xml está correcto"
    else
        echo "   ⚠️  AndroidManifest.xml no referencia los iconos correctamente"
        echo "   Debe tener:"
        echo '     android:icon="@mipmap/ic_launcher"'
        echo '     android:roundIcon="@mipmap/ic_launcher_round"'
    fi
else
    echo "   ❌ No existe AndroidManifest.xml"
fi
echo ""

# ----------------------------------------------------------
# 9. Limpiar caché de build
# ----------------------------------------------------------
echo "9️⃣  Limpiando caché de build..."
rm -rf android/app/build/ 2>/dev/null || true
rm -rf android/.gradle/ 2>/dev/null || true
rm -rf android/build/ 2>/dev/null || true
echo "   ✓ Caché borrada"
echo ""

# ----------------------------------------------------------
# 10. Verificar que NO queden duplicados (webp + png)
# ----------------------------------------------------------
echo "🔟  Verificando que no haya duplicados..."
DUPLICATES=$(find "$ANDROID_RES" -name "ic_launcher*.webp" 2>/dev/null | head -1)
if [ -n "$DUPLICATES" ]; then
    echo "   ⚠️  Aún quedan archivos .webp, borrándolos..."
    find "$ANDROID_RES" -name "ic_launcher*.webp" -delete
    echo "   ✓ .webp eliminados"
else
    echo "   ✓ No hay archivos .webp duplicados"
fi

# Contar PNGs
PNG_COUNT=$(find "$ANDROID_RES"/mipmap-* -name "ic_launcher*.png" 2>/dev/null | wc -l)
echo "   ✓ Total PNGs de icono: $PNG_COUNT (deben ser 10: 5 carpetas × 2)"

# Verificar que NO haya XMLs de adaptive icon
XML_COUNT=$(find "$ANDROID_RES" -name "ic_launcher*.xml" 2>/dev/null | wc -l)
if [ "$XML_COUNT" -gt 0 ]; then
    echo "   ⚠️  Aún quedan $XML_COUNT XMLs de adaptive icon, borrándolos..."
    find "$ANDROID_RES" -name "ic_launcher*.xml" -delete
    echo "   ✓ XMLs eliminados"
else
    echo "   ✓ No hay XMLs de adaptive icon"
fi
echo ""

# ----------------------------------------------------------
# 10. Resumen final
# ----------------------------------------------------------
echo "============================================================"
echo "✅ CONFIGURACIÓN COMPLETA"
echo "============================================================"
echo ""
echo "Archivos creados/actualizados:"
echo "  • android/app/src/main/res/values/strings.xml"
echo "  • android/app/src/main/res/values/colors.xml"
echo "  • android/app/src/main/res/values/styles.xml"
echo "  • android/app/src/main/res/xml/file_paths.xml"
echo "  • android/app/src/main/res/drawable/splash.png"
echo "  • android/app/src/main/res/mipmap-*/ic_launcher.png (5 tamaños)"
echo "  • android/app/src/main/res/mipmap-*/ic_launcher_round.png (5 tamaños)"
echo ""
echo "Iconos adaptive XML eliminados (causan el robot verde)."
echo ""
echo "AHORA PUEDES GENERAR EL APK:"
echo "  npx cap sync android"
echo "  npx cap open android"
echo "  (en Android Studio) Build → Clean Project → Build APK(s)"
echo ""

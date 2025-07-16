#!/bin/bash

echo "🔎 Verificando configuración de TypeScript..."

# Verificar versión de Node
echo -n "📦 Node version: "
node -v

# Verificar existencia de tsconfig.json
if [ ! -f "tsconfig.json" ]; then
  echo "❌ No se encontró tsconfig.json en el directorio raíz."
  exit 1
fi

# Verificar existencia de @types/react y @types/react-dom
echo "📚 Tipos de React:"
npm list @types/react --depth=0 || echo "⚠️ @types/react NO instalado"
npm list @types/react-dom --depth=0 || echo "⚠️ @types/react-dom NO instalado"

# Verificar si @types/next está instalado (no debería)
if npm list @types/next --depth=0 &>/dev/null; then
  echo "❌ ERROR: @types/next está instalado y debería eliminarse."
else
  echo "✅ @types/next NO está instalado (correcto para Next.js v13+)"
fi

# Verificar si existe archivo de declaración para Firebase
FIREBASE_DECL_FILE="src/types/firebase-fix.d.ts"
if [ -f "$FIREBASE_DECL_FILE" ]; then
  echo "✅ Archivo de declaraciones personalizadas para Firebase encontrado en: $FIREBASE_DECL_FILE"
else
  echo "⚠️ Archivo $FIREBASE_DECL_FILE no encontrado. Puedes crearlo con:"
  echo "echo \"declare module 'firebase/auth'; declare module 'firebase/firestore'; declare module 'firebase/functions';\" > $FIREBASE_DECL_FILE"
fi

# Verificar si tsconfig.json incluye rutas importantes
echo "📁 Verificando rutas de paths en tsconfig.json..."
grep '"@/lib/*": \["src/lib/*"\]' tsconfig.json >/dev/null && echo "✅ Ruta '@/lib/*' OK" || echo "⚠️ Falta ruta '@/lib/*'"
grep '"@/context/*": \["src/context/*"\]' tsconfig.json >/dev/null && echo "✅ Ruta '@/context/*' OK" || echo "⚠️ Falta ruta '@/context/*'"

# Sugerencia de reinicio
echo "🔁 Si has hecho cambios, recuerda reiniciar el servidor TypeScript:"
echo "   👉 VS Code: Cmd/Ctrl + Shift + P → 'TypeScript: Restart TS Server'"

echo "✅ Revisión de tipos finalizada."

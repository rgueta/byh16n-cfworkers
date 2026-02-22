#!/bin/bash
# clean-expired-tokens.sh - Versión corregida

NAMESPACE_ID="bd49fbf6ef30464e9241a9b21452f1cc"
PREFIX="refresh:"
DELETED=0
ACTIVE=0
TEMP_FILE="/tmp/wrangler-keys-$$.json"

echo "🔍 Obteniendo lista de tokens con prefix '$PREFIX'..."

# Guardar la salida en un archivo temporal (sin --format)
wrangler kv key list --namespace-id $NAMESPACE_ID --prefix "$PREFIX" > "$TEMP_FILE"

# Verificar si el archivo tiene contenido
if [ ! -s "$TEMP_FILE" ]; then
    echo "❌ No se obtuvieron keys o el namespace está vacío"
    rm "$TEMP_FILE"
    exit 1
fi

# Fecha actual en segundos
NOW=$(date +%s)

echo "📋 Procesando tokens..."

# Leer el archivo línea por línea (cada línea es una key en formato JSON)
while IFS= read -r line; do
    # Extraer nombre y expiración usando grep/sed (alternativa a jq)
    if [[ $line =~ \"name\":\"([^\"]+)\" ]]; then
        NAME="${BASH_REMATCH[1]}"
    else
        continue
    fi

    if [[ $line =~ \"expiration\":([0-9]+) ]]; then
        EXPIRATION="${BASH_REMATCH[1]}"
    else
        # Si no tiene expiration, probablemente ya expiró
        echo "⚠️ Token sin fecha de expiración: $NAME"
        continue
    fi

    # Mostrar información del token
    EXPIRATION_DATE=$(date -d @$EXPIRATION "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "fecha inválida")

    if [ "$EXPIRATION" -lt "$NOW" ]; then
        echo "🗑️ ELIMINANDO: $NAME"
        echo "   ⏰ Expiró: $EXPIRATION_DATE"
        wrangler kv key delete --namespace-id $NAMESPACE_ID "$NAME"
        if [ $? -eq 0 ]; then
            DELETED=$((DELETED + 1))
            echo "   ✅ Eliminado correctamente"
        else
            echo "   ❌ Error al eliminar"
        fi
    else
        echo "✅ VIGENTE: $NAME"
        echo "   ⏰ Válido hasta: $EXPIRATION_DATE"
        ACTIVE=$((ACTIVE + 1))
    fi

    echo "---"

done < "$TEMP_FILE"

# Limpiar archivo temporal
rm "$TEMP_FILE"

echo "📊 RESUMEN FINAL:"
echo "   🗑️ Tokens eliminados: $DELETED"
echo "   ✅ Tokens vigentes: $ACTIVE"
echo "   📈 Total procesados: $((DELETED + ACTIVE))"

#!/bin/bash
# clean-expired-tokens-simple.sh

NAMESPACE_ID="bd49fbf6ef30464e9241a9b21452f1cc"
PREFIX="refresh:"
NOW=$(date +%s)
DELETED=0

# Obtener keys y procesar
wrangler kv key list --namespace-id $NAMESPACE_ID --prefix "$PREFIX" | \
while read -r line; do
    if [[ $line =~ \"name\":\"([^\"]+)\".*\"expiration\":([0-9]+) ]]; then
        NAME="${BASH_REMATCH[1]}"
        EXPIRATION="${BASH_REMATCH[2]}"

        if [ "$EXPIRATION" -lt "$NOW" ]; then
            echo "Eliminando: $NAME (expiró: $(date -d @$EXPIRATION))"
            wrangler kv key delete --namespace-id $NAMESPACE_ID "$NAME"
            DELETED=$((DELETED + 1))
        fi
    fi
done

echo "✅ Eliminados: $DELETED tokens expirados"

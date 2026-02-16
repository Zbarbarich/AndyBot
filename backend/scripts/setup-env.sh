#!/usr/bin/env bash
# Copy auth-service/.env to each app service and set the correct PORT.
# Run from backend/: ./scripts/setup-env.sh

set -e
SOURCE="auth-service/.env"
if [ ! -f "$SOURCE" ]; then
  echo "Create auth-service/.env first (see auth-service/.env.example)."
  exit 1
fi

# macOS sed: sed -i '' 's/.../.../' file
case "$(uname -s)" in
  Darwin) SED_INPLACE="sed -i ''";;
  *)      SED_INPLACE="sed -i";;
esac

for pair in "customer-service:3003" "ticket-service:3004" "order-service:3005" "invoice-service:3006" "pdf-service:3007"; do
  dir="${pair%%:*}"
  port="${pair##*:}"
  cp "$SOURCE" "$dir/.env"
  $SED_INPLACE "s/^PORT=.*/PORT=$port/" "$dir/.env"
  echo "Set $dir/.env PORT=$port"
done
echo "Done. Start with: npm run dev"

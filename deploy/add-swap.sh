#!/usr/bin/env bash
# Add 2GB swap so Docker Compose parallel builds (multiple npm ci) don't OOM on small instances.
# Run once on the server before first build: sudo bash deploy/add-swap.sh
set -e
SWAP_FILE=/swapfile
SWAP_GB=2
if [[ -f "$SWAP_FILE" ]]; then
  echo "Swap file $SWAP_FILE already exists. Skipping."
  swapon --show
  exit 0
fi
echo "Creating ${SWAP_GB}G swap file (requires sudo)..."
sudo fallocate -l "${SWAP_GB}G" "$SWAP_FILE"
sudo chmod 600 "$SWAP_FILE"
sudo mkswap "$SWAP_FILE"
sudo swapon "$SWAP_FILE"
echo "Swap added. To make it permanent, add this line to /etc/fstab:"
echo "  $SWAP_FILE none swap sw 0 0"
swapon --show

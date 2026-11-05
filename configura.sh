#!/bin/sh
set -eu
cd "$(dirname "$0")"
if [ -e .env ]; then
  echo '.env esiste già: configurazione conservata.'
  exit 0
fi
umask 077
if command -v openssl >/dev/null 2>&1; then
  admin_secret=$(openssl rand -hex 24)
else
  admin_secret=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
fi
# noclobber impedisce di sovrascrivere un file creato nel frattempo.
set -C
cat > .env <<CONFIG
PUBLIC_ORIGIN=http://localhost:8080
BIND_IP=127.0.0.1
HOST_PORT=8080
ADMIN_USER=admin
ADMIN_PASSWORD=$admin_secret
CONFIG
unset admin_secret
echo 'Configurazione creata. La password amministratore è in .env. Avvia con docker compose up -d --build.'

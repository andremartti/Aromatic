#!/usr/bin/env bash
# Pruebas de integración de las funciones de servidor (Deno) contra un Postgres local.
#   PGHOST/PGPORT/PGUSER: servidor de pruebas. DENO: ruta al binario de Deno (opcional).
set -euo pipefail
cd "$(dirname "$0")/.."
PSQL="psql -v ON_ERROR_STOP=1 -q -X"
$PSQL -d postgres -c "drop database if exists aromatic_fn_test" -c "create database aromatic_fn_test"
$PSQL -d aromatic_fn_test -f tests/supabase_local_shim.sql
for f in migrations/*.sql; do $PSQL -d aromatic_fn_test -f "$f"; done
export TEST_DB_URL="postgres://${PGUSER:-postgres}@127.0.0.1:${PGPORT:-5432}/aromatic_fn_test"
"${DENO:-deno}" test --allow-net --allow-env --allow-read tests/functions_test.ts

#!/usr/bin/env bash
# Pruebas de la base de datos contra un Postgres local (no toca Supabase).
#   PGHOST/PGPORT/PGUSER apuntan a un servidor de pruebas; se crea y borra la base `aromatic_test`.
set -euo pipefail
cd "$(dirname "$0")/.."
PSQL="psql -v ON_ERROR_STOP=1 -q -X"
$PSQL -d postgres -c "drop database if exists aromatic_test" -c "create database aromatic_test"
$PSQL -d aromatic_test -f tests/supabase_local_shim.sql
for f in migrations/*.sql; do
  $PSQL -d aromatic_test -f "$f"
done
$PSQL -o /dev/null -d aromatic_test -f tests/db_test.sql

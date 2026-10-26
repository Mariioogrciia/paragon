#!/usr/bin/env bash
# Copia de seguridad de la base (20 oct 2026). La lanza cada semana el
# workflow "Copia de seguridad de la base" (.github/workflows/copia-base.yml):
# el plan gratis de Supabase no deja recuperar copias, así que sin esto un
# borrado por error se perdía para siempre.
#
#   1. pg_dump de los esquemas `public` (todas las tablas de Paragon, también
#      las que se crean solas como `aviso`) y `drizzle` (las migraciones).
#   2. Prueba de verdad: se restaura en una base vacía (PRUEBA_URL) y se
#      cuentan tablas y filas. Si la tabla de usuarios sale vacía, falla.
#   3. Se cifra con AES-256 (gpg, contraseña BACKUP_PASSPHRASE) y se borra el
#      original. Solo sale de aquí el archivo cifrado: el repo es público y
#      los artefactos de Actions los puede bajar cualquiera; lleva correos.
#
# Uso: copia-base.sh <carpeta de salida>
# Entorno:
#   BACKUP_DATABASE_URL  cadena de Supabase. Vale la misma DATABASE_URL de
#                        Vercel (pooler de transacciones, 6543): se pasa sola
#                        al de sesión (5432), que es el que admite pg_dump.
#   BACKUP_PASSPHRASE    contraseña del cifrado (20 caracteres o más).
#   PRUEBA_URL           base vacía para la prueba de restauración.
#   PG_IMAGEN            (opcional) imagen de Docker con pg_dump, p. ej.
#                        postgres:17; sin ella, los de este equipo. Tiene que
#                        ser de una versión igual o mayor que la de Supabase.
set -euo pipefail

SALIDA=${1:?Uso: copia-base.sh <carpeta de salida>}
: "${BACKUP_DATABASE_URL:?Falta BACKUP_DATABASE_URL (secreto del repo, ver docs/HANDOFF.md)}"
: "${BACKUP_PASSPHRASE:?Falta BACKUP_PASSPHRASE (secreto del repo, ver docs/HANDOFF.md)}"
: "${PRUEBA_URL:?Falta PRUEBA_URL (base vacía para probar la restauración)}"
if [ "${#BACKUP_PASSPHRASE}" -lt 20 ]; then
  echo "::error::BACKUP_PASSPHRASE es demasiado corta: mínimo 20 caracteres."
  exit 1
fi

# Pooler de transacciones (6543) → de sesión (5432), sin los parámetros que
# solo entiende el cliente de la app (pgbouncer=true...) y con SSL obligado.
ORIGEN=$(python3 - <<'PY'
import os, urllib.parse as u
p = u.urlsplit(os.environ["BACKUP_DATABASE_URL"].strip())
red = p.netloc
if (p.hostname or "").endswith("pooler.supabase.com") and p.port == 6543:
    red = red.rsplit(":", 1)[0] + ":5432"
q = [(k, v) for k, v in u.parse_qsl(p.query) if k not in ("pgbouncer", "connection_limit", "pool_timeout")]
if not any(k == "sslmode" for k, _ in q) and p.hostname not in ("localhost", "127.0.0.1"):
    q.append(("sslmode", "require"))
print(u.urlunsplit((p.scheme, red, p.path, u.urlencode(q), "")))
PY
)
# Es otra cadena distinta del secreto: que GitHub tampoco la enseñe.
[ -n "${GITHUB_ACTIONS:-}" ] && echo "::add-mask::$ORIGEN"

# pg_dump, pg_restore y psql: los del equipo o los de la imagen de Docker.
pg() {
  if [ -n "${PG_IMAGEN:-}" ]; then
    docker run --rm -i --network host "$PG_IMAGEN" "$@"
  else
    "$@"
  fi
}

mkdir -p "$SALIDA"
FECHA=$(date -u +%Y-%m-%d)
PLANO="$SALIDA/paragon-$FECHA.dump"
CIFRADO="$PLANO.gpg"
trap 'rm -f "$PLANO"' EXIT

echo "Copiando..."
pg pg_dump --format=custom --compress=9 --no-owner --no-privileges \
  --schema=public --schema=drizzle "$ORIGEN" > "$PLANO"

echo "Probando a restaurarla en una base vacía..."
# La copia trae su propio CREATE SCHEMA public: fuera el de la base de prueba.
pg psql "$PRUEBA_URL" -q -v ON_ERROR_STOP=1 -c "drop schema if exists public cascade; drop schema if exists drizzle cascade"
pg pg_restore --no-owner --no-privileges --exit-on-error --dbname="$PRUEBA_URL" < "$PLANO"
RESUMEN=$(pg psql "$PRUEBA_URL" -v ON_ERROR_STOP=1 -At -F ' ' -c "
  select count(*),
         coalesce(sum((xpath('/row/n/text()', query_to_xml(format('select count(*) as n from public.%I', table_name), false, true, '')))[1]::text::bigint), 0),
         (select count(*) from public.\"user\")
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'")
read -r TABLAS FILAS USUARIOS <<< "$RESUMEN"
# Solo números totales: el registro de Actions también es público.
echo "Restaurada: $TABLAS tablas, $FILAS filas."
if [ "$USUARIOS" -eq 0 ]; then
  echo "::error::La copia no tiene usuarios: algo va mal (¿otra base?, ¿permisos?)."
  exit 1
fi

echo "Cifrando..."
gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 0 \
  --symmetric --cipher-algo AES256 --output "$CIFRADO" "$PLANO" <<< "$BACKUP_PASSPHRASE"
rm -f "$PLANO"
echo "Lista: $(basename "$CIFRADO") ($(du -h "$CIFRADO" | cut -f1))."

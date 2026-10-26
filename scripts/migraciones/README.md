# Migraciones de la base de datos

Cambios en las tablas que se aplicaron a mano, uno por archivo, en vez de con
`npm run db:push` (el esquema de verdad está en `src/db/schema.ts`). Todos son
idempotentes y solo añaden: volver a lanzarlos no rompe nada.

Se ejecutan desde la raíz del repositorio, con la base en `.env.local`:

```bash
npx tsx scripts/migraciones/crear-tabla-clanes.mts
```

Los nombres dicen lo que hacen: `crear-tabla-*` y `crear-tablas-*` crean
tablas nuevas, `anadir-*` añaden columnas o índices, y el resto son migraciones
de datos puntuales (`migrar-multiplataforma`, `unificar-catalogo`). Las tablas
que se crean solas al arrancar (lib/esquema.ts) no necesitan nada de aquí.

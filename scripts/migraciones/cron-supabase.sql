-- Cron de sincronización cada 15 minutos DESDE SUPABASE (5 nov 2026).
--
-- Sustituye a cron-job.org (docs/HANDOFF.md, "Cron externo"): pg_cron
-- programa la tarea y pg_net hace la petición HTTPS, todo dentro de la
-- propia base, gratis y sin otra cuenta. El workflow de GitHub
-- (sync-frecuente.yml) se queda de respaldo.
--
-- Se pega entero en Supabase → SQL Editor → Run, UNA vez, después de
-- cambiar <CRON_SECRET> por el valor de CRON_SECRET de Vercel. El secreto
-- va a Supabase Vault (cifrado), no al texto de la tarea.
--
-- Comprobar: Admin → Sistema → "Cron de sincronización" tiene que decir
-- "hace pocos minutos". Ver las ejecuciones:
--   select * from cron.job_run_details order by start_time desc limit 10;
--   select * from net._http_response order by created desc limit 10;
-- Quitarlo:
--   select cron.unschedule('paragon-sync');

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Si ya existe (segunda vez que se lanza), actualizarlo en vez de duplicarlo.
do $$
begin
  if exists (select 1 from vault.secrets where name = 'paragon_cron_secret') then
    perform vault.update_secret((select id from vault.secrets where name = 'paragon_cron_secret'), '<CRON_SECRET>');
  else
    perform vault.create_secret('<CRON_SECRET>', 'paragon_cron_secret', 'CRON_SECRET de Vercel para /api/cron/sync');
  end if;
end $$;

select cron.schedule(
  'paragon-sync',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://www.paragontrophies.com/api/cron/sync',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'paragon_cron_secret')
    ),
    -- La ruta corta su propio trabajo antes de los 60 s de Vercel.
    timeout_milliseconds := 60000
  );
  $$
);

-- La foto semanal de las ligas (lunes 04:10 UTC), por si el cron de Vercel falla.
select cron.schedule(
  'paragon-league-snapshot',
  '10 4 * * 1',
  $$
  select net.http_get(
    url := 'https://www.paragontrophies.com/api/cron/league-snapshot',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'paragon_cron_secret')
    ),
    timeout_milliseconds := 30000
  );
  $$
);

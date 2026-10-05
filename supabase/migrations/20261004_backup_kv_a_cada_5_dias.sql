-- Backup automático da tabela kv_store_83358821 a cada 5 dias.
-- Um job do pg_cron roda todo dia às 03:00 e só faz a cópia se o último backup tiver mais de 5 dias.
-- Os backups ficam em public.kv_backups (os 12 mais recentes são mantidos).
-- Para restaurar: select snapshot from public.kv_backups order by created_at desc limit 1;

create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.kv_backups (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  row_count integer not null,
  snapshot jsonb not null
);
alter table public.kv_backups enable row level security;

create or replace function public.backup_kv_store_if_due()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  last_backup timestamptz;
begin
  select max(created_at) into last_backup from public.kv_backups;
  if last_backup is not null and last_backup > now() - interval '5 days' then
    return;
  end if;

  insert into public.kv_backups (row_count, snapshot)
  select count(*), coalesce(jsonb_agg(to_jsonb(k)), '[]'::jsonb)
  from public.kv_store_83358821 k;

  delete from public.kv_backups
  where id not in (select id from public.kv_backups order by created_at desc limit 12);
end;
$$;

revoke all on function public.backup_kv_store_if_due() from public, anon, authenticated;

select cron.unschedule('backup-kv-a-cada-5-dias')
where exists (select 1 from cron.job where jobname = 'backup-kv-a-cada-5-dias');

select cron.schedule('backup-kv-a-cada-5-dias', '0 3 * * *', 'select public.backup_kv_store_if_due();');

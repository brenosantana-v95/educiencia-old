-- Aulas complementares: schema, RLS e Storage.
-- Rodar uma vez no SQL Editor do projeto (ou `supabase db reset` local).

-- ---------- tabelas ----------

create table public.config (
  id int primary key default 1 check (id = 1),
  curso_disponivel boolean not null default false,
  titulo text not null default 'Aulas complementares' check (char_length(titulo) between 1 and 120),
  professor text not null default '' check (char_length(professor) <= 120),
  descricao text not null default '' check (char_length(descricao) <= 2000),
  updated_at timestamptz not null default now()
);
insert into public.config (id) values (1);

create table public.aulas (
  id uuid primary key default gen_random_uuid(),
  ordem int not null default 0,
  titulo text not null check (char_length(titulo) between 1 and 120),
  descricao text not null default '' check (char_length(descricao) <= 2000),
  duracao text not null default '' check (char_length(duracao) <= 30),
  youtube_id text check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index aulas_ordem_idx on public.aulas (ordem);

create table public.recursos (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.aulas (id) on delete cascade,
  tipo text not null check (tipo in ('link', 'material')),
  titulo text not null check (char_length(titulo) between 1 and 200),
  url text check (url ~ '^https?://' and char_length(url) <= 2000),
  storage_path text check (char_length(storage_path) <= 500),
  tamanho_bytes bigint check (tamanho_bytes >= 0),
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  constraint recurso_link_tem_url check (tipo <> 'link' or url is not null),
  constraint recurso_material_tem_arquivo check (tipo <> 'material' or storage_path is not null)
);
create index recursos_aula_idx on public.recursos (aula_id, ordem);

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- ---------- funções ----------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.curso_disponivel()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select curso_disponivel from public.config where id = 1), false);
$$;
revoke all on function public.curso_disponivel() from public;
grant execute on function public.curso_disponivel() to anon, authenticated;

create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger config_updated before update on public.config
  for each row execute function public.tocar_updated_at();
create trigger aulas_updated before update on public.aulas
  for each row execute function public.tocar_updated_at();

-- ---------- permissões e RLS ----------

alter table public.config enable row level security;
alter table public.aulas enable row level security;
alter table public.recursos enable row level security;
alter table public.admins enable row level security;

revoke all on public.config, public.aulas, public.recursos, public.admins from anon, authenticated;
grant select on public.config, public.aulas, public.recursos to anon, authenticated;
grant update on public.config to authenticated;
grant insert, update, delete on public.aulas, public.recursos to authenticated;
grant select on public.admins to authenticated;

-- config: todos leem (precisa para saber se o curso está disponível); só admin altera.
create policy config_ler on public.config for select to anon, authenticated using (true);
create policy config_admin on public.config for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- aulas e recursos: leitura só com curso disponível (admin sempre); escrita só admin.
create policy aulas_ler on public.aulas for select to anon, authenticated
  using ((select public.curso_disponivel()) or (select public.is_admin()));
create policy aulas_inserir on public.aulas for insert to authenticated
  with check ((select public.is_admin()));
create policy aulas_alterar on public.aulas for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy aulas_excluir on public.aulas for delete to authenticated
  using ((select public.is_admin()));

create policy recursos_ler on public.recursos for select to anon, authenticated
  using ((select public.curso_disponivel()) or (select public.is_admin()));
create policy recursos_inserir on public.recursos for insert to authenticated
  with check ((select public.is_admin()));
create policy recursos_alterar on public.recursos for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy recursos_excluir on public.recursos for delete to authenticated
  using ((select public.is_admin()));

-- admins: cada usuário vê só a própria linha. Inclusão só pelo SQL Editor.
create policy admins_ler on public.admins for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------- Storage ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'materiais', 'materiais', true, 52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'image/png', 'image/jpeg', 'image/webp',
    'text/plain'
  ]
)
on conflict (id) do nothing;

-- Leitura pública vem do bucket público (URL direta). Escrita só admin.
create policy materiais_admin_ler on storage.objects for select to authenticated
  using (bucket_id = 'materiais' and (select public.is_admin()));
create policy materiais_admin_inserir on storage.objects for insert to authenticated
  with check (bucket_id = 'materiais' and (select public.is_admin()));
create policy materiais_admin_alterar on storage.objects for update to authenticated
  using (bucket_id = 'materiais' and (select public.is_admin()))
  with check (bucket_id = 'materiais' and (select public.is_admin()));
create policy materiais_admin_excluir on storage.objects for delete to authenticated
  using (bucket_id = 'materiais' and (select public.is_admin()));

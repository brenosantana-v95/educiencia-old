-- Dados SÓ para o Supabase local (supabase db reset). Não rodar em produção.
-- Admin local de teste: admin@local.test / senha-local-123

update public.config
set titulo = 'Física 2º ano', professor = 'Prof. Silva',
    descricao = 'Conteúdos complementares das aulas.', curso_disponivel = true
where id = 1;

insert into public.aulas (id, ordem, titulo, descricao, duracao, youtube_id) values
  ('00000000-0000-0000-0000-0000000000a1', 1, 'Cinemática: movimento e velocidade',
   'Revisão de posição, deslocamento e velocidade média, com exemplos do dia a dia.', '12 min', 'M7lc1UVf-VE'),
  ('00000000-0000-0000-0000-0000000000a2', 2, 'Leis de Newton',
   'As três leis de Newton e como identificar forças em situações reais.', '18 min', null),
  ('00000000-0000-0000-0000-0000000000a3', 3, 'Trabalho e energia',
   'Conceito de trabalho de uma força, energia cinética e potencial.', '15 min', null);

insert into public.recursos (aula_id, tipo, titulo, url, ordem) values
  ('00000000-0000-0000-0000-0000000000a1', 'link', 'Simulador de movimento (PhET)', 'https://phet.colorado.edu/pt_BR/', 1),
  ('00000000-0000-0000-0000-0000000000a1', 'link', 'Artigo complementar', 'https://pt.wikipedia.org/wiki/Cinem%C3%A1tica', 2),
  ('00000000-0000-0000-0000-0000000000a2', 'link', 'Resumo das Leis de Newton', 'https://pt.wikipedia.org/wiki/Leis_de_Newton', 1);

-- usuário admin local
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000ad01',
  'authenticated', 'authenticated', 'admin@local.test', crypt('senha-local-123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
);
insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
values (
  gen_random_uuid(), '00000000-0000-0000-0000-00000000ad01', '00000000-0000-0000-0000-00000000ad01',
  '{"sub":"00000000-0000-0000-0000-00000000ad01","email":"admin@local.test","email_verified":true}',
  'email', now(), now(), now()
);
insert into public.admins (user_id) values ('00000000-0000-0000-0000-00000000ad01');

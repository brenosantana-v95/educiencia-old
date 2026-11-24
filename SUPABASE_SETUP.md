# Configurar o Supabase (uma vez)

Ninguém precisa passar senha para o desenvolvedor. Só a **URL do projeto** e a **chave pública** (anon/publishable).

1. Em <https://supabase.com>, crie uma conta e um projeto gratuito (região: South America, São Paulo). Guarde a senha do banco só no seu gerenciador de senhas.
2. **Authentication → Sign In / Providers → Email**: deixe ligado. Em **User Signups**, desligue **Allow new users to sign up**.
3. **Authentication → URL Configuration**:
   - Site URL: endereço do app (ex.: `https://jtsilvafilho.github.io/aulas-complementares-app/`).
   - Redirect URLs: adicione o mesmo endereço terminando em `admin.html`.
4. **SQL Editor → New query**: cole todo o arquivo `supabase/migrations/20261124000000_init.sql` e clique **Run**. Deve terminar sem erro.
5. **Authentication → Users → Add user → Send invitation**: e-mail do administrador do curso. Ele recebe um link, abre o painel e cria a própria senha.
6. **SQL Editor**, nova consulta (troque o e-mail):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'EMAIL_DO_ADMIN';
   ```
   Deve responder `INSERT 0 1`.
7. **Project Settings → API Keys**: copie a **Project URL** e a chave **publishable** (ou `anon`). Envie ao desenvolvedor, que as coloca em `pwa/config.js`.
   **Nunca** envie nem publique a chave `secret`/`service_role`.

## Limites do plano gratuito

- Arquivos: 50 MB cada, 1 GB no total (o painel avisa).
- Projeto pausa após 7 dias sem nenhum acesso. Se pausar, entre no painel do Supabase e clique **Restore**.

## Mudanças futuras no banco

Cada mudança vira um arquivo novo em `supabase/migrations/`. Rode o arquivo novo no SQL Editor, na ordem do nome.

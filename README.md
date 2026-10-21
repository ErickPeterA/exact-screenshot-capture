# Exact Screenshot Capture

Implement exactly the screenshot and nothing else

## Desenvolvimento

```sh
npm install
npm run dev
```

Configure `DATABASE_URL` from `.env.example` before using the journey.

## Banco

O banco é PostgreSQL self-hosted na VPS, configurado por `DATABASE_URL`.

O Supabase não é utilizado em runtime: a Supabase CLI é usada somente para versionar e aplicar migrations em `supabase/migrations/`. Não conecte este projeto a um projeto Supabase Cloud.

### Migrations

1. Crie uma migration em `supabase/migrations/` com o formato `YYYYMMDDHHMMSS_descricao.sql`.
2. Faça backup do banco PostgreSQL.
3. Abra o túnel SSH para a VPS.
4. Execute `npx supabase migration list --db-url "postgresql://..."`.
5. Revise `npx supabase db push --dry-run --db-url "postgresql://..."`.
6. Execute `npx supabase db push --db-url "postgresql://..."`.
7. Faça o deploy do código.

Nunca edite uma migration já aplicada.

## Produção

```sh
npm run build
npm run start
```

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

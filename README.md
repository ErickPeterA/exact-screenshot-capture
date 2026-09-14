# Exact Screenshot Capture

Implement exactly the screenshot and nothing else

## Desenvolvimento

```sh
npm install
npm run dev
```

Configure `DATABASE_URL` from `.env.example` before using the journey.

## Banco

Execute [migrations/20260911000000_initial_postgres.sql](migrations/20260911000000_initial_postgres.sql) once on PostgreSQL 17.

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

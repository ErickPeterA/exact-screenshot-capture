# Exact Screenshot Capture

Implement exactly the screenshot and nothing else

## Desenvolvimento

```sh
npm install
npm run dev
```

Configure `DATABASE_URL` from `.env.example` before using the journey or the admin area.

## Banco e primeiro administrador

Execute [migrations/20260911000000_initial_postgres.sql](migrations/20260911000000_initial_postgres.sql) once on PostgreSQL 17. Generate a bcrypt hash locally, then insert the user and its role:

```sh
node -e "import('bcryptjs').then(({hash}) => hash('uma-senha-forte', 12).then(console.log))"
```

```sql
INSERT INTO app_users (email, password_hash) VALUES ('admin@example.com', '<BCRYPT_HASH>') RETURNING id;
INSERT INTO user_roles (user_id, role) VALUES ('<ID_RETORNADO>', 'admin');
```

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

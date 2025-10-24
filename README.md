# ZenStack Reproduction Project

## Database
SQLite DB already has test data, no need to set it up.

## Server

```bash
cd server && yarn install
yarn zenstack generate
yarn dev
```

Server runs on port 3001.

## UI

```bash
cd ui && yarn install
yarn prisma:setup
yarn start
```

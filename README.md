# ZenStack Reproduction Project

## Setup

```bash
# Install dependencies
cd server && yarn install
cd ../ui && yarn install

# Setup database
cd ../server
yarn db:push
yarn db:seed

# Prisma setup
cd ../ui
yarn prisma:setup
```

## Start

```bash
# Start server (port 3001)
cd server && yarn dev

# Start UI
cd ui && yarn start
```

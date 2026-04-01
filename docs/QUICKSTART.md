# Campaign Oracle Quick Start

Get up and running in 5 minutes.

## Prerequisites

- **Node.js** 20+
- **pnpm** 8+ (`npm install -g pnpm`)
- **Docker** (for PostgreSQL and Redis)

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/your-org/campaign-oracle.git
cd campaign-oracle/campaign-oracle
pnpm install
```

### 2. Start Database Services

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port 5432
- **Redis** on port 6379

### 3. Configure Environment

```bash
# API environment
cp apps/api/.env.example apps/api/.env

# Edit apps/api/.env with required values:
# DATABASE_URL=postgresql://campaign_oracle:password@localhost:5432/campaign_oracle
# BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
# GOOGLE_CLIENT_ID=<from Google Cloud Console>
# GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
```

### 4. Run Database Migrations

```bash
cd apps/api
pnpm drizzle-kit push
```

### 5. Start Development Servers

```bash
# From project root
pnpm dev
```

This starts:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001

## Useful Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers |
| `pnpm dev:web` | Start frontend only |
| `pnpm dev:api` | Start API only |
| `pnpm build` | Build all packages |
| `pnpm stop` | Stop all dev servers |
| `pnpm restart` | Restart all dev servers |

## Demo Mode

The app includes demo data for testing without authentication. Click **"Demo"** on the login page to explore.

## Next Steps

- [Architecture Overview](../README.md)
- [API Reference](./API_REFERENCE.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Local Hosting Guide](./LOCAL_HOSTING_GUIDE.md) (self-hosting with Docker Compose)

# Leak Detector 🔍

> Identifiez en 30 secondes les éléments de votre landing page qui font fuir vos visiteurs.

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 20+
- Redis
- Supabase account
- Anthropic API key

### 1. Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the schema in SQL Editor:
   ```bash
   # Copy content from database/schema.sql
   ```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium

cp .env.example .env
# Edit .env with your values

uvicorn app.main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install

cp .env.example .env.local
# Edit .env.local with your values

npm run dev
```

### 4. Celery Worker

```bash
cd backend
celery -A app.workers.celery worker --loglevel=info
```

## Documentation

| Document | Description |
|----------|-------------|
| [context.md](./context.md) | Vision, business model, décisions |
| [CLAUDE.md](./CLAUDE.md) | Instructions Claude Code |
| [docs/SPEC.md](./docs/SPEC.md) | Spécifications fonctionnelles |
| [docs/ARCH.md](./docs/ARCH.md) | Architecture technique + DB schema |
| [docs/TASKS.md](./docs/TASKS.md) | Tâches et avancement |

## Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI + Python 3.12 |
| Frontend | Next.js 14 + TypeScript |
| Database | Supabase PostgreSQL |
| Queue | Celery + Redis |
| LLM | Claude API (Sonnet) |
| Scraping | Playwright |
| Payments | Stripe |
| Hosting | Railway (backend) + Vercel (frontend) |

## Project Structure

```
leak-detector/
├── CLAUDE.md              # Claude Code instructions
├── context.md             # Project context & business
├── README.md
├── .gitignore
│
├── docs/
│   ├── SPEC.md            # Functional specifications
│   ├── ARCH.md            # Architecture & DB schema
│   └── TASKS.md           # Task tracking
│
├── database/
│   ├── schema.sql         # Supabase schema
│   └── seed.sql           # Dev seed data
│
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # API routes
│   │   ├── services/           # Business logic
│   │   ├── workers/tasks/      # Celery tasks
│   │   └── ...
│   ├── requirements.txt
│   ├── Dockerfile
│   └── railway.toml
│
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js pages
│   │   ├── components/    # React components
│   │   └── lib/           # Utils & clients
│   ├── package.json
│   └── vercel.json
│
└── .github/
    └── workflows/
        └── ci.yml         # CI/CD pipeline
```

## Deployment

### Backend (Railway)
1. Connect repo to Railway
2. Set environment variables from `.env.example`
3. Deploy

### Frontend (Vercel)
1. Connect repo to Vercel
2. Set root directory to `frontend`
3. Set environment variables from `.env.example`
4. Deploy

## License

Proprietary - AltiDigitech

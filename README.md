# Leak Detector 🔍

> Identifiez en 30 secondes les éléments de votre landing page qui font fuir vos visiteurs.

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 20+
- Redis
- Supabase account
- Anthropic API key

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your values
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your values
npm run dev
```

### Celery Worker

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
| [docs/TASKS.md](./docs/TASKS.md) | Tâches et avancement |

## Stack

- **Backend**: FastAPI + Python 3.12
- **Frontend**: Next.js 14 + TypeScript
- **Database**: Supabase PostgreSQL
- **Queue**: Celery + Redis
- **LLM**: Claude API (Sonnet)
- **Scraping**: Playwright
- **Hosting**: Railway (backend) + Vercel (frontend)

## Project Structure

```
leak-detector/
├── CLAUDE.md           # Claude Code instructions
├── context.md          # Project context
├── docs/               # Documentation
│   ├── SPEC.md        # Functional specs
│   └── TASKS.md       # Task tracking
├── backend/            # FastAPI backend
└── frontend/           # Next.js frontend
```

## License

Proprietary - AltiDigitech

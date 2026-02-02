# SaaS Templates 🚀

> Boilerplate complet pour lancer un SaaS en 2 semaines.

## Contenu

| Dossier | Description |
|---------|-------------|
| `docs-templates/` | 18 templates de documentation |
| `backend-starter/` | FastAPI + Celery + Supabase |
| `frontend-starter/` | Next.js 14 + TypeScript + Tailwind |
| `legal-templates/` | CGU + Privacy (FR/EN) |
| `stripe-templates/` | Webhooks + guide setup |
| `deploy-configs/` | Vercel, Railway, GitHub Actions |

## Quick Start

### Option 1 : Script automatique

```bash
chmod +x scripts/new-project.sh
./scripts/new-project.sh mon-projet
cd mon-projet
```

### Option 2 : Manuel

1. Copier les dossiers `backend-starter/` et `frontend-starter/`
2. Renommer les `.template.md` en `.md` dans `docs-templates/`
3. Configurer les `.env` files

## Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI + Python 3.12 |
| Frontend | Next.js 14 + TypeScript |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Queue | Celery + Redis |
| Payments | Stripe |
| Deploy | Railway + Vercel |

## Templates Documentation

| Template | Usage |
|----------|-------|
| CLAUDE.md | Instructions pour Claude Code |
| context.md | Vision, personas, business model |
| SPEC.md | Spécifications fonctionnelles |
| ARCH.md | Architecture technique + DB schema |
| UI.md | Design system, composants |
| COPY.md | Tous les textes de l'app |
| ERRORS.md | Catalogue des erreurs |
| SECURITY.md | Checklist sécurité |
| TESTS.md | Stratégie de tests |
| DEPLOY.md | Configuration déploiement |
| ANALYTICS.md | Events tracking |
| MONITORING.md | Alertes et runbooks |
| MIGRATIONS.md | Stratégie migrations DB |
| BACKUP.md | Backup et restore |
| API.md | Documentation API |
| TASKS.md | Gestion des tâches |
| CHANGELOG.md | Historique versions |
| ROADMAP.md | Évolutions futures |

## Structure Projet Généré

```
mon-projet/
├── CLAUDE.md
├── context.md
├── README.md
├── docs/
│   ├── SPEC.md
│   ├── ARCH.md
│   └── ...
├── backend/
│   ├── app/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
└── .github/
    └── workflows/
```

## License

MIT - AltiDigitech

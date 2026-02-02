# Déploiement — Leak Detector

> Configuration et procédures de déploiement.

---

## Architecture de Déploiement
```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCTION                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Vercel     │    │   Railway    │    │   Supabase   │      │
│  │  (Frontend)  │    │  (Backend)   │    │  (Database)  │      │
│  │              │    │              │    │              │      │
│  │ leakdetector │    │ api.leak     │    │ PostgreSQL   │      │
│  │ .io          │    │ detector.io  │    │ Auth         │      │
│  │              │    │              │    │ Storage      │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             │                                    │
│                    ┌────────┴────────┐                          │
│                    │     Redis       │                          │
│                    │   (Railway)     │                          │
│                    └─────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Environnements

| Env | Frontend URL | Backend URL | Branch |
|-----|--------------|-------------|--------|
| Production | leakdetector.io | api.leakdetector.io | main |
| Staging | staging.leakdetector.io | api-staging.leakdetector.io | develop |
| Development | localhost:3000 | localhost:8000 | feature/* |

---

## Supabase Setup

### 1. Créer le projet

1. Aller sur [supabase.com](https://supabase.com)
2. New Project → Nom: `leak-detector-prod`
3. Région: `eu-west-1` (Paris)
4. Générer un password DB fort

### 2. Exécuter le schéma

1. SQL Editor → New Query
2. Copier/coller `database/schema.sql`
3. Run

### 3. Configurer l'Auth

1. Authentication → Providers
2. Activer Email
3. Activer Google OAuth :
   - Client ID: depuis Google Cloud Console
   - Client Secret: depuis Google Cloud Console
   - Redirect URL: `https://xxx.supabase.co/auth/v1/callback`

### 4. Configurer le Storage

1. Storage → New Bucket
2. Créer `screenshots` (public)
3. Créer `exports` (private)

### 5. Récupérer les clés

- Settings → API
- Copier : `URL`, `anon key`, `service_role key`

---

## Railway Setup (Backend)

### 1. Créer le projet

1. [railway.app](https://railway.app) → New Project
2. Deploy from GitHub repo
3. Sélectionner le repo `leak-detector`
4. Root directory: `backend`

### 2. Ajouter Redis

1. New → Database → Redis
2. Copier `REDIS_URL`

### 3. Variables d'environnement
```bash
# App
APP_NAME=LeakDetector
APP_ENV=production
APP_DEBUG=false
APP_SECRET_KEY=<générer avec: openssl rand -hex 32>

# URLs
FRONTEND_URL=https://leakdetector.io
BACKEND_URL=https://api.leakdetector.io

# CORS
CORS_ORIGINS=https://leakdetector.io,https://www.leakdetector.io

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Redis
REDIS_URL=redis://default:xxx@xxx.railway.app:6379

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_AGENCY_MONTHLY=price_xxx

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### 4. Configurer le domaine

1. Settings → Domains
2. Add custom domain: `api.leakdetector.io`
3. Configurer DNS (CNAME)

### 5. Configurer le worker Celery

Option A : Même service (petit volume)
```toml
# railway.toml
[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT & celery -A app.workers.celery worker --loglevel=info"
```

Option B : Service séparé (recommandé)
1. New → Empty Service
2. Root directory: `backend`
3. Start command: `celery -A app.workers.celery worker --loglevel=info`
4. Mêmes variables d'environnement

---

## Vercel Setup (Frontend)

### 1. Importer le projet

1. [vercel.com](https://vercel.com) → Add New Project
2. Import Git Repository
3. Root Directory: `frontend`
4. Framework: Next.js

### 2. Variables d'environnement
```bash
NEXT_PUBLIC_APP_NAME=LeakDetector
NEXT_PUBLIC_APP_URL=https://leakdetector.io
NEXT_PUBLIC_API_URL=https://api.leakdetector.io
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### 3. Configurer le domaine

1. Settings → Domains
2. Add: `leakdetector.io`
3. Add: `www.leakdetector.io` (redirect to apex)
4. Configurer DNS

---

## Stripe Setup

### 1. Créer les produits

1. Dashboard → Products → Add Product
2. **Pro Plan**
   - Name: Leak Detector Pro
   - Price: €29/month, recurring
   - Copier le `price_id`
3. **Agency Plan**
   - Name: Leak Detector Agency
   - Price: €99/month, recurring
   - Copier le `price_id`

### 2. Configurer le webhook

1. Developers → Webhooks → Add Endpoint
2. URL: `https://api.leakdetector.io/api/v1/webhooks/stripe`
3. Events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copier le `webhook secret`

### 3. Configurer le Customer Portal

1. Settings → Billing → Customer Portal
2. Activer: Update payment method, Cancel subscription
3. Business info: Leak Detector, support@leakdetector.io

---

## DNS Configuration

### Domaine principal (leakdetector.io)

| Type | Name | Value |
|------|------|-------|
| A | @ | 76.76.21.21 (Vercel) |
| CNAME | www | cname.vercel-dns.com |
| CNAME | api | xxx.up.railway.app |

### Vérification
```bash
# Vérifier la propagation
dig leakdetector.io
dig api.leakdetector.io
dig www.leakdetector.io
```

---

## CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # Tests (voir ci.yml existant)
  
  deploy-backend:
    needs: [backend-test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: leak-detector-api

  deploy-frontend:
    needs: [frontend-test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: frontend
          vercel-args: '--prod'
```

### Secrets GitHub

| Secret | Source |
|--------|--------|
| RAILWAY_TOKEN | Railway → Account Settings → Tokens |
| VERCEL_TOKEN | Vercel → Settings → Tokens |
| VERCEL_ORG_ID | Vercel → Settings → General |
| VERCEL_PROJECT_ID | Vercel → Project Settings |

---

## Procédure de Déploiement

### Déploiement standard (feature → main)
```bash
# 1. Créer PR
git checkout -b feature/my-feature
git commit -m "feat: my feature"
git push origin feature/my-feature
# Créer PR sur GitHub

# 2. Review & Merge
# - CI passe ✅
# - Code review ✅
# - Merge to main

# 3. Auto-deploy
# - Railway détecte le push
# - Vercel détecte le push
# - Déploiement automatique
```

### Déploiement manuel (si nécessaire)
```bash
# Backend
railway up --service leak-detector-api

# Frontend
vercel --prod
```

### Rollback
```bash
# Railway
railway rollback --service leak-detector-api

# Vercel
vercel rollback
```

---

## Health Checks

### Backend
```bash
curl https://api.leakdetector.io/health
# {"status": "healthy", "service": "leak-detector-api"}
```

### Frontend
```bash
curl -I https://leakdetector.io
# HTTP/2 200
```

### Monitoring URLs

| Service | URL |
|---------|-----|
| Railway Dashboard | railway.app/project/xxx |
| Vercel Dashboard | vercel.com/xxx/leak-detector |
| Supabase Dashboard | app.supabase.com/project/xxx |
| Stripe Dashboard | dashboard.stripe.com |
| Sentry Dashboard | sentry.io/xxx |

---

## Checklist Pre-Production

### Infrastructure

- [ ] Supabase projet créé
- [ ] Railway projet créé
- [ ] Vercel projet créé
- [ ] Redis provisionné
- [ ] Domaines configurés
- [ ] SSL actif partout

### Configuration

- [ ] Toutes les env vars définies (prod)
- [ ] Stripe produits créés
- [ ] Stripe webhook configuré
- [ ] Supabase Auth configuré
- [ ] Supabase Storage buckets créés

### Sécurité

- [ ] `APP_DEBUG=false`
- [ ] CORS restreint aux domaines prod
- [ ] Rate limiting actif
- [ ] Sentry configuré

### Tests

- [ ] Flow signup → analyse → rapport OK
- [ ] Flow paiement OK (test mode)
- [ ] Webhooks Stripe OK
- [ ] Emails transactionnels OK

---

## Coûts Estimés

| Service | Plan | Coût/mois |
|---------|------|-----------|
| Railway (Backend) | Starter | ~$5-20 |
| Railway (Redis) | Starter | ~$5 |
| Vercel (Frontend) | Pro | $20 |
| Supabase | Pro | $25 |
| Anthropic | Pay-as-you-go | ~$10-50 |
| Stripe | 2.9% + €0.25/tx | Variable |
| Domain | Annual | ~$15/year |
| **Total** | | **~$65-120/mois** |

---

## Contacts Support

| Service | Support |
|---------|---------|
| Railway | support@railway.app |
| Vercel | support@vercel.com |
| Supabase | support@supabase.io |
| Stripe | support.stripe.com |
| Anthropic | support@anthropic.com |

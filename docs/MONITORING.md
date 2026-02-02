# Monitoring & Alertes — Leak Detector

> Observabilité, alertes, et procédures de résolution.

---

## Stack Monitoring

| Outil | Rôle |
|-------|------|
| Sentry | Error tracking, performance |
| Railway Metrics | CPU, RAM, réseau |
| Supabase Dashboard | DB connections, queries |
| Stripe Dashboard | Paiements, webhooks |
| LangSmith | LLM latency, cost, quality |
| structlog | Logs applicatifs |
| UptimeRobot | Uptime monitoring |

---

## Health Checks

### Endpoints

| URL | Méthode | Fréquence | Timeout |
|-----|---------|-----------|---------|
| `GET /health` | HTTP | 30s | 5s |
| `GET /health/deep` | HTTP | 5min | 10s |

### Health Check Simple
```python
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "leak-detector-api"}
```

### Health Check Profond
```python
@app.get("/health/deep")
async def health_deep():
    checks = {}
    
    # Supabase
    try:
        supabase.table("profiles").select("id").limit(1).execute()
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {str(e)}"
    
    # Redis
    try:
        redis_client.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {str(e)}"
    
    # Celery
    try:
        inspect = celery_app.control.inspect()
        active = inspect.active()
        checks["celery"] = "ok" if active else "no workers"
    except Exception as e:
        checks["celery"] = f"error: {str(e)}"
    
    status = "healthy" if all(v == "ok" for v in checks.values()) else "degraded"
    
    return {
        "status": status,
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat(),
    }
```

---

## Métriques Clés

### Application

| Métrique | Source | Seuil Warning | Seuil Critical |
|----------|--------|---------------|----------------|
| API Latency p50 | Sentry | >500ms | >2s |
| API Latency p95 | Sentry | >2s | >5s |
| API Latency p99 | Sentry | >5s | >10s |
| Error Rate | Sentry | >1% | >5% |
| Analysis Duration | Logs | >45s | >60s |
| Analysis Success Rate | Logs | <95% | <90% |

### Infrastructure

| Métrique | Source | Seuil Warning | Seuil Critical |
|----------|--------|---------------|----------------|
| CPU Usage | Railway | >70% | >90% |
| RAM Usage | Railway | >75% | >90% |
| Disk Usage | Railway | >70% | >85% |
| Redis Memory | Railway | >75% | >90% |
| Redis Connections | Railway | >80 | >100 |

### Database

| Métrique | Source | Seuil Warning | Seuil Critical |
|----------|--------|---------------|----------------|
| Active Connections | Supabase | >80% pool | >95% pool |
| Query Time p95 | Supabase | >100ms | >500ms |
| DB Size | Supabase | >80% limit | >90% limit |
| Replication Lag | Supabase | >1s | >5s |

### Queue (Celery)

| Métrique | Source | Seuil Warning | Seuil Critical |
|----------|--------|---------------|----------------|
| Queue Length | Redis | >20 | >50 |
| Task Latency | Logs | >30s wait | >60s wait |
| Failed Tasks/hour | Logs | >5 | >10 |
| Worker Count | Celery inspect | <2 | 0 |

### External Services

| Métrique | Source | Seuil Warning | Seuil Critical |
|----------|--------|---------------|----------------|
| Claude API Latency | LangSmith | >5s | >15s |
| Claude API Error Rate | LangSmith | >2% | >5% |
| Claude API Cost/day | LangSmith | >$20 | >$50 |
| Stripe Webhook Failures | Stripe | >1% | >5% |

---

## Alertes

### Configuration des Alertes

| Priorité | Canal | Temps de réponse | Escalation |
|----------|-------|------------------|------------|
| P1 Critical | SMS + Email | < 15 min | Immédiate |
| P2 High | Email + Slack | < 1 heure | 1h si pas ack |
| P3 Medium | Slack | < 4 heures | Batch quotidien |
| P4 Low | Dashboard | Next business day | Aucune |

### Alertes P1 (Critical)

| Alerte | Condition | Action |
|--------|-----------|--------|
| API Down | Health check fail >2min | Voir Runbook: API Down |
| DB Down | Deep health fail on DB | Voir Runbook: DB Down |
| Redis Down | Deep health fail on Redis | Voir Runbook: Redis Down |
| Error Rate Spike | >5% errors sur 5min | Voir Runbook: Error Spike |
| All Workers Dead | 0 Celery workers | Voir Runbook: Workers Down |

### Alertes P2 (High)

| Alerte | Condition | Action |
|--------|-----------|--------|
| High Latency | p95 >5s sur 10min | Check infra, scale up |
| Analysis Failures | >10% failures sur 1h | Check Claude API, Playwright |
| Stripe Webhook Fail | >3 failures consécutives | Check endpoint, secret |
| Queue Backup | >50 tasks pending | Scale workers |
| Claude API Cost | >$50/jour | Check usage anomalies |

### Alertes P3 (Medium)

| Alerte | Condition | Action |
|--------|-----------|--------|
| High Memory | RAM >75% | Monitor, plan scale |
| Disk Space | >70% | Cleanup old data |
| Slow Queries | p95 >100ms | Optimize queries |
| Certificate Expiry | <14 days | Renew SSL |
| Dependency Vuln | High severity | Plan update |

---

## Runbooks

### Runbook: API Down

**Symptôme:** Health check échoue, 5xx sur toutes les requêtes.
```
1. VÉRIFIER le status Railway
   → railway.app → Project → Service status
   → Si "Deploying" : attendre
   → Si "Failed" : rollback immédiat

2. VÉRIFIER les logs
   → railway logs --service leak-detector-api
   → Chercher : OOM, crash, exception fatale

3. REDÉMARRER le service
   → Railway Dashboard → Restart
   → Attendre 60s, revérifier /health

4. SI OOM :
   → Augmenter RAM dans Railway settings
   → Identifier le memory leak (Sentry)

5. SI crash loop :
   → Rollback au deploy précédent
   → Analyser les logs du deploy failed

6. SI persiste >15min :
   → Contacter Railway support
   → Mettre page de maintenance
```

### Runbook: DB Down

**Symptôme:** /health/deep retourne database error.
```
1. VÉRIFIER Supabase status
   → status.supabase.com
   → Si incident en cours : attendre

2. VÉRIFIER les connexions
   → Supabase Dashboard → Database → Connections
   → Si pool exhausted : restart backend

3. VÉRIFIER l'espace disque
   → Supabase Dashboard → Database → Size
   → Si >90% : cleanup vieilles données

4. TESTER la connectivité
   → Depuis Railway : psql $DATABASE_URL
   → Si timeout : problème réseau

5. SI persiste :
   → Contacter Supabase support
   → Activer mode maintenance
```

### Runbook: Redis Down

**Symptôme:** /health/deep retourne redis error. Celery workers stoppés.
```
1. VÉRIFIER Redis sur Railway
   → Dashboard → Redis service status

2. VÉRIFIER la mémoire Redis
   → Si >90% : FLUSHDB (attention: perte des tasks en queue)

3. REDÉMARRER Redis
   → Railway Dashboard → Restart Redis

4. REDÉMARRER les workers Celery
   → Railway Dashboard → Restart Celery service

5. VÉRIFIER la reprise
   → Les analyses en cours seront retried automatiquement
   → Vérifier qu'il n'y a pas de tasks stuck
```

### Runbook: Error Spike

**Symptôme:** Error rate >5% sur 5min.
```
1. IDENTIFIER le type d'erreur
   → Sentry → Issues → Sort by frequency
   → Regrouper par endpoint

2. SI erreur Claude API :
   → Vérifier status.anthropic.com
   → Vérifier rate limits (LangSmith)
   → Si down : activer fallback message

3. SI erreur Playwright/Scraping :
   → Vérifier si c'est un domaine spécifique
   → Vérifier les resources (CPU/RAM)
   → Augmenter timeout si nécessaire

4. SI erreur Supabase :
   → Voir Runbook: DB Down

5. SI erreur code :
   → Identifier le commit responsable
   → Rollback si nécessaire
   → Hotfix sur branch main
```

### Runbook: Workers Down

**Symptôme:** 0 Celery workers, analyses bloquées en "pending".
```
1. VÉRIFIER le service worker
   → Railway Dashboard → Worker service status

2. VÉRIFIER les logs
   → railway logs --service leak-detector-worker
   → Chercher : connection refused (Redis), OOM

3. REDÉMARRER
   → Railway Dashboard → Restart

4. SI Redis problem :
   → Voir Runbook: Redis Down

5. TRAITER les analyses bloquées
   → Les tasks avec acks_late seront retried
   → Vérifier queue length après restart
   → Si analyses stuck >5min en "processing" :
     → Marquer comme "failed" manuellement
     → Rembourser le quota aux users
```

---

## Sentry Configuration

### Setup Backend
```python
# app/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.celery import CeleryIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    environment=settings.APP_ENV,
    traces_sample_rate=0.1,  # 10% des transactions
    profiles_sample_rate=0.1,
    integrations=[
        FastApiIntegration(),
        CeleryIntegration(),
    ],
    before_send=filter_sensitive_data,
)

def filter_sensitive_data(event, hint):
    """Remove sensitive data before sending to Sentry."""
    if "request" in event and "headers" in event["request"]:
        headers = event["request"]["headers"]
        if "Authorization" in headers:
            headers["Authorization"] = "[FILTERED]"
    return event
```

### Setup Frontend
```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### Règles d'Alertes Sentry

| Règle | Condition | Action |
|-------|-----------|--------|
| New Issue | Nouvelle erreur jamais vue | Email immédiat |
| Regression | Issue résolue qui revient | Email + Slack |
| Spike | >10 occurrences en 1h | Slack P2 |
| Critical Error | 5xx >5% | SMS P1 |

---

## Logs

### Format
```json
{
  "timestamp": "2026-02-02T10:00:00Z",
  "level": "INFO",
  "event": "analysis_completed",
  "logger": "app.workers.tasks.analyze",
  "user_id": "uuid",
  "analysis_id": "uuid",
  "score": 72,
  "duration_ms": 23400
}
```

### Niveaux

| Niveau | Usage |
|--------|-------|
| DEBUG | Dev only, détails techniques |
| INFO | Events business, flow normal |
| WARNING | Situation anormale mais gérée |
| ERROR | Erreur nécessitant attention |
| CRITICAL | Service down, intervention immédiate |

### Recherche de Logs
```bash
# Railway CLI
railway logs --service leak-detector-api

# Filtrer par niveau
railway logs | grep "ERROR"

# Filtrer par analysis_id
railway logs | grep "analysis_id=xxx"
```

---

## UptimeRobot

### Monitors

| Monitor | URL | Intervalle | Alert |
|---------|-----|------------|-------|
| API Health | https://api.leakdetector.io/health | 30s | SMS + Email |
| Frontend | https://leakdetector.io | 60s | Email |
| Supabase | https://xxx.supabase.co/rest/v1/ | 60s | Email |

### Status Page

URL publique : status.leakdetector.io (optionnel)

---

## Revue Hebdomadaire

### Checklist

- [ ] Error rate de la semaine (<1%)
- [ ] Latence p95 (<2s)
- [ ] Analysis success rate (>95%)
- [ ] Uptime (>99.9%)
- [ ] Claude API costs (dans le budget)
- [ ] Queue backup events (0)
- [ ] Nouvelles vulnérabilités (npm audit, pip audit)
- [ ] Disk/RAM trends (pas de fuite)

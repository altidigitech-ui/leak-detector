# Analytics & Tracking — Leak Detector

> Events tracking, métriques business, et instrumentation.

---

## Stack Analytics

| Outil | Usage |
|-------|-------|
| PostHog / Mixpanel | Product analytics |
| Stripe Dashboard | Revenue metrics |
| Supabase Dashboard | DB metrics |
| Sentry | Error tracking |
| LangSmith | LLM monitoring |
| Custom logs | Business events |

---

## Events Tracking

### Convention de nommage

Format : `object_action` en snake_case
```
page_viewed
analysis_created
report_viewed
plan_upgraded
```

---

## Events par Page

### Landing Page

| Event | Trigger | Properties |
|-------|---------|------------|
| landing_viewed | Page load | `{ source, utm_source, utm_medium, utm_campaign }` |
| cta_clicked | Click CTA hero | `{ cta_text, position }` |
| features_scrolled | Scroll to features | `{ scroll_depth }` |
| how_it_works_viewed | Scroll to section | `{}` |
| footer_link_clicked | Click footer link | `{ link_name, link_url }` |

### Auth

| Event | Trigger | Properties |
|-------|---------|------------|
| signup_started | Open register page | `{ source }` |
| signup_completed | Account created | `{ method: "email" \| "google" }` |
| signup_failed | Error on register | `{ error_code }` |
| login_started | Open login page | `{ source }` |
| login_completed | Successful login | `{ method }` |
| login_failed | Error on login | `{ error_code }` |
| logout | User logs out | `{}` |
| password_reset_requested | Click forgot password | `{}` |

### Dashboard

| Event | Trigger | Properties |
|-------|---------|------------|
| dashboard_viewed | Page load | `{ analyses_count, avg_score }` |
| new_analysis_clicked | Click "+ New Analysis" | `{ source: "dashboard" }` |
| report_clicked | Click report in list | `{ report_id, score }` |

### Analyze

| Event | Trigger | Properties |
|-------|---------|------------|
| analyze_page_viewed | Page load | `{}` |
| analysis_submitted | Submit URL | `{ url_domain }` |
| analysis_started | Processing begins | `{ analysis_id }` |
| analysis_progress | Status change | `{ analysis_id, status, elapsed_ms }` |
| analysis_completed | Report ready | `{ analysis_id, score, duration_ms }` |
| analysis_failed | Error | `{ analysis_id, error_code, duration_ms }` |
| quota_exceeded_shown | Quota error displayed | `{ plan, limit }` |

### Reports

| Event | Trigger | Properties |
|-------|---------|------------|
| reports_list_viewed | Page load | `{ count }` |
| report_viewed | Open report | `{ report_id, score, url_domain }` |
| report_category_expanded | Expand category | `{ category, score }` |
| report_issue_viewed | View issue details | `{ severity, category }` |
| report_shared | Share report | `{ method }` |
| report_exported | Export PDF | `{ report_id }` |

### Pricing

| Event | Trigger | Properties |
|-------|---------|------------|
| pricing_viewed | Page load | `{ source, current_plan }` |
| plan_selected | Click plan CTA | `{ plan, price }` |
| faq_expanded | Click FAQ item | `{ question }` |

### Billing

| Event | Trigger | Properties |
|-------|---------|------------|
| checkout_started | Redirect to Stripe | `{ plan, price }` |
| checkout_completed | Return from Stripe success | `{ plan }` |
| checkout_canceled | Return from Stripe cancel | `{ plan }` |
| portal_opened | Open billing portal | `{}` |
| plan_upgraded | Webhook confirmed | `{ from_plan, to_plan }` |
| plan_downgraded | Webhook confirmed | `{ from_plan, to_plan }` |
| plan_canceled | Subscription canceled | `{ plan, reason }` |
| payment_failed | Invoice failed | `{ plan }` |

### Settings

| Event | Trigger | Properties |
|-------|---------|------------|
| settings_viewed | Page load | `{}` |
| profile_updated | Save changes | `{ fields_changed }` |
| upgrade_clicked | Click upgrade from settings | `{ current_plan }` |

---

## Métriques Business (KPIs)

### Acquisition

| Métrique | Calcul | Cible |
|----------|--------|-------|
| Visitors | Unique visitors/jour | Track |
| Signups | Comptes créés/jour | 10/jour |
| Signup Rate | Signups / Visitors | >5% |
| Source | UTM attribution | Track |

### Activation

| Métrique | Calcul | Cible |
|----------|--------|-------|
| First Analysis | Users qui lancent 1ère analyse / Signups | >60% |
| Time to First Analysis | Temps signup → 1ère analyse | <5min |
| First Report Viewed | Users qui voient 1er rapport / Signups | >50% |

### Engagement

| Métrique | Calcul | Cible |
|----------|--------|-------|
| DAU/MAU | Daily Active / Monthly Active | >20% |
| Analyses/User/Mois | Moyenne analyses par user actif | >3 |
| Report Views | Vues rapports / analyses | >1.5 |

### Revenue

| Métrique | Calcul | Cible |
|----------|--------|-------|
| MRR | Monthly Recurring Revenue | Track |
| ARPU | Revenue / Active Users | >€5 |
| Conversion Free→Paid | Paid users / Total users | >5% |
| Churn Rate | Canceled / Active subs, mensuel | <5% |
| LTV | ARPU / Churn Rate | >€100 |

### Retention

| Métrique | Calcul | Cible |
|----------|--------|-------|
| D1 Retention | Users actifs J+1 / Signups | >30% |
| D7 Retention | Users actifs J+7 / Signups | >15% |
| D30 Retention | Users actifs J+30 / Signups | >10% |
| Monthly Retention | Users actifs M+1 / Users actifs M | >60% |

---

## Funnel Principal
```
Visitor → Landing Page
    ↓ (CTA click)
Register Page
    ↓ (signup)
Dashboard
    ↓ (new analysis)
Analyze Page
    ↓ (submit URL)
Processing
    ↓ (complete)
Report Page
    ↓ (hit quota)
Pricing Page
    ↓ (select plan)
Checkout
    ↓ (payment)
Paying Customer
```

### Funnel Metrics

| Step | Target Conversion |
|------|-------------------|
| Landing → Register | >10% |
| Register → Signup | >50% |
| Signup → First Analysis | >60% |
| First Analysis → View Report | >90% |
| View Report → Hit Quota | >40% |
| Hit Quota → View Pricing | >50% |
| View Pricing → Checkout | >15% |
| Checkout → Payment | >70% |
| **Landing → Paid** | **>0.5%** |

---

## Implementation Frontend

### Tracking Wrapper
```typescript
// src/lib/analytics.ts

type EventProperties = Record<string, string | number | boolean>;

class Analytics {
  track(event: string, properties?: EventProperties) {
    // PostHog
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture(event, properties);
    }
    
    // Console en dev
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] ${event}`, properties);
    }
  }

  identify(userId: string, traits?: Record<string, any>) {
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.identify(userId, traits);
    }
  }

  page(name: string, properties?: EventProperties) {
    this.track('page_viewed', { page_name: name, ...properties });
  }

  reset() {
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.reset();
    }
  }
}

export const analytics = new Analytics();
```

### Usage
```typescript
// Sur signup
analytics.identify(user.id, {
  email: user.email,
  plan: 'free',
});
analytics.track('signup_completed', { method: 'email' });

// Sur analyse
analytics.track('analysis_submitted', { url_domain: 'example.com' });

// Sur upgrade
analytics.track('plan_upgraded', { from_plan: 'free', to_plan: 'pro' });
```

---

## Implementation Backend

### Logging Structuré
```python
# Les events business sont loggés avec structlog
logger.info(
    "analysis_completed",
    user_id=user_id,
    analysis_id=analysis_id,
    score=score,
    duration_ms=duration_ms,
    url_domain=domain,
)

logger.info(
    "plan_upgraded",
    user_id=user_id,
    from_plan="free",
    to_plan="pro",
)
```

### LangSmith (LLM Monitoring)
```python
# Déjà intégré via Anthropic SDK
# Métriques trackées :
# - Latence par appel
# - Tokens utilisés (input/output)
# - Coût par analyse
# - Taux d'erreur
# - Qualité des réponses (sampling)
```

---

## Dashboards

### Dashboard Opérationnel (quotidien)

- Analyses lancées (total, par statut)
- Temps moyen d'analyse
- Taux d'erreur
- Signups
- Revenue du jour

### Dashboard Business (hebdo)

- MRR et croissance
- Funnel de conversion
- Retention cohorts
- Top erreurs
- Feature usage

### Dashboard Technique (real-time)

- Latence API (p50, p95, p99)
- Error rate
- Queue length (Celery)
- Claude API usage & costs
- Redis memory

---

## Alertes Analytics

| Alerte | Condition | Priorité |
|--------|-----------|----------|
| Signups drop | <50% de la moyenne 7j | P2 |
| Conversion drop | Free→Paid <2% sur 7j | P2 |
| Analysis failure spike | >10% d'échecs sur 1h | P1 |
| Revenue anomaly | MRR drop >5% | P1 |
| Churn spike | >10% de churn mensuel | P2 |

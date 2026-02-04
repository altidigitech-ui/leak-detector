# Sécurité — Leak Detector

> Politiques de sécurité, authentification, et bonnes pratiques.

---

## Vue d'ensemble

| Domaine | Solution |
|---------|----------|
| Authentification | Supabase Auth (JWT) |
| Autorisation | Row Level Security (RLS) |
| Secrets | Variables d'environnement |
| HTTPS | Forcé partout |
| Paiements | Stripe (PCI compliant) |
| Monitoring | Sentry + logs structurés |

---

## Authentification

### Supabase Auth

- **Méthodes supportées :**
  - Email/password
  - Google OAuth
  - Magic links (optionnel)

- **JWT Tokens :**
  - Access token : 1 heure
  - Refresh token : 7 jours
  - Stockage : httpOnly cookies (SSR)

### Flow d'authentification
```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │────▶│ Supabase │────▶│  Backend │
└──────────┘     └──────────┘     └──────────┘
     │                │                │
     │ 1. Login       │                │
     │───────────────▶│                │
     │                │                │
     │ 2. JWT Token   │                │
     │◀───────────────│                │
     │                │                │
     │ 3. API Call + Bearer Token      │
     │────────────────────────────────▶│
     │                │                │
     │                │ 4. Verify JWT  │
     │                │◀───────────────│
     │                │                │
     │ 5. Response    │                │
     │◀────────────────────────────────│
```

### Validation Backend
```python
# Chaque requête authentifiée
async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    token = credentials.credentials
    payload = verify_supabase_token(token)
    return payload["sub"]  # user_id
```

---

## Autorisation

### Row Level Security (RLS)

Toutes les tables ont RLS activé. Les utilisateurs ne peuvent accéder qu'à leurs propres données.
```sql
-- Exemple : analyses
CREATE POLICY "Users can view own analyses"
    ON analyses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own analyses"
    ON analyses FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

### Matrice des permissions

| Resource | Anonymous | Free | Pro | Agency |
|----------|-----------|------|-----|--------|
| Analyses (read own) | ❌ | ✅ | ✅ | ✅ |
| Analyses (create) | ❌ | ✅ (3/mois) | ✅ (50/mois) | ✅ (200/mois) |
| Reports (read own) | ❌ | ✅ | ✅ | ✅ |
| Reports (export PDF) | ❌ | ❌ | ✅ | ✅ |
| API access | ❌ | ❌ | ❌ | ✅ |

### Vérification des quotas
```python
# Avant chaque analyse
if profile["analyses_used"] >= profile["analyses_limit"]:
    raise QuotaExceededError(
        limit=profile["analyses_limit"],
        plan=profile["plan"],
    )
```

---

## Protection des API

### Rate Limiting

| Endpoint | Limite | Fenêtre |
|----------|--------|---------|
| POST /analyses | 10 | 1 minute |
| GET /reports | 60 | 1 minute |
| POST /billing/* | 5 | 1 minute |
| POST /webhooks/* | 100 | 1 minute |
| Global par IP | 1000 | 1 minute |
```python
# Implementation avec Redis
from fastapi_limiter import RateLimiter

@router.post("/analyses")
@limiter.limit("10/minute")
async def create_analysis(...):
    pass
```

### Headers de sécurité
```python
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
}
```

### CORS
```python
CORS_ORIGINS = [
    "https://leakdetector.tech",
    "https://www.leakdetector.tech",
    "https://staging.leakdetector.tech",
]

# Dev only
if settings.APP_ENV == "development":
    CORS_ORIGINS.append("http://localhost:3000")
```

---

## Gestion des Secrets

### Règles absolues

1. **JAMAIS** de secrets dans le code
2. **JAMAIS** de secrets dans les logs
3. **JAMAIS** de commit de fichiers `.env`

### Variables d'environnement

| Secret | Où | Rotation |
|--------|-----|----------|
| SUPABASE_SERVICE_KEY | Railway/Vercel | 90 jours |
| ANTHROPIC_API_KEY | Railway | 90 jours |
| STRIPE_SECRET_KEY | Railway | Sur compromission |
| STRIPE_WEBHOOK_SECRET | Railway | Sur compromission |
| APP_SECRET_KEY | Railway | 90 jours |

### .gitignore obligatoire
```gitignore
.env
.env.local
.env.*.local
*.pem
*.key
```

---

## Sécurité des Données

### Données sensibles

| Donnée | Classification | Stockage | Rétention |
|--------|---------------|----------|-----------|
| Email | PII | Supabase (chiffré) | Durée du compte |
| Password | Secret | Supabase (hashé) | Durée du compte |
| Carte bancaire | PCI | Stripe uniquement | Jamais stocké |
| URLs analysées | Business | Supabase | Durée du compte |
| Screenshots | Business | Supabase Storage | 90 jours |

### Hashing des passwords

Géré par Supabase Auth :
- Algorithme : bcrypt
- Cost factor : 10

### Chiffrement

- **En transit** : TLS 1.3 obligatoire
- **Au repos** : Chiffrement Supabase (AES-256)

---

## Webhooks Stripe

### Vérification de signature
```python
@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            settings.STRIPE_WEBHOOK_SECRET,
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")
    
    # Process event...
```

### Idempotence
```python
# Vérifier si l'event a déjà été traité
event_id = event["id"]
if await is_event_processed(event_id):
    return {"received": True}  # Skip

# Traiter et marquer comme traité
await process_event(event)
await mark_event_processed(event_id)
```

---

## Logging Sécurisé

### Données à NE JAMAIS logger

- Passwords
- Tokens JWT complets
- Numéros de carte
- Clés API
- Contenu complet des pages scrapées

### Anonymisation
```python
def safe_log(user_id: str, email: str, url: str):
    logger.info(
        "analysis_created",
        user_id=user_id,  # OK - interne
        email_domain=email.split("@")[1],  # Anonymisé
        url_domain=urlparse(url).netloc,  # Anonymisé
    )
```

---

## Sécurité du Scraping

### Restrictions
```python
# URLs interdites
BLOCKED_PATTERNS = [
    r"^https?://localhost",
    r"^https?://127\.",
    r"^https?://10\.",
    r"^https?://192\.168\.",
    r"^https?://172\.(1[6-9]|2[0-9]|3[0-1])\.",
    r"file://",
]

def validate_url(url: str) -> bool:
    for pattern in BLOCKED_PATTERNS:
        if re.match(pattern, url):
            raise ValidationError("URL not allowed")
    return True
```

### Timeouts stricts
```python
PLAYWRIGHT_TIMEOUT = 30000  # 30 secondes max
```

### User-Agent honnête
```python
USER_AGENT = (
    "LeakDetector/1.0 "
    "(+https://leakdetector.tech/bot; "
    "Landing page analyzer)"
)
```

---

## Réponse aux Incidents

### Niveaux de sévérité

| Niveau | Description | Temps de réponse |
|--------|-------------|------------------|
| P1 | Breach de données, système down | < 1 heure |
| P2 | Vulnérabilité exploitable | < 4 heures |
| P3 | Vulnérabilité non exploitée | < 24 heures |
| P4 | Amélioration sécurité | Sprint suivant |

### Checklist Incident P1

1. [ ] Isoler le système affecté
2. [ ] Révoquer les credentials compromis
3. [ ] Notifier les utilisateurs affectés
4. [ ] Documenter la timeline
5. [ ] Post-mortem dans les 48h

### Contact sécurité

security@leakdetector.tech

---

## Audit & Compliance

### Logs d'audit

Tous les événements suivants sont loggés :

- Connexion/déconnexion
- Création de compte
- Changement de password
- Création d'analyse
- Accès aux rapports
- Changement de plan
- Paiements

### RGPD

- **Droit d'accès** : Export des données via /settings
- **Droit à l'effacement** : Suppression compte via /settings
- **Portabilité** : Export JSON des analyses/rapports
- **Consentement** : Checkbox inscription + CGU

### Rétention des données

| Type | Rétention |
|------|-----------|
| Compte actif | Illimitée |
| Compte supprimé | 30 jours puis purge |
| Logs | 90 jours |
| Screenshots | 90 jours |

---

## Checklist Déploiement

### Avant chaque release

- [ ] Pas de secrets dans le code
- [ ] Pas de `console.log` avec données sensibles
- [ ] HTTPS forcé
- [ ] Headers de sécurité actifs
- [ ] Rate limiting actif
- [ ] RLS vérifié sur nouvelles tables
- [ ] Dépendances à jour (npm audit, pip audit)

# Catalogue des Erreurs — Leak Detector

> Tous les codes d'erreur, messages, et actions de résolution.

---

## Format Standard
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Message lisible par l'utilisateur",
    "details": {
      "field": "Information technique optionnelle"
    }
  }
}
```

---

## Erreurs HTTP Standards

| Code HTTP | Code Interne | Message | Cause |
|-----------|--------------|---------|-------|
| 400 | BAD_REQUEST | Invalid request | Requête malformée |
| 401 | UNAUTHORIZED | Authentication required | Token manquant/invalide |
| 403 | FORBIDDEN | Access denied | Pas les permissions |
| 404 | NOT_FOUND | Resource not found | Ressource inexistante |
| 429 | RATE_LIMITED | Too many requests | Limite de requêtes |
| 500 | INTERNAL_ERROR | An unexpected error occurred | Erreur serveur |
| 503 | SERVICE_UNAVAILABLE | Service temporarily unavailable | Maintenance |

---

## Erreurs d'Authentification

### AUTH_001 — INVALID_CREDENTIALS

| Attribut | Valeur |
|----------|--------|
| HTTP | 401 |
| Code | INVALID_CREDENTIALS |
| Message FR | Email ou mot de passe incorrect |
| Message EN | Invalid email or password |
| Cause | Credentials incorrects |
| Action User | Vérifier email/password, utiliser reset password |
| Action Dev | Logger tentative (sans password) |

### AUTH_002 — EMAIL_NOT_VERIFIED

| Attribut | Valeur |
|----------|--------|
| HTTP | 403 |
| Code | EMAIL_NOT_VERIFIED |
| Message | Please verify your email address |
| Cause | Email pas encore vérifié |
| Action User | Vérifier inbox, renvoyer email |
| Action Dev | Proposer renvoi email |

### AUTH_003 — SESSION_EXPIRED

| Attribut | Valeur |
|----------|--------|
| HTTP | 401 |
| Code | SESSION_EXPIRED |
| Message | Your session has expired. Please log in again. |
| Cause | JWT expiré |
| Action User | Se reconnecter |
| Action Dev | Refresh token si possible |

### AUTH_004 — EMAIL_EXISTS

| Attribut | Valeur |
|----------|--------|
| HTTP | 409 |
| Code | EMAIL_EXISTS |
| Message | An account with this email already exists |
| Cause | Email déjà utilisé |
| Action User | Se connecter ou reset password |
| Action Dev | Proposer login/reset |

### AUTH_005 — WEAK_PASSWORD

| Attribut | Valeur |
|----------|--------|
| HTTP | 400 |
| Code | WEAK_PASSWORD |
| Message | Password must be at least 8 characters |
| Cause | Password trop faible |
| Action User | Choisir password plus fort |
| Action Dev | Afficher critères |

---

## Erreurs de Validation

### VAL_001 — INVALID_URL

| Attribut | Valeur |
|----------|--------|
| HTTP | 400 |
| Code | INVALID_URL |
| Message | Please enter a valid URL |
| Cause | Format URL invalide |
| Action User | Corriger l'URL |
| Détails | `{ "url": "valeur soumise" }` |

### VAL_002 — MISSING_FIELD

| Attribut | Valeur |
|----------|--------|
| HTTP | 400 |
| Code | MISSING_FIELD |
| Message | Required field is missing: {field} |
| Cause | Champ requis absent |
| Action User | Remplir le champ |
| Détails | `{ "field": "nom du champ" }` |

### VAL_003 — INVALID_FORMAT

| Attribut | Valeur |
|----------|--------|
| HTTP | 400 |
| Code | INVALID_FORMAT |
| Message | Invalid format for field: {field} |
| Cause | Format incorrect |
| Action User | Corriger le format |
| Détails | `{ "field": "...", "expected": "..." }` |

---

## Erreurs d'Analyse

### ANA_001 — PAGE_NOT_FOUND

| Attribut | Valeur |
|----------|--------|
| HTTP | 400 |
| Code | PAGE_NOT_FOUND |
| Message | Page not found (404) |
| Cause | La page n'existe pas |
| Action User | Vérifier l'URL |
| Retry | Non |

### ANA_002 — PAGE_TIMEOUT

| Attribut | Valeur |
|----------|--------|
| HTTP | 400 |
| Code | PAGE_TIMEOUT |
| Message | Page took too long to load (>30s) |
| Cause | Page trop lente |
| Action User | Réessayer plus tard |
| Retry | Oui (auto, 2x) |

### ANA_003 — PAGE_BLOCKED

| Attribut | Valeur |
|----------|--------|
| HTTP | 400 |
| Code | PAGE_BLOCKED |
| Message | Access denied (403) |
| Cause | Cloudflare, auth required, geo-block |
| Action User | Vérifier que la page est publique |
| Retry | Non |

### ANA_004 — SCRAPING_ERROR

| Attribut | Valeur |
|----------|--------|
| HTTP | 400 |
| Code | SCRAPING_ERROR |
| Message | Unable to capture this page |
| Cause | Erreur Playwright diverse |
| Action User | Réessayer, contacter support |
| Retry | Oui (auto, 2x) |

### ANA_005 — ANALYSIS_FAILED

| Attribut | Valeur |
|----------|--------|
| HTTP | 500 |
| Code | ANALYSIS_FAILED |
| Message | Analysis failed. Please try again. |
| Cause | Erreur Claude API ou parsing |
| Action User | Réessayer |
| Retry | Oui (auto, 2x) |
| Alerte | Oui si >5/heure |

### ANA_006 — QUOTA_EXCEEDED

| Attribut | Valeur |
|----------|--------|
| HTTP | 403 |
| Code | QUOTA_EXCEEDED |
| Message | Monthly analysis limit reached ({limit} analyses) |
| Cause | Limite plan atteinte |
| Action User | Upgrade ou attendre reset |
| Détails | `{ "limit": 3, "plan": "free" }` |

---

## Erreurs de Billing

### BIL_001 — PAYMENT_FAILED

| Attribut | Valeur |
|----------|--------|
| HTTP | 400 |
| Code | PAYMENT_FAILED |
| Message | Payment failed. Please check your card details. |
| Cause | Carte refusée |
| Action User | Mettre à jour carte |
| Détails | `{ "decline_code": "..." }` |

### BIL_002 — SUBSCRIPTION_NOT_FOUND

| Attribut | Valeur |
|----------|--------|
| HTTP | 404 |
| Code | SUBSCRIPTION_NOT_FOUND |
| Message | No active subscription found |
| Cause | Pas d'abonnement actif |
| Action User | S'abonner |

### BIL_003 — INVALID_PRICE

| Attribut | Valeur |
|----------|--------|
| HTTP | 400 |
| Code | INVALID_PRICE |
| Message | Invalid pricing plan |
| Cause | Price ID invalide |
| Action User | Sélectionner un plan valide |

### BIL_004 — STRIPE_ERROR

| Attribut | Valeur |
|----------|--------|
| HTTP | 500 |
| Code | STRIPE_ERROR |
| Message | Payment system error. Please try again. |
| Cause | Erreur Stripe API |
| Action User | Réessayer |
| Alerte | Oui |

---

## Erreurs de Ressources

### RES_001 — ANALYSIS_NOT_FOUND

| Attribut | Valeur |
|----------|--------|
| HTTP | 404 |
| Code | ANALYSIS_NOT_FOUND |
| Message | Analysis not found |
| Cause | ID invalide ou pas propriétaire |

### RES_002 — REPORT_NOT_FOUND

| Attribut | Valeur |
|----------|--------|
| HTTP | 404 |
| Code | REPORT_NOT_FOUND |
| Message | Report not found |
| Cause | ID invalide ou pas propriétaire |

### RES_003 — PROFILE_NOT_FOUND

| Attribut | Valeur |
|----------|--------|
| HTTP | 404 |
| Code | PROFILE_NOT_FOUND |
| Message | Profile not found |
| Cause | User sans profile (bug) |
| Alerte | Oui (ne devrait pas arriver) |

---

## Erreurs Rate Limiting

### RATE_001 — RATE_LIMITED

| Attribut | Valeur |
|----------|--------|
| HTTP | 429 |
| Code | RATE_LIMITED |
| Message | Too many requests. Please try again later. |
| Cause | Limite de requêtes atteinte |
| Action User | Attendre |
| Détails | `{ "retry_after": 60 }` |
| Headers | `Retry-After: 60` |

---

## Mapping Frontend

### Affichage des erreurs
```typescript
function getErrorMessage(error: ApiError): string {
  const messages: Record<string, string> = {
    // Auth
    INVALID_CREDENTIALS: "Email ou mot de passe incorrect",
    EMAIL_EXISTS: "Un compte existe déjà avec cet email",
    SESSION_EXPIRED: "Votre session a expiré",
    
    // Analysis
    INVALID_URL: "Veuillez entrer une URL valide",
    PAGE_NOT_FOUND: "Page introuvable (404)",
    PAGE_TIMEOUT: "La page met trop de temps à charger",
    PAGE_BLOCKED: "Impossible d'accéder à cette page",
    ANALYSIS_FAILED: "L'analyse a échoué. Veuillez réessayer.",
    QUOTA_EXCEEDED: "Limite d'analyses atteinte",
    
    // Billing
    PAYMENT_FAILED: "Paiement refusé. Vérifiez votre carte.",
    
    // Default
    INTERNAL_ERROR: "Une erreur est survenue",
  };
  
  return messages[error.code] || error.message || messages.INTERNAL_ERROR;
}
```

### Actions par erreur
```typescript
function getErrorAction(error: ApiError): ErrorAction {
  switch (error.code) {
    case 'SESSION_EXPIRED':
      return { type: 'redirect', path: '/login' };
    case 'QUOTA_EXCEEDED':
      return { type: 'modal', component: 'UpgradeModal' };
    case 'PAYMENT_FAILED':
      return { type: 'redirect', path: '/settings?tab=billing' };
    default:
      return { type: 'toast', variant: 'error' };
  }
}
```

---

## Logging & Monitoring

### Erreurs à logger (WARNING)

- Toutes les erreurs 4xx (sauf 401, 404)
- Rate limiting hits

### Erreurs à alerter (ERROR)

- Toutes les erreurs 5xx
- ANALYSIS_FAILED si >5/heure
- STRIPE_ERROR
- PROFILE_NOT_FOUND

### Format de log
```json
{
  "timestamp": "2026-02-02T10:00:00Z",
  "level": "ERROR",
  "error_code": "ANALYSIS_FAILED",
  "user_id": "uuid",
  "request_id": "uuid",
  "path": "/api/v1/analyses",
  "details": { ... }
}
```

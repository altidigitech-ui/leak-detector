# Backup & Restore — Leak Detector

> Stratégie de sauvegarde, procédures de restauration.

---

## Vue d'ensemble

| Donnée | Méthode | Fréquence | Rétention |
|--------|---------|-----------|-----------|
| Database | Supabase auto + export manuel | Continue + hebdo | 30 jours auto, 90 jours manuel |
| Screenshots | Supabase Storage | Pas de backup dédié | 90 jours puis purge |
| Configuration | Git | Chaque commit | Illimitée |
| Secrets | Document sécurisé | Sur changement | Dernière version |

---

## Database

### Backups Automatiques (Supabase)

Supabase Pro inclut :
- **Point-in-Time Recovery (PITR)** : restauration à n'importe quel moment des 7 derniers jours
- **Daily backups** : snapshots quotidiens, rétention 30 jours

Vérification :
1. Supabase Dashboard → Project Settings → Database
2. Vérifier que les backups sont actifs

### Backups Manuels

#### Export complet
```bash
# Prérequis : psql installé localement
# Récupérer la connection string dans Supabase Dashboard

# Export structure + données
pg_dump $DATABASE_URL \
  --format=custom \
  --no-owner \
  --no-acl \
  --file=backup_$(date +%Y%m%d_%H%M%S).dump

# Export structure uniquement
pg_dump $DATABASE_URL \
  --schema-only \
  --no-owner \
  --file=schema_$(date +%Y%m%d).sql

# Export données uniquement
pg_dump $DATABASE_URL \
  --data-only \
  --file=data_$(date +%Y%m%d).sql
```

#### Export par table
```bash
# Profiles
pg_dump $DATABASE_URL \
  --table=profiles \
  --data-only \
  --file=profiles_$(date +%Y%m%d).sql

# Analyses + Reports
pg_dump $DATABASE_URL \
  --table=analyses \
  --table=reports \
  --file=analyses_reports_$(date +%Y%m%d).sql
```

#### Export CSV (données business)
```sql
-- Via Supabase SQL Editor
COPY (
    SELECT 
        a.id, a.url, a.status, a.created_at,
        r.score, r.summary
    FROM analyses a
    LEFT JOIN reports r ON r.analysis_id = a.id
    ORDER BY a.created_at DESC
) TO STDOUT WITH CSV HEADER;
```

### Planning des Backups Manuels

| Quand | Quoi | Stockage |
|-------|------|----------|
| Avant chaque migration | Export complet | Local + Cloud |
| Chaque dimanche | Export complet | Cloud storage |
| Avant delete massif | Tables concernées | Local |
| Avant upgrade Supabase | Export complet | Local + Cloud |

---

## Procédure de Restore

### Restore depuis Supabase PITR

1. Supabase Dashboard → Database → Backups
2. Sélectionner le point dans le temps
3. Click "Restore"
4. Attendre (peut prendre plusieurs minutes)
5. Vérifier l'application

**Attention :** PITR restaure TOUTE la base, pas une table spécifique.

### Restore depuis backup quotidien Supabase

1. Supabase Dashboard → Database → Backups
2. Sélectionner le backup quotidien
3. Click "Restore"
4. Vérifier

### Restore depuis export manuel
```bash
# Restore complet (ATTENTION: écrase tout)
pg_restore \
  --dbname=$DATABASE_URL \
  --clean \
  --no-owner \
  --no-acl \
  backup_20260202.dump

# Restore une table spécifique
pg_restore \
  --dbname=$DATABASE_URL \
  --table=analyses \
  --data-only \
  --no-owner \
  backup_20260202.dump

# Restore depuis SQL
psql $DATABASE_URL < data_20260202.sql
```

### Restore partiel (une table)
```bash
# 1. Exporter la table depuis le backup
pg_restore \
  --file=analyses_only.sql \
  --table=analyses \
  --data-only \
  backup_20260202.dump

# 2. Vider la table actuelle (si nécessaire)
psql $DATABASE_URL -c "TRUNCATE analyses CASCADE;"

# 3. Restaurer
psql $DATABASE_URL < analyses_only.sql

# 4. Vérifier
psql $DATABASE_URL -c "SELECT COUNT(*) FROM analyses;"
```

---

## Storage (Screenshots)

### Stratégie

Les screenshots ne sont pas critiques et peuvent être régénérés en relançant une analyse. Pas de backup dédié.

### Purge des vieux screenshots
```sql
-- Identifier les screenshots >90 jours
SELECT id, screenshot_url, created_at
FROM reports
WHERE screenshot_url IS NOT NULL
AND created_at < NOW() - INTERVAL '90 days';
```
```python
# Script de purge
async def purge_old_screenshots():
    cutoff = datetime.utcnow() - timedelta(days=90)
    
    old_reports = supabase.table("reports") \
        .select("id, screenshot_url") \
        .lt("created_at", cutoff.isoformat()) \
        .not_.is_("screenshot_url", "null") \
        .execute()
    
    for report in old_reports.data:
        # Delete from storage
        path = extract_path(report["screenshot_url"])
        supabase.storage.from_("screenshots").remove([path])
        
        # Clear URL in DB
        supabase.table("reports") \
            .update({"screenshot_url": None}) \
            .eq("id", report["id"]) \
            .execute()
    
    logger.info("purge_completed", count=len(old_reports.data))
```

---

## Configuration & Secrets

### Configuration (dans Git)

Tout le code et la configuration sont versionnés dans Git. Le repo est le backup.
```bash
# Clone complet = restore complet du code
git clone git@github.com:xxx/leak-detector.git
```

### Secrets (hors Git)

Les secrets doivent être documentés dans un endroit sécurisé.

#### Document de référence des secrets

| Secret | Service | Où le trouver | Qui peut régénérer |
|--------|---------|---------------|-------------------|
| SUPABASE_SERVICE_KEY | Supabase | Dashboard → Settings → API | Admin Supabase |
| SUPABASE_ANON_KEY | Supabase | Dashboard → Settings → API | Admin Supabase |
| ANTHROPIC_API_KEY | Anthropic | console.anthropic.com | Admin Anthropic |
| STRIPE_SECRET_KEY | Stripe | Dashboard → Developers → API keys | Admin Stripe |
| STRIPE_WEBHOOK_SECRET | Stripe | Dashboard → Developers → Webhooks | Admin Stripe |
| APP_SECRET_KEY | Généré | `openssl rand -hex 32` | N'importe qui |

#### Procédure si secret compromis
```
1. RÉVOQUER immédiatement le secret compromis
   → Régénérer dans le service source
   
2. METTRE À JOUR dans Railway/Vercel
   → Railway Dashboard → Variables
   → Vercel Dashboard → Environment Variables
   
3. REDÉPLOYER les services
   → Railway va auto-redeploy
   → Vercel : trigger manual redeploy si nécessaire
   
4. AUDITER
   → Vérifier les logs pour utilisation non autorisée
   → Vérifier Stripe pour transactions suspectes
   
5. DOCUMENTER
   → Date, secret affecté, impact, actions prises
```

---

## Disaster Recovery

### Scénarios et procédures

#### Scénario 1 : Base de données corrompue
```
Temps estimé : 15-30 minutes

1. Identifier l'étendue de la corruption
2. Si partielle : restore PITR au moment avant corruption
3. Si totale : restore depuis dernier backup quotidien
4. Vérifier l'intégrité des données
5. Relancer les analyses en cours qui ont été perdues
```

#### Scénario 2 : Suppression accidentelle de données
```
Temps estimé : 10-20 minutes

1. STOP : ne pas paniquer, ne rien écrire de plus en DB
2. Identifier les données supprimées
3. Restore PITR au moment juste avant la suppression
   OU
   Restore partiel depuis backup manuel
4. Vérifier
```

#### Scénario 3 : Projet Supabase inaccessible
```
Temps estimé : variable (dépend de Supabase)

1. Vérifier status.supabase.com
2. Si outage Supabase :
   → Activer page de maintenance
   → Attendre résolution
3. Si projet supprimé/locked :
   → Contacter Supabase support immédiatement
   → Préparer restore depuis backup manuel sur nouveau projet
```

#### Scénario 4 : Perte totale (worst case)
```
Temps estimé : 2-4 heures

1. Créer nouveau projet Supabase
2. Appliquer schema.sql
3. Restore données depuis dernier backup
4. Reconfigurer Auth (Google OAuth)
5. Créer buckets Storage
6. Mettre à jour les env vars (Railway + Vercel)
7. Mettre à jour DNS si nécessaire
8. Vérifier tous les flows
```

---

## RPO & RTO

| Métrique | Cible | Actuel |
|----------|-------|--------|
| RPO (Recovery Point Objective) | < 1 heure | ~1 heure (PITR) |
| RTO (Recovery Time Objective) | < 30 minutes | ~15-30 min |

RPO = combien de données on accepte de perdre
RTO = combien de temps pour restaurer le service

---

## Checklist Mensuelle

- [ ] Vérifier que les backups Supabase sont actifs
- [ ] Faire un export manuel complet
- [ ] Tester un restore sur environnement staging
- [ ] Vérifier que le document des secrets est à jour
- [ ] Purger les screenshots >90 jours
- [ ] Vérifier l'espace disque Supabase

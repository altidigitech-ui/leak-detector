# Stratégie Migrations DB — Leak Detector

> Gestion des migrations, versioning du schéma, et procédures.

---

## Approche

Supabase ne fournit pas de système de migration intégré pour la production. On utilise une approche manuelle versionnée avec des fichiers SQL numérotés.

---

## Structure
```
database/
├── schema.sql              # Schéma complet (référence)
├── seed.sql                # Données de dev
└── migrations/
    ├── 001_initial.sql     # Création initiale
    ├── 002_add_xxx.sql     # Ajout feature X
    ├── 003_alter_yyy.sql   # Modification Y
    └── ...
```

---

## Convention de nommage
```
{NNN}_{action}_{description}.sql
```

| Partie | Format | Exemple |
|--------|--------|---------|
| Numéro | 3 chiffres, séquentiel | `001`, `002`, `015` |
| Action | `create`, `add`, `alter`, `drop`, `fix` | `add` |
| Description | snake_case, court | `user_preferences` |

Exemples :
- `001_initial_schema.sql`
- `002_add_api_keys_table.sql`
- `003_alter_profiles_add_avatar.sql`
- `004_add_index_analyses_url.sql`
- `005_fix_rls_reports.sql`

---

## Table de Tracking
```sql
-- Ajouté dans 001_initial.sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    applied_at  TIMESTAMPTZ DEFAULT NOW(),
    checksum    TEXT
);

-- Enregistrer chaque migration
INSERT INTO schema_migrations (version, name, checksum)
VALUES (1, '001_initial_schema', md5('contenu du fichier'));
```

---

## Template de Migration
```sql
-- ============================================
-- Migration: {NNN}_{name}.sql
-- Date: YYYY-MM-DD
-- Author: {name}
-- Description: {description détaillée}
-- ============================================

-- Pré-vérification
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = {NNN}) THEN
        RAISE NOTICE 'Migration {NNN} already applied, skipping.';
        RETURN;
    END IF;
END $$;

-- ============================================
-- UP Migration
-- ============================================

BEGIN;

-- ... changements ici ...

-- Enregistrer la migration
INSERT INTO schema_migrations (version, name)
VALUES ({NNN}, '{NNN}_{name}');

COMMIT;

-- ============================================
-- DOWN Migration (commenté, pour rollback manuel)
-- ============================================

/*
BEGIN;

-- ... rollback ici ...

DELETE FROM schema_migrations WHERE version = {NNN};

COMMIT;
*/
```

---

## Migration Initiale
```sql
-- 001_initial_schema.sql
-- Date: 2026-02-02
-- Description: Schéma initial complet

-- Table de tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    applied_at  TIMESTAMPTZ DEFAULT NOW(),
    checksum    TEXT
);

-- Le reste du schéma est dans schema.sql
-- Cette migration sert de point de référence

INSERT INTO schema_migrations (version, name)
VALUES (1, '001_initial_schema');
```

---

## Exemples de Migrations Courantes

### Ajouter une colonne
```sql
-- 002_add_profiles_avatar.sql

BEGIN;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

INSERT INTO schema_migrations (version, name)
VALUES (2, '002_add_profiles_avatar');

COMMIT;

/*
-- DOWN
BEGIN;
ALTER TABLE profiles DROP COLUMN IF EXISTS avatar_url;
DELETE FROM schema_migrations WHERE version = 2;
COMMIT;
*/
```

### Ajouter une table
```sql
-- 003_create_api_keys.sql

BEGIN;

CREATE TABLE api_keys (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    key_hash    TEXT NOT NULL,
    prefix      TEXT NOT NULL,  -- 8 premiers chars pour identification
    last_used   TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own API keys"
    ON api_keys FOR ALL
    USING (auth.uid() = user_id);

INSERT INTO schema_migrations (version, name)
VALUES (3, '003_create_api_keys');

COMMIT;

/*
-- DOWN
BEGIN;
DROP TABLE IF EXISTS api_keys;
DELETE FROM schema_migrations WHERE version = 3;
COMMIT;
*/
```

### Ajouter un index
```sql
-- 004_add_index_analyses_url.sql

BEGIN;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analyses_url
ON analyses(url);

INSERT INTO schema_migrations (version, name)
VALUES (4, '004_add_index_analyses_url');

COMMIT;
```

### Modifier une colonne
```sql
-- 005_alter_reports_add_version.sql

BEGIN;

ALTER TABLE reports
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Backfill
UPDATE reports SET version = 1 WHERE version IS NULL;

-- Rendre NOT NULL après backfill
ALTER TABLE reports
ALTER COLUMN version SET NOT NULL;

INSERT INTO schema_migrations (version, name)
VALUES (5, '005_alter_reports_add_version');

COMMIT;
```

### Modifier RLS
```sql
-- 006_fix_rls_reports.sql

BEGIN;

-- Drop old policy
DROP POLICY IF EXISTS "Users view own reports" ON reports;

-- Create updated policy
CREATE POLICY "Users view own reports"
    ON reports FOR SELECT
    USING (
        analysis_id IN (
            SELECT id FROM analyses WHERE user_id = auth.uid()
        )
    );

INSERT INTO schema_migrations (version, name)
VALUES (6, '006_fix_rls_reports');

COMMIT;
```

---

## Procédure d'Application

### Développement
```bash
# 1. Écrire la migration
# 2. Tester sur Supabase local ou projet staging

# 3. Vérifier
psql $DATABASE_URL -c "SELECT * FROM schema_migrations ORDER BY version;"

# 4. Appliquer
psql $DATABASE_URL -f database/migrations/00X_name.sql
```

### Production
```bash
# 1. TOUJOURS faire un backup avant
# Voir docs/BACKUP.md

# 2. Appliquer via Supabase SQL Editor
# → SQL Editor → New Query
# → Coller le contenu de la migration
# → Run

# 3. Vérifier
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;

# 4. Tester l'application
# → Vérifier les endpoints affectés
# → Vérifier les logs d'erreur
```

---

## Règles

### Obligatoire

1. **Toujours idempotent** : `IF NOT EXISTS`, `IF EXISTS`
2. **Toujours dans une transaction** : `BEGIN; ... COMMIT;`
3. **Toujours inclure le DOWN** (commenté)
4. **Toujours tester sur staging avant prod**
5. **Toujours backup avant migration prod**
6. **Toujours mettre à jour schema.sql** après migration

### Interdit

1. **Ne JAMAIS** supprimer une colonne sans migration intermédiaire
2. **Ne JAMAIS** renommer une colonne directement (add new → copy → drop old)
3. **Ne JAMAIS** appliquer une migration non testée en prod
4. **Ne JAMAIS** modifier une migration déjà appliquée

### Bonnes pratiques

1. **Petites migrations** : une modification par fichier
2. **Non-bloquantes** : utiliser `CONCURRENTLY` pour les index
3. **Backward compatible** : l'ancien code doit fonctionner pendant le deploy
4. **Colonnes nullable d'abord** : ajouter nullable, backfill, puis NOT NULL

---

## Rollback

### Procédure
```bash
# 1. Identifier la migration à rollback
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;

# 2. Appliquer le DOWN de la migration
# → Décommenter la section DOWN
# → Appliquer via SQL Editor

# 3. Vérifier
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;

# 4. Déployer l'ancien code si nécessaire
```

### Limitations

- Les données supprimées par DROP ne sont pas récupérables sans backup
- Les migrations destructives nécessitent un restore depuis backup

---

## Synchronisation schema.sql

Après chaque migration appliquée en prod :
```bash
# 1. Appliquer les changements dans schema.sql
# 2. Commit les deux fichiers ensemble
git add database/schema.sql database/migrations/00X_name.sql
git commit -m "db: migration 00X - description"
```

`schema.sql` doit toujours refléter l'état actuel de la production.

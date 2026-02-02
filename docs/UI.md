# Design System — Leak Detector

> Guide visuel et composants UI.

---

## Couleurs

### Primaires

| Nom | Hex | Usage |
|-----|-----|-------|
| Primary 50 | `#eff6ff` | Backgrounds légers |
| Primary 100 | `#dbeafe` | Hover states |
| Primary 500 | `#3b82f6` | Liens, accents |
| Primary 600 | `#2563eb` | Boutons primaires |
| Primary 700 | `#1d4ed8` | Boutons hover |

### Neutres

| Nom | Hex | Usage |
|-----|-----|-------|
| Gray 50 | `#f9fafb` | Page background |
| Gray 100 | `#f3f4f6` | Cards secondaires |
| Gray 200 | `#e5e7eb` | Borders |
| Gray 500 | `#6b7280` | Texte secondaire |
| Gray 700 | `#374151` | Texte body |
| Gray 900 | `#111827` | Titres |

### Sémantiques

| Nom | Hex | Usage |
|-----|-----|-------|
| Success | `#10b981` | Score élevé, succès |
| Warning | `#f59e0b` | Score moyen, attention |
| Error | `#ef4444` | Score bas, erreurs |
| Info | `#3b82f6` | Informations |

---

## Typographie

### Police

**Inter** — Sans-serif moderne, excellente lisibilité.
```css
font-family: 'Inter', system-ui, sans-serif;
```

### Échelle

| Nom | Taille | Line-height | Usage |
|-----|--------|-------------|-------|
| xs | 12px | 16px | Labels, badges |
| sm | 14px | 20px | Texte secondaire |
| base | 16px | 24px | Corps de texte |
| lg | 18px | 28px | Sous-titres |
| xl | 20px | 28px | Titres sections |
| 2xl | 24px | 32px | Titres pages |
| 3xl | 30px | 36px | Headlines |
| 4xl | 36px | 40px | Hero |
| 5xl | 48px | 1 | Hero principal |

### Poids

| Poids | Usage |
|-------|-------|
| 400 (regular) | Corps de texte |
| 500 (medium) | Boutons, labels |
| 600 (semibold) | Sous-titres |
| 700 (bold) | Titres |

---

## Espacement

Système basé sur 4px :

| Token | Valeur | Usage |
|-------|--------|-------|
| 1 | 4px | Micro-ajustements |
| 2 | 8px | Entre éléments liés |
| 3 | 12px | Padding compact |
| 4 | 16px | Padding standard |
| 6 | 24px | Sections |
| 8 | 32px | Entre sections |
| 12 | 48px | Grandes sections |
| 16 | 64px | Sections majeures |
| 20 | 80px | Sections page |

---

## Composants

### Boutons
```tsx
// Primaire
<button className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors">
  Analyser
</button>

// Secondaire
<button className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">
  Annuler
</button>

// Danger
<button className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors">
  Supprimer
</button>

// Ghost
<button className="text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
  Retour
</button>
```

**États :**
- `disabled:opacity-50 disabled:cursor-not-allowed`
- Loading : spinner + texte "Chargement..."

### Inputs
```tsx
<input 
  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
  placeholder="https://example.com"
/>

// Avec erreur
<input className="... border-red-300 focus:ring-red-500" />
<p className="mt-1 text-sm text-red-600">URL invalide</p>
```

### Cards
```tsx
<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
  {/* Contenu */}
</div>
```

### Badges / Pills
```tsx
// Status
<span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
  completed
</span>

// Severity
<span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
  critical
</span>
```

### Score Circle
```tsx
// Voir /components/ui/score-circle.tsx
<ScoreCircle score={72} size="lg" />
```

| Score | Couleur |
|-------|---------|
| 80-100 | Green (#10b981) |
| 60-79 | Yellow (#f59e0b) |
| 0-59 | Red (#ef4444) |

### Issue Cards
```tsx
<div className="p-4 rounded-lg border bg-red-50 border-red-200 text-red-700">
  <div className="flex items-start gap-3">
    <span>🔴</span>
    <div>
      <h3 className="font-medium">CTA peu visible</h3>
      <p className="text-sm mt-1 opacity-90">Description...</p>
      <div className="mt-3 p-3 bg-white bg-opacity-50 rounded">
        <p className="text-sm font-medium">💡 Recommendation</p>
        <p className="text-sm mt-1">Action à prendre...</p>
      </div>
    </div>
  </div>
</div>
```

---

## Layout

### Header (Marketing)
```
[Logo]                              [Pricing] [Login] [CTA]
```

Hauteur : 64px
Background : white
Border : gray-200 bottom

### Sidebar (Dashboard)

Largeur : 256px (16rem)
Background : white
Border : gray-200 right
```
[Logo]
─────────
Dashboard
Analyze
Reports
─────────
Settings
─────────
[Plan Info]
```

### Main Content

Padding : 32px (p-8)
Max-width : selon contexte
Background : gray-50

---

## Breakpoints

| Nom | Min-width | Usage |
|-----|-----------|-------|
| sm | 640px | Téléphones larges |
| md | 768px | Tablettes |
| lg | 1024px | Desktop |
| xl | 1280px | Grand écran |
| 2xl | 1536px | Très grand écran |

---

## Animations

### Transitions

Durée par défaut : 150ms
Easing : ease-out
```css
transition-colors     /* Pour backgrounds, couleurs */
transition-all        /* Pour transformations complexes */
```

### Loading States

- Spinner SVG pour boutons
- Skeleton pulse pour contenus
- Progress bar pour processus longs
```tsx
// Progress bar
<div className="h-2 bg-gray-200 rounded-full overflow-hidden">
  <div 
    className="h-full bg-primary-600 rounded-full transition-all duration-500"
    style={{ width: `${progress}%` }}
  />
</div>
```

---

## Icônes

Emojis natifs pour la v1 :
- 🔍 Analyse
- 📊 Dashboard
- 📋 Reports
- ⚙️ Settings
- 🔴 Critical
- 🟡 Warning
- 🔵 Info
- ✅ Success
- ❌ Error
- 💡 Tip/Recommendation

Migration future vers Lucide React si besoin.

---

## Dark Mode

**Non implémenté pour MVP.**

Préparation :
- Utiliser CSS variables
- Préfixer avec `dark:` quand prêt

# Mini application web statique + Supabase

Cette application est une TODO liste statique (HTML/CSS/JS) transformee en PWA, synchronisee via Supabase entre plusieurs appareils (PC et Galaxy S7).

## Fichiers principaux

- `index.html` : UI (auth + liste) et chargement des scripts.
- `style.css` : style responsive.
- `app.js` : auth Supabase (API HTTP) + CRUD items.
- `manifest.webmanifest` : configuration PWA.
- `sw.js` : service worker avec pre-cache et cache-first.
- `config.example.js` : modele de configuration Supabase.
- `config.js` : configuration locale reelle (non committee).

## Prerequis Supabase

Table attendue:

- `public.items(id uuid, user_id uuid, text text, done boolean, created_at timestamptz)`

RLS/policies attendues:

- lecture/ecriture limitees a `user_id = auth.uid()`.

## Configuration

1. Copier `config.example.js` vers `config.js`.
2. Remplir `SUPABASE_URL` et `SUPABASE_ANON_KEY` dans `config.js`.
3. Ne jamais utiliser la `service_role key` dans le front (interdit).

Exemple:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://your-project-id.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key",
};
```

## Test local

Serveur Python:

```powershell
cd "c:\Users\am\OneDrive\Documents\01_projets\2026_02_13_Projet codex 1"
python -m http.server 8000
```

Puis ouvrir `http://localhost:8000`.

Checks rapides:

- inscription d'un compte,
- connexion/deconnexion,
- ajout d'item,
- toggle fait/a faire,
- suppression,
- synchro en ouvrant le meme compte sur un autre appareil.

## Redeploiement GitHub Pages (HTTPS)

```powershell
git add .
git commit -m "Add Supabase auth + synced items"
git push
```

Ensuite attendre le redeploiement Pages, puis ouvrir:

- `https://<USER>.github.io/<REPO>/`

## Test Galaxy S7

1. Ouvrir l'URL HTTPS GitHub Pages dans Chrome Android.
2. Se connecter avec le meme compte que sur PC.
3. Ajouter/supprimer/toggle des items et verifier la synchro croisee.
4. Installer la PWA via menu Chrome (`Installer` ou `Ajouter a l'ecran d'accueil`).
5. Relancer l'app installee et verifier l'UI hors-ligne (les operations Supabase restent en ligne).

## Notes

- `config.js` est ignore par Git via `.gitignore`.
- Si tu modifies `sw.js`, incremente `CACHE_VERSION` pour forcer le refresh du cache.
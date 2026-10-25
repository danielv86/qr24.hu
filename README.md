# QR24.hu – dinamikus QR-kód rendszer

A projekt két külön alkalmazásból áll:

```
frontend/   Nuxt 4 (Vue 3, Tailwind, SSR) – a nyilvános oldalak, a generátor és a fiók felülete
backend/    Nitro 2 (h3, Prisma, MySQL) – API, dinamikus QR-átirányítás, statisztika, admin
shared/     a két app közös kódja (egyetlen példány, mindkettő ezt importálja)
```

A két app külön `package.json`-nal, külön `yarn.lock`-kal és külön `.output`-tal
rendelkezik, tehát külön is buildelhető és telepíthető. A `frontend/` nem tartalmaz
adatbázis-hozzáférést vagy Prismát – minden adatot a backend API-n keresztül ér el.

A böngésző továbbra is **ugyanazon az originon** ér mindent el: a Nuxt a backend
saját API-útvonalait (`/api/auth`, `/api/dynamic-qr`, `/api/dashboard`,
`/api/admin`, `/api/settings`, `/api/health`, `/api/__sitemap__`) proxyzza, a
`/r/<kód>` rövid címeket pedig egy vékony átjáró továbbítja. Minden más `/api/*`
útvonal (például a `@nuxt/icon` `/api/_nuxt_icon` végpontja) a frontendnél marad. Így a httpOnly süti és a CSRF-védelem változatlanul működik, nincs
szükség CORS-ra.

## Fejlesztői indítás

```bash
# 1) MariaDB / MySQL (a helyi WAMP MariaDB 3306-on fut)
#    Adatbázis: qr24

# 2) backend
cd backend
cp .env.example .env        # töltsd ki a titkokat
yarn install
yarn db:deploy              # migrációk
yarn db:setup               # séma + admin fiók (ADMIN_EMAIL / ADMIN_PASSWORD)
yarn dev                    # http://127.0.0.1:3001

# 3) frontend (másik terminálban)
cd frontend
cp .env.example .env        # NUXT_BACKEND_URL=http://127.0.0.1:3001
yarn install
yarn dev                    # http://127.0.0.1:3000
```

Fontos: a sitemap a backend `/api/__sitemap__/urls` végpontjából dolgozik, ezért a
frontend build/indítás előtt a backendnek futnia kell.

## Környezeti változók

Frontend (`frontend/.env`):

| Változó | Leírás |
| --- | --- |
| `NUXT_PUBLIC_SITE_URL` | Nyilvános cím, pl. `https://qr24.hu` (kanonikus URL, sitemap) |
| `NUXT_PUBLIC_BRAND_NAME` | Márkanév |
| `NUXT_BACKEND_URL` | A backend belső címe, pl. `http://127.0.0.1:3001` |

Backend (`backend/.env`):

| Változó | Leírás |
| --- | --- |
| `NUXT_DB_HOST/PORT/NAME/USER/PASSWORD` | MySQL kapcsolat (alap: `qr24` adatbázis) |
| `NUXT_SESSION_SECRET`, `NUXT_HASH_SECRET` | Legalább 32 karakteres titkok (`openssl rand -base64 48`) |
| `NUXT_PUBLIC_SITE_URL` | A rövid linkek és a cookie-k domainje |
| `NUXT_OAUTH_GOOGLE_*`, `NUXT_OAUTH_APPLE_*` | Opcionális Google/Apple bejelentkezés |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Csak a `db:setup` használja |

A Google/Apple gombok csak akkor jelennek meg, ha a megfelelő változók ki vannak
töltve. Átirányítási címek:

- `https://qr24.hu/api/auth/oauth/google/callback`
- `https://qr24.hu/api/auth/oauth/apple/callback`

## Adatbázis

Prisma migrációk a `backend/prisma/migrations` alatt. Fő táblák:

- `users`, `user_sessions`, `oauth_accounts` – fiókok és munkamenetek
- `dynamic_qr_codes` – nyilvános azonosító, cél-URL, állapot, lejárat, kategória, kampány
- `dynamic_qr_scans` – napi aggregált beolvasások (dashboardhoz)
- `scan_events` – részletes események (eszköz, böngésző, ország, bot), 90 napos megőrzés
- `audit_logs` – cél-URL módosítás, állapotváltás, törlés
- `admin_users`, `admin_sessions`, `settings`, `seo_overrides`, `rate_limits`

```bash
cd backend
yarn db:migrate      # új migráció fejlesztés közben
yarn db:deploy       # éles migráció
yarn db:generate     # Prisma kliens
```

## API

Hitelesítés sütivel (`qr_user`), a módosító kéréseknél Origin-ellenőrzés.

```
POST   /api/auth/register           regisztráció
POST   /api/auth/login              bejelentkezés
POST   /api/auth/logout             kijelentkezés
GET    /api/auth/session            aktuális fiók + elérhető OAuth szolgáltatók
GET    /api/auth/oauth/:provider    Google/Apple indítás
GET|POST /api/auth/oauth/:provider/callback

GET    /api/dynamic-qr              saját kódok (keresés, szűrés, rendezés, lapozás)
POST   /api/dynamic-qr              létrehozás (csomaglimittel)
GET    /api/dynamic-qr/:id/detail   részletek (tulajdonos)
PATCH  /api/dynamic-qr/:id          cél-URL és metaadatok módosítása
DELETE /api/dynamic-qr/:id          törlés
POST   /api/dynamic-qr/:id/pause|activate|archive
GET    /api/dynamic-qr/:id/analytics?days=30

GET    /api/dashboard/summary       statisztikai kártyák, top kódok, aktivitás
GET    /r/:code                     nyilvános átirányítás vagy állapotoldal
```

A nyilvános statikus generátor továbbra is regisztráció nélkül működik; a
dinamikus kódokhoz fiók kell. A korábbi, tokenes dinamikus flow (nyilvános
létrehozás szerkesztői tokennel) megmaradt az admin felülethez.

## Állapotok

`active` → átirányít; `paused` → állapotoldal (200, noindex); `expired` → 410;
`archived` → 410. A lejáratot olvasáskor is ellenőrizzük, így háttérfeladat nélkül
is helyes az állapot.

## Biztonság

- scrypt jelszó-hash, hmAC-olt munkamenet-tokenek, httpOnly + SameSite=Lax süti
- Zod-validáció minden bemenetre, csak http/https cél-URL, DNS-alapú SSRF-szűrés
- Origin-ellenőrzés a módosító kéréseken, IP- és fiókalapú rate limit
- Tulajdonjog-ellenőrzés minden QR-műveletnél (idegen kódra 404)
- Auditnapló a cél-URL és állapot módosításairól
- A statisztika nem tárol IP-címet vagy teljes user-agentet; a botokat kiszűri,
  egyedi látogatót szándékosan nem becsül

## Megosztott kód

A két alkalmazás közös kódja (QR-típusok, tartalmi szövegek, csomaglimitek,
státusz-nevek, API-típusok, SEO-segédek) **egyetlen példányban**, a gyökér
[`shared/`](shared) mappában él. Mindkét app ugyanerre a mappára mutat, ezért nincs
másolandó másolat és nem csúszhat el a két oldal:

- frontend: `#shared` → `../shared` (`nuxt.config.ts` alias, `tsconfig.paths`, vitest-alias)
- backend: `#shared` → `../shared` (`nitro.config.ts` alias, `tsconfig.paths`, vitest-alias)

Új közös fájlt tehát a gyökér `shared/` alatt hozz létre, és mindkét oldalon
`#shared/...` útvonallal importáld. A két app ettől még önállóan buildelhető, de a
repót egyben kell checkoutolni.

## Csomagok

A limitek egy helyen: [`shared/qr/plans.ts`](shared/qr/plans.ts). Ingyenes 5 kód,
Pro 100, Business 5000; a Pro/Business lejáratot és kampánycímkét is enged.
Fizetés nincs bekötve – a `users.plan` mező állítja a csomagot.

## Éles telepítés

```bash
cd backend && yarn build      # .output/server/index.mjs
cd ../frontend && yarn build  # .output/server/index.mjs
```

Mindkét Nitro szervert futtatni kell (pl. 3001 backend, 3000 frontend), és a
nyilvános domainen a frontendet kell kiszolgálni; a `/api` és `/r` útvonalakat a
Nuxt proxy viszi a backendre. nginx esetén elegendő a frontendet proxyzni, a
backend csak belső hálózatról legyen elérhető.

## Ami még nincs kész

- Fizetés / előfizetés (a csomag- és limitréteg elő van készítve)
- Időzített célcímváltás, CSV-import/export, csapatmunka, saját domain
- QR24.hu-s saját céloldalak (étlap, névjegy, kupon)
- Földrajzi statisztika csak akkor jelenik meg, ha a CDN ad országkódot
- E-mail-értesítések, jelszó-visszaállítás

# QR24.hu

Dinamikus QR-kód-kezelő rendszer egyetlen Nuxt 4 alkalmazásban: a nyilvános
oldalak, a statikus QR-generátor, a fiókfelület, az adminisztráció és az API
ugyanabban a projektben fut, a Nuxt hivatalos könyvtárstruktúrája szerint.

- Nuxt 4.6 (Vue 3, `<script setup lang="ts">`, SSR)
- Nitro szerverréteg a `server/` mappában
- MySQL / MariaDB + Prisma 7 (`@prisma/adapter-mariadb`)
- Tailwind CSS, `@nuxtjs/i18n`, `@nuxt/icon`, `@nuxtjs/seo`
- Zod validáció, scrypt jelszó-hash, rate limit, auditnapló

## Könyvtárak

A felépítés a [Nuxt directory-structure](https://nuxt.com/docs/4.x/directory-structure)
ajánlását követi:

```
app/                 a Vue alkalmazás
  assets/            CSS és fontok
  components/        automatikusan importált komponensek
  composables/       összetett logika (QR-generátor, letöltés, session)
  layouts/           default, fiok, admin
  lib/               tiszta segédfüggvények (QR-formák, renderelés, sablonok, tartalom)
  middleware/        auth
  pages/             útvonalak (főoldal, generátor, típusoldalak, fiók, admin)
  utils/             automatikusan importált segédek
server/              Nitro: API, átirányítás, adatbázis
  api/               REST végpontok (/api/**)
  routes/r/          nyilvános dinamikus átirányítás (/r/:code)
  utils/             Prisma, auth, rate limit, validáció, statisztika, beállítások
shared/              app és szerver közös kódja (#shared alias)
  content/           típus- és landingoldalak tartalma
  qr/                QR-típusok és státuszlogika
  types/             az API szerződése
prisma/              séma és migrációk
scripts/             adatbázis-előkészítés, admin fiók
tests/               egységes vitest tesztcsomag (app + szerver)
public/              statikus fájlok
i18n/                nyelvi fájlok
```

A `shared/` mappa a Nuxt beépített megoldása arra a kódra, amit a Vue app és a
Nitro szerver is használ; mindkettő `#shared/...` útvonallal importálja, és a
build mindkét oldalra beemeli.

## Fejlesztői indítás

```bash
# 1) MariaDB / MySQL (a helyi WAMP MariaDB 3306-on fut), adatbázis: qr24
# 2) függőségek és séma
cp .env.example .env      # töltsd ki a titkokat
yarn install              # prisma generate + nuxt prepare
yarn db:deploy            # migrációk
yarn db:setup             # séma + admin fiók (ADMIN_EMAIL / ADMIN_PASSWORD)
yarn admin:create         # további admin vagy jelszócsere

# 3) fejlesztői szerver – az oldalak és az API ugyanazon az originon
yarn dev                  # http://localhost:3000
```

## Parancsok

| Parancs | Mit csinál |
| --- | --- |
| `yarn dev` | Fejlesztői szerver (SSR + API + `/r/:code`) |
| `yarn build` | Éles build (`.output/`) |
| `yarn preview` | Az éles build helyi futtatása |
| `yarn typecheck` | `nuxt typecheck` (vue-tsc) |
| `yarn test` | Vitest: app- és szervertesztek együtt |
| `yarn db:generate` | Prisma kliens generálása (`server/generated/prisma`) |
| `yarn db:migrate` | Új migráció fejlesztés közben |
| `yarn db:deploy` | Meglévő migrációk alkalmazása |
| `yarn db:setup` | Séma + admin fiók létrehozása |
| `yarn admin:create` | Admin fiók létrehozása / jelszóváltás |

## Környezeti változók

Minden változó egy helyen, a gyökér `.env`-ben él (minta: `.env.example`).

| Változó | Leírás |
| --- | --- |
| `NUXT_PUBLIC_SITE_URL` | Nyilvános cím, pl. `https://qr24.hu` (kanonikus URL, sitemap, rövid linkek) |
| `NUXT_PUBLIC_BRAND_NAME` | Márkanév |
| `NUXT_PUBLIC_DYNAMIC_QR_ENABLED` | A dinamikus QR funkció főkapcsolója |
| `NUXT_DB_HOST`, `NUXT_DB_PORT`, `NUXT_DB_NAME`, `NUXT_DB_USER`, `NUXT_DB_PASSWORD` | Adatbázis-kapcsolat |
| `NUXT_SESSION_SECRET`, `NUXT_HASH_SECRET` | Munkamenet- és hash-titkok (`openssl rand -base64 48`) |
| `NUXT_TRUST_PROXY` | Reverse proxy mögött `true`, hogy a valós kliens-IP érvényesüljön |
| `NUXT_PUBLIC_ADSENSE_*` | AdSense kliens és slot-azonosítók (az admin felületen is felülírhatók) |
| `NUXT_OAUTH_GOOGLE_*`, `NUXT_OAUTH_APPLE_*` | Opcionális külső bejelentkezés |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Csak a `db:setup` / `admin:create` szkriptekhez |

A titkokat a szerver oldal futásidőben, a `process.env`-ből olvassa
(`server/utils/env.ts`), így nem kerülnek bele a build artifactbe, és telepítéskor
környezeti változóként felülírhatók. A klienshez csak a `runtimeConfig.public`
kerül ki. A `.env` soha nem kerül verziókezelésbe.

## Adatbázis

A séma a [prisma/schema.prisma](prisma/schema.prisma) fájlban van; a migrációk a
`prisma/migrations` alatt. Fő táblák:

- `users`, `user_sessions`, `oauth_accounts` – fiókok és bejelentkezés
- `dynamic_qr_codes` – dinamikus QR-kódok (nyilvános azonosító, cél-URL, állapot, lejárat, kampány, statisztikai számláló)
- `dynamic_qr_scans` – napi aggregált beolvasás (gyors dashboard-lekérdezésekhez)
- `scan_events` – részletes események (eszköz, böngésző, ország, bot-jelző), megőrzési idővel
- `audit_logs` – cél-URL- és állapotváltozások naplója
- `settings` – admin felületen szerkeszthető beállítások (márka, AdSense, jogi adatok, csomagok)
- `seo_overrides` – oldalankénti cím/leírás/noindex felülírás
- `admin_users`, `admin_sessions`, `rate_limits` – adminisztráció és védelem

A migrációk futtatása: `yarn db:deploy` (éles) vagy `yarn db:migrate` (fejlesztés).

## Hogyan működik a dinamikus QR-kód

1. Létrehozás: `POST /api/dynamic-qr` – kriptográfiailag véletlen `publicId` (12 karakter), a QR-kód a `https://qr24.hu/r/<publicId>` címre mutat.
2. Beolvasás: `GET /r/:code` – a szerver azonosítja a kódot, ellenőrzi az állapotot és a lejáratot, majd 302-vel átirányít.
3. Cél-URL módosítás: `PATCH /api/dynamic-qr/:id` – a nyilvános azonosító nem változik, a kinyomtatott kód tovább működik.
4. Állapotok: `active` → átirányít; `paused` → QR24-s állapotoldal (200, noindex); `expired` → 410; `archived` → 410.
5. Statisztika: minden beolvasás napi aggregátumba és eseménytáblába kerül; IP-cím és teljes user-agent nem tárolódik, a botforgalom jelölve van.

## Tömeges QR-kód generátor

`/tomeges-qr-kod-generator` – kliensoldali eszköz: listából vagy CSV-ből
(soronként `Név;Cím`) akár 100 statikus kód, egyetlen megjelenéssel. Letöltés
ZIP-ben (PNG 512/1024 vagy SVG, benne `riport.csv`), A4-es nyomtatóíven
(böngésző nyomtatás) vagy külön CSV-riporttal. A bemenet feldolgozása tiszta
függvényekben él (`shared/bulk.ts`), a letöltés a
`app/composables/useBulkDownload.ts`-ben; minden a böngészőben történik, a lista
nem kerül szerverre. A megszűnt „Linkek” típus régi címe
(`/linkek-qr-kod-generator`) 301-gyel ide irányít.

## API

| Végpont | Leírás |
| --- | --- |
| `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session` | Fiók |
| `GET/POST /api/dynamic-qr` | Lista és létrehozás |
| `GET/PATCH/DELETE /api/dynamic-qr/:id` | Részletek, cél-URL módosítás, törlés (a `:id` a nyilvános azonosító) |
| `POST /api/dynamic-qr/:id/pause`, `/activate`, `/archive` | Állapotkezelés |
| `GET /api/dynamic-qr/:id/analytics` | Beolvasási statisztika |
| `GET /api/dashboard/summary` | Dashboard-kártyák |
| `GET /r/:code` | Nyilvános átirányítás (bejelentkezés nélkül) |
| `POST /api/admin/login`, `/logout`, `GET /api/admin/session` | Admin munkamenet |
| `GET /api/admin/qr`, `/stats`, `/settings`, `/plans` | Admin listák és beállítások |
| `PATCH /api/admin/settings`, `/plans`, `/seo` | Admin szerkesztés |
| `GET /api/settings/public` | Nyilvános beállítások (márka, AdSense, jogi adatok, csomagok) |
| `GET /api/health` | Állapot- és adatbázis-ellenőrzés |
| `GET /api/__sitemap__/urls` | A sitemap forrása |

Egységes válaszforma: `{ success: true, data }` vagy `{ success: false, error: { code, message, details } }`,
a megfelelő HTTP-státuszkóddal. Minden védett végpont ellenőrzi a munkamenetet és
a tulajdonjogot; idegen kódra 404 a válasz.

## Csomagok

A csomagok **adatbázisból** jönnek (`settings` tábla, `plans` kulcs), így a limitek
és funkciókapcsolók build és újraindítás nélkül módosíthatók az admin felületen.
Ha a kulcs hiányzik, a kódban lévő alapértelmezés él (`server/utils/plans.ts`):
Ingyenes 5 kód, Pro 100, Business 5000. A backend 30 másodperces cache-sel olvas,
a felület a `GET /api/settings/public` válaszából kapja ugyanezeket.

## Biztonság

- scrypt jelszó-hash, HMAC-olt munkamenet-tokenek, httpOnly + SameSite=Lax süti
- Zod-validáció minden bemenetre, csak http/https cél-URL, DNS-alapú SSRF-szűrés
- Origin-ellenőrzés a módosító kéréseken (élesben nincs localhost-kivétel)
- IP- és fiókalapú rate limit adatbázisban
- Tulajdonjog-ellenőrzés minden QR-műveletnél
- Auditnapló a cél-URL és állapot módosításairól
- A statisztika nem tárol IP-címet vagy teljes user-agentet; egyedi látogatót
  szándékosan nem becsül

## Éles telepítés

```bash
yarn install
yarn db:deploy
yarn build
node --env-file=.env .output/server/index.mjs   # vagy a változókat a systemd/Docker adja
```

A `.env` értékeit a futtató környezet biztosítja (systemd `EnvironmentFile`,
Docker `--env-file`, Pass és társai); a `PORT` és `HOST` változóval a figyelő
cím állítható. A `NUXT_PUBLIC_SITE_URL` élesben a saját domain legyen, különben a
kanonikus URL-ek és a sitemap is localhostra mutatnak.

## Ami még nincs kész

- Fizetés / előfizetés: a csomag- és jogosultságkezelés rétege kész, fizetési
  szolgáltató nincs bekötve.
- Időzített célcímváltás, CSV-import/export és csapatmunka: az adatmodell és a
  csomagkapcsolók előkészítve, a felület nem.
- QR-kódhoz kapcsolódó saját céloldalak (étlap, névjegy, kupon): nincs implementálva.

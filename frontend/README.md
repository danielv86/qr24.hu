# QR24.hu – QR-kód generátor

Magyar nyelvű, SEO-optimalizált QR-kód generátor Nuxt 4 alapokon. A statikus
generátor mellett dinamikus (utólag szerkeszthető) QR-kódok, admin felület és
AdSense-helyek is helyet kaptak a projektben.

## Stack

- **Nuxt 4** + Vue 3 + TypeScript (szigorú mód)
- **Nitro** szerveroldali végpontok (`server/api`, `server/routes`)
- **Prisma 7** + MySQL/MariaDB (`@prisma/adapter-mariadb`)
- **Tailwind CSS** – a betűtípus a helyi `app/assets/fonts` mappából (Google Sans Flex)
- **@nuxtjs/i18n** – magyar (alap) és angol felület, zászlós nyelvválasztóval
- **Vitest** az automatikus tesztekhez

## Telepítés

```bash
yarn install          # a postinstall lefuttatja a prisma generate + nuxt prepare lépéseket
cp .env.example .env  # töltsd ki az értékeket
```

A `.env`-ben legalább ezek kellenek éles használathoz:

```bash
NUXT_PUBLIC_SITE_URL=https://qr24.hu
NUXT_SESSION_SECRET=$(openssl rand -base64 48)
NUXT_HASH_SECRET=$(openssl rand -base64 48)
```

## Adatbázis (Prisma)

A séma a [prisma/schema.prisma](prisma/schema.prisma) fájlban él, a migrációk a
`prisma/migrations` mappában. A Prisma CLI a `NUXT_DB_*` változókból állítja elő
a kapcsolatot ([prisma.config.ts](prisma.config.ts)), a futó alkalmazás ugyanezeket
a `runtimeConfig.db` értékeken keresztül használja. Az adatbázis és a felhasználó
neve alapértelmezés szerint `qr24` (`NUXT_DB_NAME`, illetve `NUXT_DB_USER`).

```bash
# adatbázis + migrációk + első admin fiók (ADMIN_EMAIL / ADMIN_PASSWORD)
yarn db:setup

# további fejlesztés közben
yarn db:migrate      # új migráció létrehozása és alkalmazása
yarn db:deploy       # meglévő migrációk alkalmazása (éles)
yarn db:studio       # adatok böngészése
```

A `db:setup` létrehozza az adatbázist, lefuttatja a migrációkat, majd létrehozza
vagy frissíti az adminisztrátort az `ADMIN_EMAIL` és `ADMIN_PASSWORD` alapján.
A jelszó scrypt-tel hashelve kerül a `admin_users` táblába.

## Fejlesztés

```bash
yarn dev        # http://localhost:3000
yarn typecheck  # vue-tsc + Nuxt típusellenőrzés
yarn test       # Vitest
yarn build      # éles build (.output)
yarn preview    # az éles build futtatása
```

## Admin felület

- `/admin` – bejelentkezés és vezérlőpult (dinamikus QR-kódok, statisztika)
- `/admin` alatt kezelhető a márkanév, az AdSense-azonosítók, a jogi
  szolgáltatói adatok és az oldalankénti SEO felülírás is.

A munkamenet HttpOnly, `SameSite=Lax` cookie-ban él; a végpontok admin
ellenőrzést, az írási műveletek same-origin ellenőrzést és rate limitet is
használnak.

## Fontok

A `app/assets/fonts` mappában lévő Google Sans Flex családot a
[main.css](app/assets/css/main.css) `@font-face` szabályai töltik be, a Tailwind
`font-sans` stack pedig első elemként erre hivatkozik. Új súly hozzáadásakor
elég a TTF-et a mappába tenni és egy `@font-face` blokkot felvenni.

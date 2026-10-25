# QR24 backend (Nitro)

Önálló Nitro 2 szerver: API, dinamikus QR-átirányítás, statisztika, admin végpontok.
A frontend a `/api/**` és `/r/**` hívásokat erre proxyzza, így a böngésző
számára minden ugyanazon az originon érhető el.

```bash
cp .env.example .env
yarn install
yarn db:deploy   # migrációk
yarn db:setup    # séma + admin fiók
yarn dev         # http://127.0.0.1:3001

yarn typecheck   # tsc --noEmit
yarn test        # vitest (biztonsági és rate limit tesztek)
yarn build       # .output/server/index.mjs
```

Fő könyvtárak:

- `server/api` – REST végpontok (auth, dynamic-qr, dashboard, admin, sitemap)
- `server/routes/r` – nyilvános átirányítás és állapotoldalak
- `server/utils` – Prisma, auth, rate limit, validáció, OAuth, audit, statisztika
- `shared` – a szerveroldalon használt közös típusok és segédek (a frontenddel
  szinkronban tartva)
- `prisma` – séma és migrációk

Részletes leírás: [a projekt gyökér README-je](../README.md).

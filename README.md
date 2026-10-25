# QR24.hu

A teljes alkalmazás egyetlen Nuxt 4 projekt a [`final/`](final) mappában: a
nyilvános oldalak, a QR-generátor, a fiókfelület, az adminisztráció és az API
ugyanabban a Nitro szerverben fut, a Nuxt hivatalos könyvtárstruktúrája szerint
(`app/`, `server/`, `shared/`, `prisma/`).

```bash
cd final
cp .env.example .env   # töltsd ki az adatbázis- és titokértékeket
yarn install
yarn db:deploy
yarn db:setup
yarn dev               # http://localhost:3000
```

Részletes leírás, API-táblázat, biztonsági szempontok és telepítés:
[final/README.md](final/README.md).

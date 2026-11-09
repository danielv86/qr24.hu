# Borítóképek – hova kerüljenek

Ide másold a legenerált képeket. A fájlnév **pontosan a cikk slugja**, kiterjesztés `.png`, `.jpg`, `.jpeg` vagy `.webp`:

```
blog-boritok/
  hogyan-mukodik-a-qr-kod.png
  statikus-vagy-dinamikus-qr-kod.png
  ...
```

Ezután szólj, és a `yarn blog:covers` parancs átmásolja őket a `storage/blog-media/` mappába (ez az éles képhely), az adatbázisba pedig csak a pár bájtos metaadat (azonosító, fájlnév, MIME, méret) kerül, és beállítja az adott cikk borítóképét (`/api/blog/media/<id>`).

Ez a mappa csak beadó láda: az import után törölhető, a képek a `storage/blog-media/` alatt maradnak. A blogképek helye a `BLOG_MEDIA_DIR` környezeti változóval áthelyezhető.

## Ajánlott paraméterek

- **Méret:** 1200×630 px (16:9-hez közeli), a lista 16:9-ben vágja.
- **Formátum:** JPG (legjobb fotószerű képeknél) vagy WebP; PNG is jó.
- **Fájlméret:** max. 4 MB (a blog médiafeltöltés korlátja), cél 200–500 KB.
- **Ne** legyen a képen szöveg: a címet a weboldal teszi a kártya alá.

## A 30 elvárt fájlnév

| # | Fájlnév | Cikk |
|---|---------|------|
| 1 | `hogyan-mukodik-a-qr-kod` | Hogyan működik valójában a QR-kód? |
| 2 | `statikus-vagy-dinamikus-qr-kod` | Statikus vagy dinamikus QR-kód? |
| 3 | `mekkora-legyen-a-qr-kod` | Mekkora legyen a QR-kód? |
| 4 | `kontraszt-es-szinek-a-qr-kodon` | Kontraszt és színek |
| 5 | `logo-a-qr-kod-kozepen` | Logó a QR-kód közepén |
| 6 | `hibajavitas-szintek-l-m-q-h` | Hibajavítási szintek: L, M, Q, H |
| 7 | `12-ok-amiert-nem-olvashato-a-qr-kod` | 12 ok, amiért nem olvasható |
| 8 | `etlap-qr-koddal-vendegelmeny` | Étlap QR-kóddal |
| 9 | `wifi-qr-kod-vendegnalozat` | Wi-Fi megosztás QR-kóddal |
| 10 | `vcard-qr-kod-nevjegykartya` | vCard QR-kód |
| 11 | `esemenyek-es-jegykezeles-qr-koddal` | Esemény és jegykezelés |
| 12 | `google-ertekeles-qr-koddal` | Google-értékelés QR-kóddal |
| 13 | `csomagolas-es-nyomon-kovetes-qr-koddal` | Csomagolás és nyomon követés |
| 14 | `nyomdai-elokeszites-vektoros-qr` | Nyomdai előkészítés |
| 15 | `qr-kod-es-gdpr` | QR-kód és GDPR |
| 16 | `kampanymers-utm-dinamikus-qr` | Kampánymérés |
| 17 | `tomeges-qr-kod-generalas-csv` | Tömeges QR-kód generálás |
| 18 | `kiskereskedelem-polccimke-akcio-qr` | Kiskereskedelem |
| 19 | `muzeumok-turizmus-rettegzett-tartalom` | Múzeumok, turizmus |
| 20 | `oktatas-qr-kod-a-tanoran` | Oktatás |
| 21 | `akadalymentesites-qr-kod` | Akadálymentesítés |
| 22 | `quishing-hamis-qr-kodok` | Quishing |
| 23 | `qr-nfc-rovid-link-osszehasonlitas` | QR, NFC vagy rövid link |
| 24 | `markaarculat-qr-kod-dizajn` | Márkaarculat |
| 25 | `qr-kod-e-mailben-es-sms-ben` | QR-kód e-mailben és SMS-ben |
| 26 | `out-of-home-plakat-kirakat-qr` | Kültéri QR-kódok |
| 27 | `hibaelharitas-a-kodom-nem-mukodik` | Hibaelhárítás |
| 28 | `dinamikus-qr-lejarat-kampanyzaras` | Lejárat és kampányzárás |
| 29 | `qr-kod-szolgaltatasban-ugyintezes` | QR-kód a szolgáltatásban |
| 30 | `qr-kod-jovoje-gs1-digital-link` | Mi jön a QR után? |

A képgeneráló promptok a `docs/blog-boritokepek-promptok.md` fájlban vannak, ugyanebben a sorrendben.

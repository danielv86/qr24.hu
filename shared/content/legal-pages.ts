import type { LegalPageContent } from './types'

const UPDATED = '2026. október 22.'

export const LEGAL_PAGES: LegalPageContent[] = [
  {
    slug: '/adatvedelmi-tajekoztato',
    title: 'Adatvédelmi tájékoztató',
    description:
      'Hogyan kezeli a QRKOD24.hu a személyes adatokat? Statikus QR-kódok, dinamikus kódok, adminisztráció, hirdetések és az érintetti jogok áttekintése.',
    h1: 'Adatvédelmi tájékoztató',
    intro: [
      'Ez a tájékoztató leírja, milyen személyes adatokat kezel a {{brandName}} webhely, milyen célból, meddig, és milyen jogok illetik meg az érintetteket. A statikus QR-kódok generálásához nem szükséges fiók, és az űrlapok tartalmát nem küldjük el a szervernek.',
      'A tájékoztató sablon, amelyet az üzemeltetőnek a saját működéséhez kell igazítania. Az üzemeltető adatait az admin felületen lehet megadni; ezek hiányában a jelen oldal nem minősül hiánytalan adatkezelési tájékoztatásnak.',
    ],
    requiresProviderData: true,
    sections: [
      {
        heading: '1. Adatkezelő',
        paragraphs: [
          'Adatkezelő: {{providerName}}, székhely: {{providerAddress}}, e-mail: {{providerEmail}}, telefon: {{providerPhone}}. Adószám: {{taxNumber}}. Cégjegyzékszám: {{registryNumber}}.',
          'Az adatkezelő a webhely üzemeltetője. A tárhelyszolgáltató: {{hostingProvider}}, címe: {{hostingAddress}}. A tárhelyszolgáltató a szerveroldali naplók és az infrastruktúra működtetése során adatfeldolgozóként járhat el.',
        ],
      },
      {
        heading: '2. Milyen adatokat kezelünk?',
        paragraphs: [
          'A statikus QR-kód generátor a böngészőben működik. Az űrlapba írt tartalmat – webcímet, telefonszámot, Wi-Fi-jelszót, névjegyadatot – nem küldjük el a szerverre, és nem tároljuk. A kész kód a saját eszközödön jön létre.',
          'A dinamikus QR-kód létrehozásakor a cél-URL-t, az opcionális címet, a nyilvános rövid azonosítót, a létrehozás és módosítás idejét, az aktív állapotot, valamint a szerkesztői token lenyomatát tároljuk. A szerkesztői tokent csak egyszer adjuk át, a nyers token nem kerül az adatbázisba. A beolvasásokról összesített, napi számlálót vezetünk; IP-címet nem tárolunk a statisztikában.',
          'Az adminisztrációhoz e-mail-címet, scrypt-tel hashelt jelszót, a sikertelen bejelentkezések számát és a munkamenet lenyomatát tároljuk. A munkamenet-cookie HttpOnly és SameSite=Lax beállítású.',
          'A biztonsági rate limithez a kérés forrásának azonosítójából képzett, titkos kulccsal hashelt értéket tárolunk rövid ideig. Ez az érték önmagában nem alkalmas a személy azonosítására, és nem kerül naplóba.',
        ],
      },
      {
        heading: '3. Hirdetések és hozzájárulás',
        paragraphs: [
          'Az oldal Google AdSense-hirdetéseket jeleníthet meg. A hirdetési és személyre szabási technológiák csak a marketing-hozzájárulás megadása után aktiválódnak. A hozzájárulás előtt a Google Consent Mode alapértéke „denied”, és az AdSense script nem töltődik be.',
          'A hozzájárulás önkéntes, bármikor visszavonható a lábléc „Sütibeállítások” menüpontjában. A hirdetések megjelenítéséhez kapcsolódó adatkezelés részleteit a Google adatvédelmi irányelvei és a hirdetési beállítások tartalmazzák. A webhely nem garantálja a Google AdSense jóváhagyását vagy a hirdetések megjelenését.',
        ],
      },
      {
        heading: '4. Jogalap, megőrzés és adattovábbítás',
        paragraphs: [
          'A statikus generátor használata és az oldal biztonságos működtetése jogos érdek. A dinamikus QR-kódok kezelése a szolgáltatás nyújtásához szükséges. Az adminisztráció jogos érdek és a rendszer védelme. A hirdetési sütikhez és a személyre szabott hirdetésekhez hozzájárulás szükséges.',
          'A dinamikus QR-kódokat a törlésig, illetve az üzemeltető által meghatározott ideig tároljuk. Az admin munkamenet legfeljebb 7 napig él. A rate limit bejegyzések rövid ideig, legfeljebb körülbelül egy napig maradnak meg. A szerveroldali hibanaplók személyes adatot nem tartalmaznak, és a hibaelhárításhoz szükséges ideig őrizzük meg őket.',
          'A Google-hirdetések és a tárhelyszolgáltatás révén adattovábbítás történhet az Európai Gazdasági Térségen kívülre. Ilyen esetben a szolgáltatók a vonatkozó adatvédelmi garanciákra támaszkodnak. Az adatkezelő köteles a saját szerződéseit és nyilatkozatait naprakészen tartani.',
        ],
      },
      {
        heading: '5. Az érintett jogai',
        paragraphs: [
          'Kérhetsz tájékoztatást a kezelt adatokról, kérheted azok helyesbítését, törlését vagy kezelésük korlátozását, tiltakozhatsz a jogos érdeken alapuló kezelés ellen, és visszavonhatod a hozzájárulásodat. A hozzájárulás visszavonása a korábbi kezelés jogszerűségét nem érinti.',
          'A kérelmeket a {{providerEmail}} címen lehet benyújtani. Az adatkezelő indokolatlan késedelem nélkül, legkésőbb egy hónapon belül válaszol. Panasz esetén a Nemzeti Adatvédelmi és Információszabadság Hatósághoz (NAIH, 1055 Budapest, Falk Miksa utca 9–11., ugyfelszolgalat@naih.hu, naih.hu) vagy bírósághoz fordulhatsz.',
        ],
      },
      {
        heading: '6. Biztonság és változások',
        paragraphs: [
          'Az adatbázis-hozzáférések paraméterezett lekérdezésekkel történnek, az adminisztrációt szerveroldali munkamenet-ellenőrzés és rate limit védi. A jelszavakat scrypt hash formájában tároljuk. A titkokat környezeti változókban kell tartani, és nem kerülhetnek a kliensoldali kódba.',
          'A tájékoztató módosításáról a webhelyen tájékoztatjuk a felhasználókat. A mindenkori hatályos változat ezen az oldalon érhető el.',
        ],
      },
    ],
    updated: UPDATED,
  },
  {
    slug: '/cookie-tajekoztato',
    title: 'Cookie-tájékoztató',
    description:
      'Milyen sütiket használ a QRKOD24.hu, mennyi ideig, és hogyan módosíthatod a hozzájárulásodat? A szükséges és a hirdetési sütik áttekintése.',
    h1: 'Cookie-tájékoztató',
    intro: [
      'A sütik kis szöveges fájlok, amelyeket a böngésző tárol a webhely működéséhez vagy méréshez. A {{brandName}} csak a szükséges sütiket használja alapból; a statisztikai és hirdetési kategóriák a hozzájárulásod után aktiválódnak.',
      'A hozzájárulásodat a lábléc „Sütibeállítások” gombjával bármikor módosíthatod. A döntés a böngésződben, egy saját sütiben kerül tárolásra, így a következő látogatáskor is emlékezni fogunk rá.',
    ],
    sections: [
      {
        heading: 'Szükséges sütik',
        paragraphs: [
          'Ezek a sütik a webhely alapvető működéséhez és a hozzájárulási döntés megjegyzéséhez kellenek, ezért nem kapcsolhatók ki.',
        ],
        bullets: [
          'qr_consent – a sütibeállításaidat tárolja, legfeljebb 180 napig. Nem tartalmaz személyes adatot.',
          'qr_admin – csak adminisztrátori bejelentkezéskor jön létre, HttpOnly és SameSite=Lax, legfeljebb 7 napig érvényes.',
        ],
      },
      {
        heading: 'Hirdetési sütik',
        paragraphs: [
          'A Google AdSense hirdetések a marketing-hozzájárulás megadása után töltődnek be. A Google és partnerei ekkor a saját szabályaik szerint helyezhetnek el sütiket és használhatnak hasonló technológiákat a hirdetések megjelenítéséhez, gyakoriságához és – hozzájárulás esetén – személyre szabásához.',
          'Hozzájárulás nélkül az AdSense script nem töltődik be, és a Google Consent Mode alapértéke „denied”. A hirdetésekkel kapcsolatos adatkezelésről a Google adatvédelmi és hirdetési irányelvei nyújtanak részletes tájékoztatást.',
        ],
      },
      {
        heading: 'Statisztika',
        paragraphs: [
          'Jelenleg a webhely nem használ harmadik féltől származó látogatottság-mérő eszközt. Az admin felület statisztikái a dinamikus QR-kódok szerveroldali, összesített számlálóin alapulnak, nem egyéni látogatók követésén.',
          'Ha a jövőben statisztikai eszközt vezetünk be, az csak a statisztikai hozzájárulás megadása után aktiválódik, és ezt a tájékoztatót frissítjük.',
        ],
      },
      {
        heading: 'Hogyan módosíthatod a döntésedet?',
        paragraphs: [
          'A láblécben található „Sütibeállítások” gomb újranyitja a hozzájárulási panelt. Ott külön kapcsolhatod a statisztikai és a hirdetési kategóriát, illetve vonhatod vissza a korábbi hozzájárulást.',
          'A böngésző beállításaiban a sütiket teljesen is törölheted vagy letilthatod. A szükséges sütik törlése után a hozzájárulási döntés elveszik, ezért a panel ismét megjelenhet. A sütik letiltása nem akadályozza a statikus QR-kód generálását.',
        ],
      },
    ],
    updated: UPDATED,
  },
  {
    slug: '/felhasznalasi-feltetelek',
    title: 'Felhasználási feltételek',
    description:
      'A QRKOD24.hu használatának feltételei: a szolgáltatás célja, megengedett használat, dinamikus QR-kódok, felelősség és a szerzői jogok.',
    h1: 'Felhasználási feltételek',
    intro: [
      'A {{brandName}} webhely használatával elfogadod az alábbi feltételeket. Ha nem értesz egyet, kérjük, ne használd a szolgáltatást. A feltételek a webhely mindenkori állapotára vonatkoznak.',
      'A statikus QR-kód generátor ingyenesen, regisztráció nélkül használható. A dinamikus QR-kódok és az adminisztráció külön biztonsági és üzemeltetési szabályok alá esnek.',
    ],
    sections: [
      {
        heading: '1. A szolgáltatás',
        paragraphs: [
          'A webhely eszközt biztosít QR-kódok létrehozásához és letöltéséhez. A generált kód minőségéért, a cél-URL elérhetőségéért és a beolvasás sikeréért a felhasználó felel, mert a tartalmat ő adja meg.',
          'A szolgáltatás fejlesztés alatt állhat, és egyes funkciók előzetes értesítés nélkül változhatnak. Az üzemeltető törekszik a folyamatos elérhetőségre, de nem garantálja, hogy a webhely minden pillanatban hibamentesen működik.',
        ],
      },
      {
        heading: '2. Megengedett használat',
        paragraphs: [
          'A QR-kódokat jogszerű célra használhatod. Tilos olyan tartalmat elhelyezni bennük, amely jogszabályba, harmadik fél jogába vagy a Google irányelveibe ütközik, például csalás, rosszindulatú szoftver, kéretlen reklám vagy jogsértő tartalom.',
          'Tilos a rendszert automatizált módon túlterhelni, a rate limiteket megkerülni, a biztonsági ellenőrzéseket kijátszani, vagy a dinamikus QR-kódokat belső hálózatok feltérképezésére használni. Az üzemeltető az ilyen használatot korlátozhatja.',
        ],
      },
      {
        heading: '3. Dinamikus QR-kódok',
        paragraphs: [
          'A dinamikus QR-kód létrehozásakor a cél-URL-t a rendszer biztonsági okból ellenőrzi. A rövid link a létrehozáskor kapott szerkesztői token birtokában módosítható vagy törölhető. A tokent őrizd biztonságos helyen; elvesztése esetén a kód kezeléséhez adminisztrátori segítségre lehet szükség.',
          'Az üzemeltető jogosult a jogsértő vagy visszaélésre használt dinamikus kódokat deaktiválni vagy törölni. A statisztikák összesített számlálók, amelyek nem azonosítanak egyéni látogatókat.',
        ],
      },
      {
        heading: '4. Szellemi tulajdon',
        paragraphs: [
          'A webhely saját tartalma, kódja és arculata az üzemeltetőt illeti meg. A generált QR-kód képfájlja szabadon felhasználható a felhasználó saját céljaira, a benne szereplő tartalom jogszerűségéért azonban a felhasználó felel.',
          'A harmadik felek védjegyei, logói és tartalmai a jogosultak tulajdonát képezik. A feltöltött logóval a felhasználó nyilatkozik arról, hogy jogosult annak használatára.',
        ],
      },
      {
        heading: '5. Felelősség és kapcsolat',
        paragraphs: [
          'A szolgáltatást „ahogy van” módon biztosítjuk. Az üzemeltető a jogszabályok által megengedett mértékben kizárja a QR-kód használatából eredő közvetett károkért való felelősséget. Ez nem érinti a fogyasztókat megillető kötelező jogokat.',
          'A feltételekkel kapcsolatos kérdéseket a {{providerEmail}} címen lehet feltenni. A szolgáltató adatait az impresszum és az adatvédelmi tájékoztató tartalmazza.',
        ],
      },
    ],
    updated: UPDATED,
  },
  {
    slug: '/impresszum',
    title: 'Impresszum',
    description:
      'A QRKOD24.hu webhely üzemeltetőjének, tárhelyszolgáltatójának és elérhetőségeinek adatai. A szolgáltatói adatok az admin felületen szerkeszthetők.',
    h1: 'Impresszum',
    intro: [
      'Az impresszum a webhely üzemeltetőjének és a közzétételért felelős személynek a jogszabályban előírt adatait tartalmazza. A tényleges szolgáltatói adatokat az üzemeltetőnek kell kitöltenie az admin felületen; a hiányzó adatokat nem helyettesítjük kitalált értékekkel.',
    ],
    requiresProviderData: true,
    sections: [
      {
        heading: 'Szolgáltató',
        paragraphs: [
          'Név: {{providerName}}. Székhely: {{providerAddress}}. E-mail: {{providerEmail}}. Telefon: {{providerPhone}}.',
          'Adószám: {{taxNumber}}. Cégjegyzékszám: {{registryNumber}}. A szolgáltató a fenti adatokért és a webhely tartalmáért felelős.',
        ],
      },
      {
        heading: 'Tárhelyszolgáltató',
        paragraphs: [
          'A webhely tárhelyszolgáltatója: {{hostingProvider}}, címe: {{hostingAddress}}. A tárhelyszolgáltató az infrastruktúra működtetéséért felel; a webhely tartalmáért nem.',
        ],
      },
      {
        heading: 'Szerzői jog és felelősség',
        paragraphs: [
          'A webhely saját szövegei, kódja és grafikai elemei szerzői jogi védelem alá esnek. A generált QR-kódok a felhasználó saját céljaira szabadon felhasználhatók, a bennük elhelyezett tartalomért azonban a felhasználó felel.',
          'A webhely külső hivatkozásokat tartalmazhat. A külső oldalak tartalmáért és adatkezeléséért a külső szolgáltatók felelnek. Hibabejelentést a {{providerEmail}} címen lehet tenni.',
        ],
      },
    ],
    updated: UPDATED,
  },
]

export const LEGAL_PAGE_MAP = new Map(LEGAL_PAGES.map(page => [page.slug, page]))

export function getLegalPage(slug: string): LegalPageContent | undefined {
  return LEGAL_PAGE_MAP.get(slug.startsWith('/') ? slug : `/${slug}`)
}

import type { ContentFaq, LandingPageContent } from './types'
import type { QrTypeId } from '../qr/types'
import { getQrType } from '../qr/content'

const UPDATED = '2026. október 22.'

/**
 * A típusonkénti aloldal URL-je. A kézzel írt oldalak és a generált oldalak
 * ugyanebből a térképből dolgoznak, így a belső linkek mindig helyesek.
 */
export const QR_TYPE_PATHS: Record<QrTypeId, string> = {
  url: '/url-qr-kod-generator',
  contact: '/kapcsolat-qr-kod-generator',
  social: '/kozossegi-qr-kod-generator',
  wifi: '/wifi-qr-kod-generator',
  bank: '/banki-qr-kod-generator',
  text: '/szoveg-qr-kod-generator',
  email: '/email-qr-kod-generator',
  phone: '/telefon-qr-kod-generator',
  sms: '/sms-qr-kod-generator',
  map: '/helyszin-qr-kod-generator',
  whatsapp: '/whatsapp-qr-kod-generator',
  event: '/esemeny-qr-kod-generator',
  'google-review': '/google-ertekeles-qr-kod-generator',
  paypal: '/paypal-qr-kod-generator',
  pdf: '/pdf-qr-kod-generator',
  app: '/app-qr-kod-generator',
  vcard: '/vcard-qr-kod-generator',
  'event-page': '/esemenyoldal-qr-kod-generator',
  menu: '/etlap-qr-kod-generator',
  coupon: '/kupon-qr-kod-generator',
  business: '/ceges-qr-kod-generator',
  feedback: '/visszajelzes-qr-kod-generator',
  form: '/urlap-qr-kod-generator',
  files: '/fajlok-qr-kod-generator',
  audio: '/hang-qr-kod-generator',
  gallery: '/galeria-qr-kod-generator',
  video: '/video-qr-kod-generator',
}

interface TypePageSeed {
  type: QrTypeId
  slug: string
  kicker: string
  description: string
  summary: string
  detail: string
  payload: string
  useCases: string[]
  tip: string
  faq: ContentFaq
  related: QrTypeId[]
}

const SEEDS: TypePageSeed[] = [
  {
    type: 'contact',
    slug: QR_TYPE_PATHS.contact,
    kicker: 'Névjegy és elérhetőség',
    description:
      'Kapcsolat QR-kód készítése névvel, telefonszámmal és e-mail-címmel. Beolvasás után a telefon egy koppintással elmenti a névjegyet.',
    summary:
      'A kapcsolat QR-kód egy rövid vCard névjegyet tartalmaz: nevet, telefonszámot, e-mail-címet és opcionálisan a céget. Beolvasás után a telefon felkínálja a névjegy mentését, így nem kell kézzel beírni az adatokat.',
    detail:
      'Névjegykártyára, szórólapra, konferenciás kitűzőre vagy e-mail aláírásba is kiváló. A statikus kód a böngésződben készül, az adatok nem kerülnek szerverre.',
    payload:
      'A kód szabványos vCard 3.0 formátumot tartalmaz, ezért az Android és az iOS névjegyalbuma egyaránt felismeri. A telefonszámot nemzetközi formára alakítjuk, így külföldről is működik.',
    useCases: [
      'Névjegykártya hátoldalára',
      'Konferencián kitűzőre vagy badge-re',
      'Üzletajtóra, recepcióra',
      'E-mail aláírásba vagy prezentációba',
    ],
    tip: 'Csak a szükséges adatokat add meg: a túl hosszú vCard nagyobb kódot eredményez, ami kis méretben nehezebben olvasható.',
    faq: {
      question: 'Miben más a kapcsolat QR-kód, mint a vCard QR-kód?',
      answer:
        'A kapcsolat típus a leggyakoribb mezőkre szűkített, gyors névjegyet készít. A vCard típus ennél részletesebb: címet, weboldalt, beosztást és megjegyzést is tartalmazhat, ha teljes névjegyet szeretnél.',
    },
    related: ['vcard', 'business', 'whatsapp'],
  },
  {
    type: 'social',
    slug: QR_TYPE_PATHS.social,
    kicker: 'Közösségi média',
    description:
      'Közösségi QR-kód Instagramhoz, Facebookhoz, TikTokhoz, LinkedInhez, YouTube-hoz vagy X-hez. Elég a felhasználónév, a kód a profilra visz.',
    summary:
      'A közösségi QR-kód egyetlen koppintással a profilodra viszi az olvasót. Elég a felhasználónevet megadni: a generátor felépíti a helyes profil-URL-t az adott platformon.',
    detail:
      'Használhatod kirakatban, csomagoláson, étlapon vagy eseményen, ahol a vendég gyorsan követni szeretne. Teljes profil-linket is beilleszthetsz, ha a felhasználóneved nem egyedi.',
    payload:
      'A kód a kiválasztott platform profil-URL-jét tartalmazza (például instagram.com/felhasznalonev). Ha teljes linket adsz meg, azt változtatás nélkül mentjük.',
    useCases: [
      'Kirakatban „Kövess minket” felirattal',
      'Csomagoláson vagy szórólapon',
      'Rendezvényen vetített dián',
      'Étlapon, asztali kártyán',
    ],
    tip: 'Egy kódot egy profilra használj. Ha több platformot szeretnél mutatni, készíts linkgyűjtő oldalt, és arra mutasson a QR-kód.',
    faq: {
      question: 'Miért nem működik a kód, ha a profilom privát?',
      answer:
        'A QR-kód csak megnyitja a profilt. Ha a fiók privát, a látogató csak a profil fejlécét látja, a tartalmakat nem – a követéshez kattintania kell. Nyilvános márkáknál ez nem probléma.',
    },
    related: ['url', 'video', 'app'],
  },
  {
    type: 'bank',
    slug: QR_TYPE_PATHS.bank,
    kicker: 'Átutalás és fizetés',
    description:
      'Banki QR-kód készítése IBAN-nal, kedvezményezettel és összeggel. A beolvasás után a banki alkalmazás kitölti az átutalás adatait.',
    summary:
      'A banki QR-kód SEPA-átutalási adatokat tartalmaz: kedvezményezettet, IBAN-t, opcionális BIC-et, összeget és közleményt. A beolvasó banki alkalmazás ezeket előre kitölti, így nem kell kézzel beírni hosszú számlaszámot.',
    detail:
      'Számlán, árajánlaton, webshop visszaigazoláson vagy adománygyűjtésnél hasznos. A generátor valódi mod-97 ellenőrzéssel vizsgálja az IBAN-t, így elgépelés esetén azonnal jelez.',
    payload:
      'A kód az EPC (European Payments Council) QR-formátumot használja: BCD fejléc, verzió, karakterkészlet, SCT átutalási típus, kedvezményezett, IBAN és az összeg. Ez a formátum a legtöbb európai banki appban működik.',
    useCases: [
      'Számla aljára befizetési adatokkal',
      'Adománygyűjtés az utcán',
      'Árajánlat vagy szerződés melléklete',
      'Piacos, kézműves értékesítés',
    ],
    tip: 'Az összeget hagyd üresen, ha a fizető maga dönthesse el, mennyit utal. A közleménybe írj számlaszámot vagy rendelésazonosítót, hogy könnyebb legyen párosítani a befizetést.',
    faq: {
      question: 'Minden bank támogatja a banki QR-kódot?',
      answer:
        'A legtöbb európai banki alkalmazás ismeri az EPC QR-formátumot, de nem mindegyik. Ha a saját bankod nem olvassa be, a kód mellett mindig tüntesd fel az IBAN-t szövegesen is.',
    },
    related: ['paypal', 'coupon', 'url'],
  },
  {
    type: 'map',
    slug: QR_TYPE_PATHS.map,
    kicker: 'Helyszín és útvonal',
    description:
      'Helyszín QR-kód címre vagy koordinátára. Beolvasás után a térképalkalmazás megnyitja a helyet, és egy koppintással útvonalat tervez.',
    summary:
      'A helyszín QR-kód vagy egy kész térképlinket, vagy címet, vagy GPS-koordinátát tartalmaz. Beolvasás után a telefon térképalkalmazása nyílik meg, ahonnan azonnal indítható az útvonaltervezés.',
    detail:
      'Hasznos meghívón, szállásleírásban, étlapon, parkolóban vagy fesztiválon. Címből Google Maps keresőlink készül, koordinátából pedig pontos helymegjelölés.',
    payload:
      'Cím esetén a kód egy Google Maps kereső URL-t tartalmaz, koordinátánál pedig a pontos szélesség-hosszúság párral nyitja meg a térképet. Kész térképlinket is beilleszthetsz, ha saját helyet szeretnél megosztani.',
    useCases: [
      'Meghívón a helyszín megjelölése',
      'Szállás és apartman tájékoztató',
      'Rendezvény parkoló vagy bejárat',
      'Étlap és szórólap „hogyan találj meg” résszel',
    ],
    tip: 'Koordinátát akkor használj, ha a cím nem egyedi (például egy tópart vagy fesztiválterület). A címhez mindig írd oda a várost is.',
    faq: {
      question: 'Milyen térképalkalmazásban nyílik meg a kód?',
      answer:
        'A kód egy szabványos Google Maps linket tartalmaz, ezért Androidon a Google Maps, iPhone-on pedig jellemzően a Maps vagy az Apple Térkép nyitja meg. Útvonaltervezés mindkét alkalmazásban elérhető.',
    },
    related: ['event', 'contact', 'event-page'],
  },
  {
    type: 'whatsapp',
    slug: QR_TYPE_PATHS.whatsapp,
    kicker: 'Ügyfélszolgálat',
    description:
      'WhatsApp QR-kód készítése előre kitöltött üzenettel. A beolvasó egy koppintással beszélgetést indít a számoddal.',
    summary:
      'A WhatsApp QR-kód a wa.me hivatkozást tartalmazza, benne a telefonszámmal és opcionálisan egy előre megírt üzenettel. Beolvasás után a WhatsApp megnyílik, és a felhasználónak már csak el kell küldenie az üzenetet.',
    detail:
      'Kiváló ügyfélszolgálati kód a webshopon, étlapon, szórólapon vagy a bolt ajtaján. Az előre kitöltött üzenet csökkenti a belépési küszöböt, és segít, hogy a megkeresés rögtön a lényeggel kezdődjön.',
    payload:
      'A kód a https://wa.me/<szám>?text=<üzenet> formátumot használja, a telefonszámot nemzetközi alakban. Ez a hivatalos, minden platformon működő WhatsApp link.',
    useCases: [
      'Webshop termékoldalán „Kérdésed van?” gomb helyett',
      'Étlapon rendeléshez',
      'Szolgáltatásnál időpontkéréshez',
      'Névjegykártyán vagy ajtóra ragasztva',
    ],
    tip: 'Az üzenetbe írd bele, mire számítasz: például „Szia! Időpontot szeretnék kérni.” Így a válasz is gyorsabb lesz.',
    faq: {
      question: 'Kell hozzá WhatsApp Business fiók?',
      answer:
        'Nem. A wa.me link sima WhatsApp-fiókkal is működik. Business fióknál viszont beállítható automatikus üdvözlőüzenet, ami sok megkeresésnél hasznos.',
    },
    related: ['contact', 'phone', 'sms'],
  },
  {
    type: 'event',
    slug: QR_TYPE_PATHS.event,
    kicker: 'Naptár és esemény',
    description:
      'Esemény QR-kód naptárbejegyzéssel: cím, időpont, helyszín. Beolvasás után a telefon egy koppintással hozzáadja a naptárhoz.',
    summary:
      'Az esemény QR-kód egy iCalendar (ICS) bejegyzést tartalmaz, amelyet a telefon naptára közvetlenül értelmez. Nincs szükség regisztrációra vagy külön alkalmazásra: a beolvasás után megjelenik a „Hozzáadás a naptárhoz” lehetőség.',
    detail:
      'Hasznos meghívón, plakáton, konferencián, esküvőn vagy workshopon. Az időpont és a helyszín pontosan kerül a naptárba, így nem marad el a esemény.',
    payload:
      'A kód VCALENDAR/VEVENT adatot tartalmaz kezdéssel, opcionális befejezéssel, helyszínnel, leírással és weboldallal. Az ékezeteket és a speciális karaktereket a szabvány szerint escape-eljük.',
    useCases: [
      'Meghívó nyomtatott változatán',
      'Konferenciaplakáton és badge-en',
      'Üzleti workshop meghívójában',
      'Esküvői vagy születésnapi meghívón',
    ],
    tip: 'Adj meg befejezési időpontot is: a naptárban így látszik, mennyi időt foglal le az esemény. Ha van regisztrációs oldal, azt is tedd bele.',
    faq: {
      question: 'Működik a kód Google Naptárral és Apple Naptárral is?',
      answer:
        'Igen. Az iCalendar formátum szabványos, ezért a Google Naptár, az Apple Naptár és az Outlook is felismeri. A beolvasás után a rendszer felajánlja az esemény importálását.',
    },
    related: ['event-page', 'map', 'contact'],
  },
  {
    type: 'paypal',
    slug: QR_TYPE_PATHS.paypal,
    kicker: 'Fizetés és támogatás',
    description:
      'PayPal QR-kód a PayPal.Me linkedhez, opcionálisan előre kitöltött összeggel. A beolvasó azonnal fizethet vagy támogathat.',
    summary:
      'A PayPal QR-kód a PayPal.Me profilodra mutat, és opcionálisan tartalmazhat összeget is. Beolvasás után a PayPal oldala nyílik meg, ahol a fizető már csak jóváhagyja a tranzakciót.',
    detail:
      'Hasznos szolgáltatásoknál, digitális termékeknél, adománygyűjtésnél vagy külföldi ügyfeleknél, ahol a kártyás fizetés nem kényelmes.',
    payload:
      'A kód a https://www.paypal.com/paypalme/<név> hivatkozást tartalmazza, összeg esetén /<összeg><pénznem> résszel (például /25.00EUR).',
    useCases: [
      'Szabadúszó számla mellékleteként',
      'Adománygyűjtő plakáton',
      'Digitális termék letöltési oldalán',
      'Külföldi ügyfeleknek szóló ajánlatban',
    ],
    tip: 'Fix összegnél mindig írd ki a pénznemet is. Ha bizonytalan az összeg, hagyd üresen, és a fizető maga adja meg.',
    faq: {
      question: 'Működik a PayPal.Me link minden országban?',
      answer:
        'A PayPal.Me a legtöbb országban elérhető, de néhány régióban korlátozott. Ha a linked nem nyílik meg, használj sima PayPal fizetési linket, és azt kódold QR-be.',
    },
    related: ['bank', 'coupon', 'business'],
  },
  {
    type: 'pdf',
    slug: QR_TYPE_PATHS.pdf,
    kicker: 'Dokumentum',
    description:
      'PDF QR-kód árlistához, katalógushoz vagy tájékoztatóhoz. A beolvasó azonnal megnyitja a PDF-et a telefonján.',
    summary:
      'A PDF QR-kód egy nyilvánosan elérhető PDF-fájl címét tartalmazza. Beolvasás után a telefon böngészője vagy PDF-olvasója nyitja meg a dokumentumot, letöltés nélkül is.',
    detail:
      'Árlista, termékkatalógus, étlap, használati útmutató vagy jogi tájékoztató – bármi, amit a papír helyett digitálisan szeretnél átadni.',
    payload:
      'A kód egy egyszerű https-hivatkozást tartalmaz a PDF-re. A fájlnak nyilvánosan elérhetőnek kell lennie; a generátor nem tölt fel és nem tárol dokumentumot.',
    useCases: [
      'Árlista a boltban vagy a bejáratnál',
      'Termékkatalógus vásáron',
      'Használati útmutató a csomagoláson',
      'Jogi vagy adatvédelmi tájékoztató papír helyett',
    ],
    tip: 'A PDF legyen mobilon is olvasható: álló tájolás, nagy betűk, és lehetőleg 5 MB alatti méret a gyors betöltéshez.',
    faq: {
      question: 'Feltölthetem a PDF-et a generátorba?',
      answer:
        'Nem, a statikus generátor nem tárol fájlt. A PDF-et tedd fel a saját tárhelyedre, Google Drive-ra vagy más nyilvános helyre, és annak linkjét add meg.',
    },
    related: ['files', 'menu', 'url'],
  },
  {
    type: 'app',
    slug: QR_TYPE_PATHS.app,
    kicker: 'Alkalmazás',
    description:
      'App QR-kód App Store-hoz vagy Google Play-hez. A beolvasó egy koppintással a megfelelő áruházban találja az alkalmazást.',
    summary:
      'Az app QR-kód az alkalmazás áruházi oldalára visz. Ha univerzális linket használsz, a telefon automatikusan a saját rendszerének megfelelő áruházat nyitja meg.',
    detail:
      'Hasznos weboldalon, szórólapon, termékcsomagoláson vagy rendezvényen, ahol az app telepítését szeretnéd ösztönözni.',
    payload:
      'A kód az áruházi (App Store vagy Google Play) hivatkozást tartalmazza. Univerzális link (például a fejlesztő saját átirányítója) esetén a kód mindkét platformon a megfelelő helyre visz.',
    useCases: [
      'Weboldal „Töltsd le az appot” szekciójában',
      'Termék csomagolásán',
      'Szórólapon vásárláskor',
      'Rendezvény standján',
    ],
    tip: 'Ha nincs univerzális linked, készíts két QR-kódot (iOS és Android), és a feliratban jelezd, melyik melyik.',
    faq: {
      question: 'Miért nyílik rossz áruház a kódból?',
      answer:
        'Mert a kód egy konkrét áruház linkjét tartalmazza. Androidon az App Store linkje nem nyílik meg, és fordítva. Ilyenkor univerzális linket vagy két külön kódot érdemes használni.',
    },
    related: ['url', 'video', 'app'],
  },
  {
    type: 'event-page',
    slug: QR_TYPE_PATHS['event-page'],
    kicker: 'Rendezvény',
    description:
      'Eseményoldal QR-kód részletes programmal, jelentkezéssel vagy jegyvásárlással. A beolvasó a saját eseményoldaladra jut.',
    summary:
      'Az eseményoldal QR-kód a rendezvényed saját weboldalára mutat, ahol a teljes program, a helyszín és a jelentkezés is helyet kaphat. A naptárbejegyzéssel ellentétben itt nem csak egy időpont, hanem a teljes információ áll rendelkezésre.',
    detail:
      'Plakátra, meghívóra, szórólapra vagy vetített diára tehető. Ha a program változik, elég az oldalt frissíteni – a kód ugyanaz marad.',
    payload:
      'A kód az eseményoldal https-címét tartalmazza. Minden további információt (program, jegyvásárlás, helyszín) maga az oldal szolgáltat.',
    useCases: [
      'Plakáton és szórólapon',
      'Jegyvásárlási folyamat elején',
      'Sajtóanyagban és hírlevélben',
      'Helyszíni információs táblán',
    ],
    tip: 'Az eseményoldalon legyen egyértelmű a dátum, a helyszín és a jelentkezés módja – ez a három információ hiányzik legtöbbször.',
    faq: {
      question: 'Módosítható a kód, ha változik a program?',
      answer:
        'A statikus kód címe nem változik, de az oldal tartalma igen. Ha az URL is változhat, használj dinamikus QR-kódot, amelynek célja utólag is átírható.',
    },
    related: ['event', 'form', 'map'],
  },
  {
    type: 'coupon',
    slug: QR_TYPE_PATHS.coupon,
    kicker: 'Akció és kedvezmény',
    description:
      'Kupon QR-kód akciós kóddal, opcionális beváltási linkkel. Beolvasás után a kód szövegként jelenik meg a kasszánál.',
    summary:
      'A kupon QR-kód tartalmazza a kedvezménykódot, amit a vásárló a kasszánál felmutathat. Opcionálisan hozzáadható egy beváltási link és egy rövid feltétel is.',
    detail:
      'Hasznos nyomtatott szórólapon, újsághirdetésben, vásárlói kártyán vagy csomagoláson. A kód szöveges tartalma minden beolvasóval olvasható, nem kell hozzá alkalmazás.',
    payload:
      'A kód szöveges tartalma „KUPON: <kód>” sorral kezdődik, majd opcionálisan a link és a feltétel következik. Így a kasszás és a vásárló is ugyanazt látja.',
    useCases: [
      'Nyomtatott akciós szórólap',
      'Vásárlói hűségkártya',
      'Csomagoláson belüli kedvezmény',
      'Rendezvény tombola vagy ajándék',
    ],
    tip: 'A kódot nagybetűvel írd, és kerüld az O/0, I/1 jellegű karaktereket, hogy kézzel is be lehessen gépelni.',
    faq: {
      question: 'Lejárhat a kupon QR-kód?',
      answer:
        'Technikailag nem jár le, mert a kód statikus. A lejáratot a feltételben tüntesd fel, vagy dinamikus QR-kódot használj, amelyet a kampány végén kikapcsolhatsz.',
    },
    related: ['paypal', 'menu', 'url'],
  },
  {
    type: 'business',
    slug: QR_TYPE_PATHS.business,
    kicker: 'Vállalkozás',
    description:
      'Céges QR-kód névjeggyel, elérhetőségekkel és nyitvatartással. Beolvasás után a telefon elmentheti a cég adatait.',
    summary:
      'A céges QR-kód egy szervezeti vCardot tartalmaz: cégnév, telefon, e-mail, weboldal, cím és nyitvatartás. Beolvasás után a telefon névjegyként mentheti el, így az ügyfélnek nem kell keresgélnie.',
    detail:
      'Kiváló üzletajtóra, recepcióra, számlára, szórólapra vagy B2B névjegykártyára. A nyitvatartás a névjegy megjegyzésébe kerül, így mentés után is megmarad.',
    payload:
      'A kód vCard 3.0 formátumban tartalmazza a cég nevét (ORG), elérhetőségeit, címét és a nyitvatartást NOTE mezőben.',
    useCases: [
      'Üzlet ajtajára és kirakatára',
      'Számla és árajánlat mellé',
      'B2B névjegykártyára',
      'Recepció és váró szórólapjára',
    ],
    tip: 'A nyitvatartást egységes formában add meg (például H–P 9:00–17:00), és csak akkor töltsd ki, ha valóban naprakész.',
    faq: {
      question: 'Miben más a céges, mint a vCard QR-kód?',
      answer:
        'A céges típus szervezetre optimalizált: a cégnév kerül a névjegy fő mezőjébe, és a nyitvatartás is helyet kap. A vCard típus egy személy teljes névjegyére készült.',
    },
    related: ['contact', 'vcard', 'map'],
  },
  {
    type: 'feedback',
    slug: QR_TYPE_PATHS.feedback,
    kicker: 'Vélemény és elégedettség',
    description:
      'Visszajelzés QR-kód elégedettségi kérdőívhez. A vendég a helyszínen, pár koppintással megoszthatja a véleményét.',
    summary:
      'A visszajelzés QR-kód egy kérdőív linkjére mutat. A vendég a helyszínen töltheti ki, így sokkal többen válaszolnak, mint egy utólag küldött e-mailre.',
    detail:
      'Hasznos étteremben, szállodában, szervizben vagy bármilyen szolgáltatásnál, ahol fontos a gyors visszacsatolás.',
    payload:
      'A kód a kérdőív (Google Űrlap, Microsoft Forms vagy saját űrlap) nyilvános címét tartalmazza.',
    useCases: [
      'Asztali kártyán étteremben',
      'Szállodai szobában',
      'Szerviz átadásakor',
      'Vásárlás utáni kártyán',
    ],
    tip: 'Tartsd rövidnek a kérdőívet: 3–5 kérdés és egy csillagos értékelés általában elég ahhoz, hogy valóban kitöltsék.',
    faq: {
      question: 'Hogyan jut el hozzám a visszajelzés?',
      answer:
        'A válaszok a kérdőív szolgáltatásában gyűlnek (például Google Űrlap vagy a saját adatbázisod). A QR-kód csak megnyitja az űrlapot, adatot nem tárol.',
    },
    related: ['form', 'google-review', 'menu'],
  },
  {
    type: 'form',
    slug: QR_TYPE_PATHS.form,
    kicker: 'Űrlap és jelentkezés',
    description:
      'Űrlap QR-kód jelentkezéshez, ajánlatkéréshez vagy adatfelvételhez. A beolvasó azonnal kitöltheti az űrlapot.',
    summary:
      'Az űrlap QR-kód egy online űrlapra mutat. A jelentkezés, ajánlatkérés vagy adatfelvétel így a helyszínen, papír nélkül történik, a válaszok pedig azonnal rendszerezhetők.',
    detail:
      'Hasznos vásárokon, rendezvényeken, ügyfélszolgálaton vagy oktatásban, ahol sokan töltenek ki adatot.',
    payload:
      'A kód a nyilvános űrlap címét tartalmazza (Google Űrlap, Microsoft Forms, Typeform vagy saját űrlap).',
    useCases: [
      'Vásári regisztráció',
      'Ajánlatkérés a termék mellett',
      'Kurzus- és workshop-jelentkezés',
      'Névjegy helyett kapcsolatfelvétel',
    ],
    tip: 'Az űrlap első kérdése legyen a legkönnyebb – így többen fejezik be a kitöltést. Mobilon teszteld a teljes folyamatot.',
    faq: {
      question: 'Kell hozzá saját weboldal?',
      answer:
        'Nem. Egy ingyenes Google Űrlap vagy Microsoft Forms is elegendő; a QR-kód egyszerűen annak nyilvános linkjére mutat.',
    },
    related: ['feedback', 'event-page'],
  },
  {
    type: 'files',
    slug: QR_TYPE_PATHS.files,
    kicker: 'Fájlmegosztás',
    description:
      'Fájlok QR-kód megosztott mappához vagy letöltési linkhez. A beolvasó telefonján azonnal elérheti a fájlt.',
    summary:
      'A fájlok QR-kód egy megosztott fájlra vagy mappára mutat. Így egy kód elég ahhoz, hogy a felhasználó hozzáférjen a dokumentumhoz, anélkül hogy hosszú linket kellene beírnia.',
    detail:
      'Hasznos számlák, szerződések, fotók vagy projektanyagok megosztására ügyfelekkel, partnerekkel.',
    payload:
      'A kód a megosztási linket tartalmazza. A hozzáférési szintet a felhőszolgáltatásnál kell beállítani (például „bárki, aki a linkkel rendelkezik”).',
    useCases: [
      'Számla és szerződés átadása',
      'Projektanyagok megosztása',
      'Fotók átadása ügyfélnek',
      'Garancia és használati útmutató',
    ],
    tip: 'Ellenőrizd, hogy a link nem kér bejelentkezést: ha igen, a beolvasó nem fogja elérni a fájlt.',
    faq: {
      question: 'Feltölthető a fájl közvetlenül?',
      answer:
        'Nem. A generátor nem tárhely: a fájlt a saját felhődbe (Drive, Dropbox, OneDrive) töltöd fel, és annak nyilvános linkjét kódolod.',
    },
    related: ['pdf', 'gallery', 'audio'],
  },
  {
    type: 'audio',
    slug: QR_TYPE_PATHS.audio,
    kicker: 'Hanganyag',
    description:
      'Hang QR-kód podcasthez, zenéhez vagy hangos útmutatóhoz. A beolvasó azonnal lejátszhatja a hanganyagot.',
    summary:
      'A hang QR-kód egy hangfájlra vagy streaming linkre mutat. Beolvasás után a telefon lejátszója vagy a streaming alkalmazás nyílik meg.',
    detail:
      'Hasznos múzeumi tárlatvezetésnél, termékbemutatónál, podcastnépszerűsítésnél vagy nyelvtanulásnál.',
    payload:
      'A kód a hanganyag nyilvános címét tartalmazza: közvetlen MP3 linket vagy streaming platform linkjét (Spotify, Apple Music, SoundCloud).',
    useCases: [
      'Kiállítás tárlatvezetése',
      'Podcast a szórólapon',
      'Hangos használati útmutató',
      'Zenei ajánló a lemezen',
    ],
    tip: 'Közvetlen MP3 linknél ügyelj arra, hogy a fájl gyorsan betölthető legyen – a nagy fájlokat érdemes tömöríteni.',
    faq: {
      question: 'Milyen formátumot használjak?',
      answer:
        'A legszélesebb támogatás miatt MP3-at válassz. Ha streaming platformra mutatsz, a látogatónak lehet, hogy fiókja kell a teljes lejátszáshoz.',
    },
    related: ['video', 'gallery', 'url'],
  },
  {
    type: 'gallery',
    slug: QR_TYPE_PATHS.gallery,
    kicker: 'Fotók',
    description:
      'Galéria QR-kód fotóalbumhoz vagy megosztott képgyűjteményhez. A beolvasó azonnal megnyitja a galériát.',
    summary:
      'A galéria QR-kód egy fotóalbum vagy megosztott mappa linkjére mutat. Így a vendégek egy kóddal elérik az esemény képeit, nem kell e-mail-címet gyűjteni.',
    detail:
      'Hasznos esküvőn, rendezvényen, étteremben vagy ingatlanbemutatón, ahol sok fotót szeretnél megosztani.',
    payload:
      'A kód a galéria nyilvános címét tartalmazza (Google Photos album, iCloud megosztás vagy saját galériaoldal).',
    useCases: [
      'Esküvői fotók megosztása',
      'Rendezvény utólagos galériája',
      'Étterem ételfotói',
      'Ingatlanbemutató képanyaga',
    ],
    tip: 'A galéria legyen mobilra optimalizált; a több száz nagy felbontású kép lassíthatja a megnyitást.',
    faq: {
      question: 'Meg tudják nézni a fotókat fiók nélkül?',
      answer:
        'Attól függ, hogyan osztod meg az albumot. A „bárki, aki a linkkel rendelkezik” beállításnál nem kell bejelentkezés; privát albumnál igen.',
    },
    related: ['video', 'files', 'event-page'],
  },
  {
    type: 'video',
    slug: QR_TYPE_PATHS.video,
    kicker: 'Videó',
    description:
      'Videó QR-kód YouTube-hoz, bemutatóhoz vagy oktatóvideóhoz. A beolvasó azonnal elindíthatja a videót.',
    summary:
      'A videó QR-kód egy videó linkjére mutat. Beolvasás után a YouTube vagy a böngésző nyílik meg, és a videó azonnal indítható.',
    detail:
      'Hasznos termékbemutatónál, használati útmutatónál, oktatásban vagy rendezvény utólagos tartalmainál.',
    payload:
      'A kód a videó nyilvános címét tartalmazza (például youtu.be rövid link). A videó nyilvános vagy „linkkel elérhető” beállítása szükséges.',
    useCases: [
      'Termék bemutatóvideó a csomagoláson',
      'Használati útmutató videó',
      'Oktatási anyag a tankönyvben',
      'Előadásfelvétel a konferencián',
    ],
    tip: 'Rövid, 1–3 perces videót használj, ha a kódot vásárlás közben olvassák be. Hosszabb tartalomnál a leírásban jelezd a témákat.',
    faq: {
      question: 'Működik a kód akkor is, ha a videó nem nyilvános?',
      answer:
        'Nem. „Nem listázott” videó linkkel megnyitható, de privát videóhoz bejelentkezés kell. Nyilvános vagy nem listázott videót használj.',
    },
    related: ['audio', 'gallery', 'url'],
  },
]

function genericFaqs(typeId: QrTypeId): ContentFaq[] {
  const label = getQrType(typeId).label
  return [
    {
      question: `Ingyenes a(z) ${label.toLowerCase()} QR-kód készítése?`,
      answer:
        'Igen. A generátor regisztráció nélkül használható, a statikus kód a böngésződben készül, és PNG, JPG, SVG vagy PDF formátumban tölthető le.',
    },
    {
      question: 'Módosítható a kód tartalma később?',
      answer:
        'A statikus QR-kód tartalma a képbe kerül, ezért utólag nem írható át. Ha a cél változhat, készíts dinamikus QR-kódot, amely egy saját rövid címre mutat.',
    },
    {
      question: 'Milyen méretben érdemes nyomtatni?',
      answer:
        'Nyomtatásban legalább 2,5–3 cm széles kódot használj, és hagyj körülötte csendes zónát. A vektoros SVG export nyomdai méretezéshez a legbiztonságosabb.',
    },
  ]
}

function buildPage(seed: TypePageSeed): LandingPageContent {
  const definition = getQrType(seed.type)
  const label = definition.label
  const related = seed.related.map((id) => {
    const relatedDefinition = getQrType(id)
    return {
      label: `${relatedDefinition.label} QR-kód generátor`,
      to: QR_TYPE_PATHS[id],
      description: relatedDefinition.description,
    }
  })

  return {
    slug: seed.slug,
    title: `${label} QR-kód generátor – ingyenes, regisztráció nélkül`,
    description: seed.description,
    h1: `${label} QR-kód generátor`,
    kicker: seed.kicker,
    intro: [seed.summary, seed.detail],
    qrType: seed.type,
    sections: [
      {
        heading: `Mit tartalmaz a(z) ${label.toLowerCase()} QR-kód?`,
        paragraphs: [seed.payload],
        bullets: seed.useCases,
      },
      {
        heading: `${label} QR-kód készítése három lépésben`,
        paragraphs: [
          `Nyisd meg a generátort, válaszd a(z) ${label.toLowerCase()} típust, majd töltsd ki a mezőket. Az előnézet gépelés közben frissül, így azonnal látod a kész kódot.`,
        ],
        bullets: [
          'Válaszd ki a típust a menüből – az űrlap ehhez igazodik.',
          'Add meg a tartalmat, majd ellenőrizd az előnézetet.',
          'Töltsd le PNG, JPG, SVG vagy PDF formátumban, és teszteld telefonnal.',
        ],
        tip: seed.tip,
      },
      {
        heading: 'Kinek ajánlott?',
        paragraphs: [
          `A(z) ${label.toLowerCase()} QR-kód akkor jó választás, ha a beolvasónak egyetlen koppintással el kell érnie a tartalmat. ${seed.detail}`,
        ],
      },
    ],
    faqs: [seed.faq, ...genericFaqs(seed.type)],
    related: [
      { label: 'QR-kód generátor', to: '/qr-kod-generator' },
      ...related,
    ],
    updated: UPDATED,
  }
}

export const TYPE_PAGES: LandingPageContent[] = SEEDS.map(buildPage)

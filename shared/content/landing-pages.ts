import type { LandingPageContent } from './types'
import { TYPE_PAGES } from './type-pages'

const UPDATED = '2026. október 22.'

export const LANDING_PAGES: LandingPageContent[] = [
  {
    slug: '/qr-kod-generator',
    title: 'QR-kód generátor – ingyenes, regisztráció nélkül',
    description:
      'Ingyenes QR-kód generátor magyarul: 28 típus, élő előnézet, logó és színek, PNG-, JPG-, SVG- és PDF-letöltés. Nem kell regisztrálni, a kód a böngésződben készül.',
    h1: 'Ingyenes QR-kód generátor',
    kicker: 'Online QR-eszköz',
    intro: [
      'A QR24.hu generátorával néhány másodperc alatt készíthetsz működő QR-kódot weboldalhoz, Wi-Fi-hálózathoz, névjegyhez, e-mailhez vagy éppen egy eseményhez. Nincs regisztráció, nincs kötelező e-mail-cím, és a statikus kód előállítása a böngésződben történik.',
      'Válaszd ki a kívánt típust, töltsd ki az űrlapot, majd állítsd be a színeket, a formákat, a keretet és a logót. Az előnézet minden módosításnál azonnal frissül, a kész kódot pedig PNG, JPG, WebP, SVG vagy PDF formátumban töltheted le.',
    ],
    qrType: 'url',
    showGenerator: true,
    sections: [
      {
        heading: 'Hogyan készül el a QR-kód?',
        paragraphs: [
          'A generátor a megadott tartalomból szabványos QR-kódot állít elő. A kód hordozza a szöveget, a linket vagy a névjegy adatait, ezért beolvasás után a telefon kamerája vagy egy QR-olvasó alkalmazás közvetlenül a megfelelő műveletet ajánlja fel.',
          'A statikus QR-kód tartalma a képfájlba kerül, így a létrehozás után nem módosítható. Ha később is szeretnéd átírni a célt – például egy étlap vagy kampány linkjét –, használj dinamikus QR-kódot, amely egy rövid címre mutat.',
        ],
        bullets: [
          'Válaszd ki a QR-kód típusát a felső fülek közül.',
          'Töltsd ki az űrlapot; a mezők mellett azonnal látod az esetleges hibákat.',
          'Szabd testre a megjelenést, majd ellenőrizd az előnézetet.',
          'Töltsd le PNG-ben képhez, SVG-ben nyomdai méretezéshez.',
        ],
        tip: 'Nyomtatás előtt mindig olvasd be a kódot legalább két különböző telefonnal, és kézzel is mérd meg a tervezett méretet.',
      },
      {
        heading: 'Milyen QR-kódot készíthetsz?',
        paragraphs: [
          'A generátor 28 használati esetet támogat, így a leggyakoribb üzleti és magáncélokhoz nem kell külön alkalmazást keresned. A weboldal, a szöveg, a telefonszám, az e-mail, az SMS, a Wi-Fi, a vCard névjegy, a WhatsApp, a közösségi profil, a Google-értékelés, a térkép és az esemény mellett ott van a banki átutalás, a PayPal, a PDF, a kupon, az étlap, a linkgyűjtő és a visszajelzés is – mind saját, célzott űrlappal.',
          'A speciális karaktereket – ékezeteket, sortöréseket, nemzetközi telefonszámokat – a generátor a megfelelő szabvány szerint kódolja, így a magyar nevek és címek is helyesen jelennek meg a beolvasás után.',
        ],
      },
      {
        heading: 'Testreszabás és letöltés',
        paragraphs: [
          'Az előtér- és háttérszín mellett a pontok, a sarokelemek és a belső szemek stílusa is állítható. Kész színsablonokkal gyorsan kipróbálhatsz egy márkához illő kombinációt, középre pedig logót tölthetsz fel. A méret, a hibajavítási szint és a csendes zóna is beállítható.',
          'A PNG kiváló webes felhasználásra és üzenetküldésre, az SVG pedig vektoros formátumként nyomdai méretezéshez. A letöltött fájl mindig tartalmazza a beállított margót és keretet, ezért a kód szélei nem vágódnak le.',
        ],
      },
      {
        heading: 'Hogyan marad jól beolvasható?',
        paragraphs: [
          'A legfontosabb a megfelelő kontraszt: sötét minta világos háttéren működik a legmegbízhatóbban. A nagyon halvány színek, a világos minta sötét alapon vagy a túl nagy logó ronthatja az olvashatóságot, ezért a generátor figyelmeztet, ha veszélyt észlel.',
          'Hagyj elegendő csendes zónát a kód körül, és ne zsúfolj egymásra több elemet. Kis méretnél – például névjegykártyán – növeld a hibajavítást, és a nyomtatás után ellenőrizd a kódot a valós méretben.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Valóban ingyenes a QR-kód generátor?',
        answer:
          'Igen. A statikus QR-kódok létrehozása és letöltése regisztráció nélkül, díjmentesen használható. Az oldal fenntartását hirdetések segítik, de a generátor működéséhez nem kell hozzájárulnod hirdetési sütikhez.',
      },
      {
        question: 'Regisztrálni kell a letöltéshez?',
        answer:
          'Nem. A generátor használatához nem kérünk e-mail-címet vagy fiókot. A statikus kód a böngésződben készül, a megadott tartalmat nem küldjük el a szervernek.',
      },
      {
        question: 'Módosítható később a elkészített QR-kód?',
        answer:
          'A statikus QR-kód tartalma a képbe van kódolva, ezért utólag nem lehet átírni. Ha a cél-URL-nek változnia kell, készíts dinamikus QR-kódot, amely egy rövid címre mutat, és a cél a szerveren módosítható.',
      },
      {
        question: 'Melyik formátumot válasszam: PNG vagy SVG?',
        answer:
          'Képernyőre, közösségi médiára és gyors megosztásra a PNG praktikus. Nyomdára, plakátra vagy bármilyen méretezhető felületre az SVG a jobb választás, mert vektoros és minőségvesztés nélkül nagyítható.',
      },
      {
        question: 'Milyen méretben érdemes nyomtatni?',
        answer:
          'A pontos méret a beolvasási távolságtól függ. Kézben tartott telefonhoz általában 2 × 2 cm már elég lehet, de üzleti használatban 3–4 cm biztonságosabb. Nagy távolságból – plakátnál – a kódnak lényegesen nagyobbnak kell lennie.',
      },
    ],
    related: [
      { label: 'QR-kód készítés útmutató', to: '/qr-kod-keszites', description: 'A tervezéstől a tesztelésig.' },
      { label: 'Wi-Fi QR-kód', to: '/wifi-qr-kod-generator', description: 'Vendéghálózat megosztása.' },
      { label: 'vCard QR-kód', to: '/vcard-qr-kod-generator', description: 'Névjegy mentése egy beolvasással.' },
      { label: 'QR-kód nyomtatásra', to: '/qr-kod-nyomtatasra', description: 'Méretek és anyagok.' },
    ],
    updated: UPDATED,
  },
  {
    slug: '/qr-kod-keszites',
    title: 'QR-kód készítés lépésről lépésre – gyakorlati útmutató',
    description:
      'Így készíts használható QR-kódot: típusválasztás, tartalom, design, tesztelés és nyomtatás. Gyakorlati tippek magyarul, ingyenes generátorral.',
    h1: 'QR-kód készítés lépésről lépésre',
    kicker: 'Gyakorlati útmutató',
    intro: [
      'Egy jól elkészített QR-kód nem csak négyzetes minta: mögötte tudatos döntés van arról, milyen tartalmat, milyen méretben és milyen helyzetben szeretnénk átadni. Ez az útmutató végigvezet a folyamaton a cél meghatározásától a nyomtatott kód ellenőrzéséig.',
      'Az itt leírt lépések a QR24.hu generátorával azonnal kipróbálhatók. A statikus kódokhoz nem kell fiók, és a kész fájlt bármikor újragenerálhatod, ha változik a tartalom.',
    ],
    sections: [
      {
        heading: '1. Határozd meg, mit csináljon a kód',
        paragraphs: [
          'Kezdd a céllal: a beolvasó nyisson meg egy weboldalt, csatlakozzon a Wi-Fi-hez, mentse el a névjegyet, vagy indítson hívást? A QR-kód típusa ebből következik. Ha a cél egy később is változtatható link, a statikus kód helyett dinamikus megoldást érdemes választani.',
          'Gondold át azt is, hol fog találkozni a kóddal a felhasználó: kézben tartott szórólapon, kirakatban, étlapon, névjegykártyán vagy vetítővásznon. A helyzet meghatározza a szükséges méretet és a kontrasztot.',
        ],
      },
      {
        heading: '2. Készítsd el a tartalmat',
        paragraphs: [
          'A rövid, egyértelmű tartalom a legjobb. Webcímnél használj pontos, működő URL-t; telefonszámnál nemzetközi formátumot; Wi-Fi-nél pedig ellenőrizd a hálózat nevét és jelszavát. A magyar ékezeteket nyugodtan használhatod, a generátor UTF-8-ként kódolja őket.',
          'Wi-Fi-jelszó és személyes adatok esetén légy tudatos: a statikus kód tartalma bárki számára olvasható, aki beolvassa. Nyilvános helyen ne tegyél ki olyan kódot, amely érzékeny adatot tartalmaz.',
        ],
      },
      {
        heading: '3. Tervezd meg a megjelenést',
        paragraphs: [
          'A márkaszínek használhatók, de a kontraszt legyen erős. A sötét előtér és a világos háttér kombinációja a legbiztonságosabb; a fordított vagy alacsony kontrasztú változatokat érdemes elkerülni. Logó csak akkor kerüljön középre, ha a hibajavítási szint H, és a logó nem takarja a kód jelentős részét.',
          'A csendes zóna – a kód körüli üres sáv – nem díszítés, hanem a beolvasó alkalmazásnak segít megtalálni a kód határait. Ne vágd le, és ne helyezz közvetlenül a kód mellé más grafikát.',
        ],
        tip: 'Nyomdai anyaghoz SVG-t használj, és a tervezőprogramban ne méretezd át képpontos formátumból.',
      },
      {
        heading: '4. Teszteld valós körülmények között',
        paragraphs: [
          'A képernyőn jól kinéző kód nem garantálja a nyomtatott változat sikerét. Olvasd be a kódot legalább kétféle telefonnal, nappali fényben és mesterséges megvilágításnál is. Ellenőrizd, hogy a link valóban a megfelelő oldalra visz, és nem kér bejelentkezést vagy hibás címre mutat.',
          'Kis méretnél és görbült felületen – például palackon vagy csomagoláson – különösen fontos a teszt. Ha a kód csak közelről olvasható, növeld a méretet vagy csökkentsd a benne lévő adat mennyiségét.',
        ],
      },
      {
        heading: '5. Helyezd el és mérd az eredményt',
        paragraphs: [
          'A kód legyen jól látható, ne legyen tükröződő felület mögött, és ne kerüljön túl magasra vagy túl alacsonyra. Éttermi asztalon például a kódot tartalmazó kártyát érdemes tartóba tenni, hogy ne csússzon el és ne sérüljön.',
          'Ha dinamikus QR-kódot használsz, a scanszámokból láthatod, mennyien olvassák be. Ez segít eldönteni, melyik elhelyezés és melyik tartalom működik – de a számokat óvatosan értelmezd, mert a robotok és az ismételt beolvasások is növelhetik őket.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Mennyi idő alatt készül el egy QR-kód?',
        answer:
          'A generátorban a tartalom megadása után azonnal megjelenik az előnézet, a letöltés pedig néhány másodperc. A valódi időigényt inkább a tartalom ellenőrzése és a nyomtatási teszt jelenti.',
      },
      {
        question: 'Használhatok ékezetes szöveget a QR-kódban?',
        answer:
          'Igen. A generátor UTF-8 kódolást használ, ezért a magyar ékezetek és a nemzetközi karakterek helyesen jelennek meg a modern beolvasókban. Nagyon régi olvasóknál előfordulhat karakterhiba, de ez ma már ritka.',
      },
      {
        question: 'Mikor érdemes dinamikus QR-kódot választani?',
        answer:
          'Ha a cél-URL később változhat, ha szeretnéd letiltani a régi kódot, vagy ha szeretnéd látni az olvasások számát. A statikus kód ezzel szemben egyszerűbb, nem függ szervertől, és örökre ugyanazt a tartalmat hordozza.',
      },
      {
        question: 'Egy QR-kódban lehet több információt tárolni?',
        answer:
          'Lehet, de a több adat sűrűbb mintát és nagyobb kódot eredményez, ami kis méretben nehezebben olvasható. Több információhoz érdemes inkább egy weboldalra mutató kódot használni, ahol minden részlet megtalálható.',
      },
    ],
    related: [
      { label: 'QR-kód generátor', to: '/qr-kod-generator' },
      { label: 'QR-kód nyomtatásra', to: '/qr-kod-nyomtatasra' },
      { label: 'Wi-Fi QR-kód készítése', to: '/wifi-qr-kod-generator' },
    ],
    updated: UPDATED,
  },
  {
    slug: '/url-qr-kod-generator',
    title: 'URL QR-kód készítése – weboldal QR-kód generátor',
    description:
      'Készíts URL QR-kódot weboldaladhoz, kampányodhoz vagy közösségi profilodhoz. Ingyenes, azonnal letölthető PNG és SVG, hasznos linkelési tippekkel.',
    h1: 'URL QR-kód készítése',
    kicker: 'Weboldal és kampány',
    intro: [
      'Az URL QR-kód a legelterjedtebb QR-típus: beolvasás után a telefon böngészője megnyitja a megadott weboldalt. Jól használható szórólapon, csomagoláson, kirakatban, rendezvényen vagy éppen egy prezentáció utolsó diáján.',
      'A generátorban elég beírni a webcímet, és azonnal látod a működő kódot. Ha nem adsz meg protokollt, automatikusan https:// kerül a cím elé, így a link a legtöbb böngészőben gond nélkül megnyílik.',
    ],
    qrType: 'url',
    sections: [
      {
        heading: 'Mire használható az URL QR-kód?',
        paragraphs: [
          'Kampányoldalon, termékoldalon, árajánlaton, étlapon vagy eseményregisztrációnál egyaránt működik. A kódot nyomtatott anyagra teheted, de digitális felületen – e-mailben, PDF-ben, videóban – is megoszthatod.',
          'Ha egy hosszú linket szeretnél rövidebbé tenni, használhatsz saját rövid URL-t vagy dinamikus QR-kódot. Utóbbi esetében a kód mindig a saját rövid címedre mutat, és a mögötte lévő cél később is módosítható.',
        ],
        bullets: [
          'Termék- vagy akcióoldal megnyitása',
          'Eseményregisztráció és jegyvásárlás',
          'Árajánlat, katalógus vagy PDF letöltése',
          'Közösségi profil vagy hírlevél-feliratkozás',
        ],
      },
      {
        heading: 'Linkelési tippek kampányhoz',
        paragraphs: [
          'Használj UTM-paramétereket, ha tudni szeretnéd, honnan érkeznek a látogatók. A kód célja lehet például egy olyan kampányoldal, amelynek címében ott van a forrás és a médium. Így a webanalitika megmutatja, hogy a nyomtatott vagy a digitális megjelenés hozott-e több látogatót.',
          'Ügyelj arra, hogy a céloldal mobilon is jól működjön. A QR-kódot szinte mindig telefonnal olvassák be, ezért a lassú betöltés, a túl kicsi betű vagy az agresszív felugró ablak sok látogatót elriaszthat.',
        ],
      },
      {
        heading: 'HTTPS, domain és ellenőrzés',
        paragraphs: [
          'Lehetőleg HTTPS-címet használj. A böngészők egyre szigorúbban jelzik a nem biztonságos oldalakat, és a felhasználók is bizalmatlanabbak lehetnek, ha a link http://-vel kezdődik. Ellenőrizd, hogy a domain valóban a tiéd, és a cím ne mutasson átirányítási láncra.',
          'A letöltés előtt olvasd be a kész kódot telefonnal, és nézd meg, hogy a megfelelő oldal nyílik-e meg. Ha a link hosszú, rövidítsd, de ne használj ismeretlen, lejáró rövidítőt, mert a kód évekig a nyomtatott anyagon maradhat.',
        ],
        tip: 'A nyomtatott kód mellett érdemes kiírni a rövid URL-t is: aki nem tudja vagy nem akarja beolvasni, kézzel is be tudja írni.',
      },
    ],
    faqs: [
      {
        question: 'Kell a link végére https://?',
        answer:
          'Nem kötelező: ha elhagyod, a generátor https:// előtagot tesz a cím elé. Érdemes azonban a pontos, működő címet megadni, hogy a kód pontosan azt nyissa meg, amit szeretnél.',
      },
      {
        question: 'Használhatok rövidített linket?',
        answer:
          'Igen, de csak megbízható szolgáltatást válassz, és ellenőrizd, hogy a rövidítés nem jár le. Hosszú távú nyomtatott anyaghoz inkább saját domainen lévő rövid cím vagy dinamikus QR-kód ajánlott.',
      },
      {
        question: 'Mérik a beolvasásokat?',
        answer:
          'A statikus URL QR-kód önmagában nem mér. A céloldal analitikája viszont láthatja a látogatást, különösen ha UTM-paramétert használsz. Dinamikus QR-kódnál a rendszer a saját scanszámlálót is vezeti.',
      },
      {
        question: 'Miért nem nyílik meg a link a beolvasás után?',
        answer:
          'Ellenőrizd, hogy a cím szerepel-e a kódban, és hogy nem tartalmaz-e elgépelést. Nézd meg, hogy a weboldal elérhető-e, és hogy nem blokkolja-e a böngésző a linket. A kódot érdemes több olvasóval is kipróbálni.',
      },
    ],
    related: [
      { label: 'QR-kód generátor', to: '/qr-kod-generator' },
      { label: 'QR-kód készítés útmutató', to: '/qr-kod-keszites' },
      { label: 'QR-kód nyomtatásra', to: '/qr-kod-nyomtatasra' },
    ],
    updated: UPDATED,
  },
  {
    slug: '/szoveg-qr-kod-generator',
    title: 'Szöveg QR-kód készítése – jegyzet, utasítás, információ',
    description:
      'Szöveg QR-kódot készíthetsz jegyzethez, utasításhoz vagy rövid információhoz. Ékezetkezelés, sortörések, karakterlimit és gyakorlati példák.',
    h1: 'Szöveg QR-kód készítése',
    kicker: 'Egyszerű szöveges tartalom',
    intro: [
      'A szöveg QR-kód nem nyit meg weboldalt és nem indít hívást: a beolvasó alkalmazás egyszerűen megjeleníti a benne tárolt szöveget. Ez akkor hasznos, ha nincs mögötte weboldal, vagy ha a fontos információt azonnal, offline is szeretnéd átadni.',
      'A generátor a magyar ékezeteket és a sortöréseket is megtartja. A szöveget a böngésződben kódolja, így a beírt tartalom nem kerül fel a szerverre.',
    ],
    qrType: 'text',
    sections: [
      {
        heading: 'Mire jó a szöveges QR-kód?',
        paragraphs: [
          'Használható rövid eligazításhoz, gépek melletti instrukcióhoz, szállodai szobában a recepció elérhetőségéhez, rendezvényen programinformációhoz vagy akár egy üzenethez, amelyet szeretnél átadni valakinek.',
          'Előnye, hogy nem függ külső weboldaltól: a szöveg a kódban van. Hátránya, hogy hosszabb szövegnél a kód sűrűbb lesz, ezért csak rövid, jól tagolt tartalmat érdemes beletenni.',
        ],
      },
      {
        heading: 'Karakterek, ékezetek és sortörések',
        paragraphs: [
          'A magyar ábécé betűi UTF-8 kódolással kerülnek a kódba, így az „ő”, „ű”, „á” és a többi ékezetes karakter is helyesen jelenik meg a modern telefonokon. A sortöréseket a generátor változatlanul átadja, így több soros utasítást is olvashatóan tudsz tárolni.',
          'A QR-kód kapacitása véges: minél hosszabb a szöveg, annál több modulból áll a minta. Rövid szövegnél kisebb, tisztább kódot kapsz, ami nyomtatásban is jobban olvasható. Több bekezdéshez érdemes inkább weboldalt vagy PDF-et használni.',
        ],
        tip: 'Használj rövid sorokat és egyértelmű címkéket. A beolvasó alkalmazásokban a hosszú, tördelt szöveg nehezen olvasható.',
      },
      {
        heading: 'Példák és elhelyezés',
        paragraphs: [
          'Egy kávégép mellett például szerepelhet a tisztítási sorrend, egy irodában a Wi-Fi helyett a nyomtató beállításainak rövid leírása, egy ajándékon pedig egy személyes üzenet. A kódot érdemes olyan helyre tenni, ahol a beolvasás után van idő elolvasni a szöveget.',
          'Ha a szöveg bizalmas, ne felejtsd el: a QR-kód nem titkosítás. Bárki beolvashatja, aki látja. Bizalmas adatot ne tegyél statikus QR-kódba.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Hány karakter fér bele egy szöveg QR-kódba?',
        answer:
          'A befogadóképesség a hibajavítási szinttől és a karakterektől függ, elméletileg több ezer karakter is beletehető. A gyakorlatban azonban a rövid, 100–300 karakteres szöveg olvasható igazán jól, különösen nyomtatásban.',
      },
      {
        question: 'Megmaradnak a sortörések?',
        answer:
          'Igen, a generátor a beírt sortöréseket megtartja. A megjelenítés módja a beolvasó alkalmazástól függ, de a szöveg tartalma nem változik.',
      },
      {
        question: 'Használhatok emojit a szövegben?',
        answer:
          'Igen, a modern beolvasók az emojikat is megjelenítik. Nagyon régi eszközökön előfordulhat, hogy négyzet vagy kérdőjel látszik helyettük, ezért üzleti anyagra csak mértékkel ajánlott.',
      },
      {
        question: 'Biztonságos személyes adatot szöveg QR-kódban tárolni?',
        answer:
          'Nem. A statikus QR-kód tartalma bárki számára olvasható, aki beolvassa. Jelszót, bankkártyaadatot vagy más érzékeny információt ne tegyél bele.',
      },
    ],
    related: [
      { label: 'Szöveg QR-kód generátor', to: '/qr-kod-generator?type=text' },
      { label: 'vCard QR-kód', to: '/vcard-qr-kod-generator' },
      { label: 'QR-kód készítés útmutató', to: '/qr-kod-keszites' },
    ],
    updated: UPDATED,
  },
  {
    slug: '/wifi-qr-kod-generator',
    title: 'Wi-Fi QR-kód készítése – vendéghálózat megosztása',
    description:
      'Készíts Wi-Fi QR-kódot hálózatnévvel, jelszóval és biztonsági típussal. Tippek vendéghálózathoz, rejtett hálózathoz és biztonságos elhelyezéshez.',
    h1: 'Wi-Fi QR-kód készítése',
    kicker: 'Vendéghálózat és iroda',
    intro: [
      'A Wi-Fi QR-kód kényelmesebb, mint a jelszó bemásolása: a vendég beolvassa, a telefon pedig felajánlja a hálózathoz való csatlakozást. Nem kell hosszú jelszót beírni, és nem kell a titkosított jelszót a falra ragasztani.',
      'A generátor támogatja a WPA/WPA2/WPA3, a WEP és a nyílt hálózat típusát, valamint a rejtett hálózatot is. A kód a megadott adatokból a szabványos Wi-Fi QR-formátumot készíti el.',
    ],
    qrType: 'wifi',
    sections: [
      {
        heading: 'Hogyan működik a Wi-Fi QR-kód?',
        paragraphs: [
          'A kód a hálózat nevét (SSID), a biztonsági típust és a jelszót tartalmazza. Beolvasáskor az Android és az iOS megfelelő verziója felismeri a Wi-Fi formátumot, és felajánlja a csatlakozást. A folyamat nem igényel külön alkalmazást.',
          'A hálózat nevét pontosan úgy kell megadni, ahogy a telefon látja. A kis- és nagybetűk, valamint a szóközök számítanak. A jelszó szintén pontos egyezést igényel; a rejtett hálózatnál jelöld be a megfelelő opciót.',
        ],
        bullets: [
          'SSID: a hálózat neve, pontosan kitöltve.',
          'Biztonság: WPA/WPA2/WPA3, WEP vagy nyílt hálózat.',
          'Jelszó: a hálózat jelszava; nyílt hálózatnál üresen hagyható.',
          'Rejtett hálózat: kapcsold be, ha az SSID nem jelenik meg a listában.',
        ],
      },
      {
        heading: 'Biztonsági típus – melyiket válaszd?',
        paragraphs: [
          'A legtöbb otthoni és irodai hálózat WPA2 vagy WPA3 titkosítást használ. A generátor „WPA” értéke ezeket fedi le, mert a QR-szabvány nem tesz különbséget a WPA-verziók között. WEP-et csak régi eszköz kényszeríthet ki; ez a titkosítás ma már nem tekinthető biztonságosnak.',
          'A nyílt hálózatot (nopass) csak akkor válaszd, ha valóban nincs jelszó. Ilyen hálózatnál a forgalom nem titkosított, ezért ne használd banki vagy bizalmas tevékenységre.',
        ],
      },
      {
        heading: 'Vendéghálózat: a jelszó nem titok többé',
        paragraphs: [
          'A Wi-Fi QR-kód lényege, hogy bárki hozzáférhet a jelszóhoz, aki beolvassa. Ezért különösen fontos, hogy vendégek számára külön hálózatot hozz létre, ne az otthoni vagy irodai belső hálózat jelszavát oszd meg. A vendéghálózatot időnként cseréld, és a kódot is frissítsd.',
          'Ha a jelszó megváltozik, a régi kód már nem működik. Ilyenkor új QR-kódot kell készíteni, vagy dinamikus megoldást használni – de a Wi-Fi-adatokat a dinamikus kód is a kódba kódolja, ezért a jelszó változásakor ott is új kód szükséges.',
        ],
        tip: 'A kódot helyezd jól látható, száraz helyre, és készíts tartalék példányt. A nedvesség és az UV-fény ronthatja a nyomtatott kódot.',
      },
      {
        heading: 'Elhelyezés és tesztelés',
        paragraphs: [
          'A Wi-Fi kódot érdemes a bejárat közelében, a recepción vagy az asztalon elhelyezni, ahol a vendég kényelmesen beolvashatja. Ne tedd túl magasra, és ne takarja el bútor vagy dekoráció.',
          'A beolvasás előtt ellenőrizd a hálózat nevét és jelszavát egy másik eszközön is. Ha a vendég mégsem tud csatlakozni, előfordulhat, hogy a hálózat MAC-szűrést vagy captív portált használ – ezekről a QR-kód önmagában nem tud.',
        ],
      },
    ],
    faqs: [
      {
        question: 'A QR-kód beolvasása után automatikusan csatlakozik a telefon?',
        answer:
          'A legtöbb modern Android és iOS eszköz felajánlja a csatlakozást, de a megerősítés a felhasználónál marad. A pontos viselkedés a rendszerverziótól és a beolvasó alkalmazástól függ.',
      },
      {
        question: 'Látszik a jelszó a QR-kódban?',
        answer:
          'Igen, a jelszó része a kód tartalmának, ezért bárki kiolvashatja, aki beolvassa. Csak olyan hálózathoz használj ilyen kódot, amelynek jelszava megosztható a célközönséggel.',
      },
      {
        question: 'Rejtett hálózathoz is működik?',
        answer:
          'Igen. Jelöld be a rejtett hálózat opciót, és add meg pontosan az SSID-t. A beolvasó alkalmazásnak támogatnia kell a rejtett hálózat jelet; a legtöbb modern telefon igen.',
      },
      {
        question: 'Miért nem csatlakozik a telefon a kód alapján?',
        answer:
          'Ellenőrizd az SSID és a jelszó pontos írásmódját, a biztonsági típust, valamint azt, hogy a hálózat hatótávolságon belül van-e. Vállalati hálózatnál további bejelentkezés vagy tanúsítvány is szükséges lehet, amit a QR-kód nem tartalmaz.',
      },
    ],
    related: [
      { label: 'Wi-Fi QR-kód generátor', to: '/qr-kod-generator?type=wifi' },
      { label: 'QR-kód nyomtatásra', to: '/qr-kod-nyomtatasra' },
      { label: 'QR-kód készítés útmutató', to: '/qr-kod-keszites' },
    ],
    updated: UPDATED,
  },
  {
    slug: '/vcard-qr-kod-generator',
    title: 'vCard QR-kód készítése – digitális névjegy',
    description:
      'Készíts vCard QR-kódot névvel, telefonszámmal, e-mail-címmel és címmel. Kompatibilis névjegyformátum, mezők és adatvédelmi tippek magyarul.',
    h1: 'vCard QR-kód készítése',
    kicker: 'Digitális névjegy',
    intro: [
      'A vCard QR-kód egy szabványos névjegyfájlt rejt a kódba. Beolvasás után a telefon felajánlja, hogy elmentse a kapcsolatot a névjegyek közé – nem kell kézzel begépelni a nevet, a telefonszámot és az e-mail-címet.',
      'A generátor vCard 3.0 formátumot állít elő, amelyet a legtöbb Android és iOS eszköz, valamint a névjegykezelő alkalmazások támogatnak. A mezők közül csak a nevet kötelező megadni, a többit szabadon hagyhatod.',
    ],
    qrType: 'vcard',
    sections: [
      {
        heading: 'Mit tartalmazhat a vCard?',
        paragraphs: [
          'A név mellett megadhatod a céget, a beosztást, a mobilszámot, az e-mail-címet, a weboldalt, a postai címet és egy rövid megjegyzést. A generátor a megadott mezőket a vCard 3.0 szabvány szerint rendezi, a speciális karaktereket pedig megfelelően escape-eli.',
          'A kevesebb több: egy üzleti névjegyen általában a név, a beosztás, a cég, egy telefonszám, egy e-mail-cím és a weboldal elegendő. A hosszú megjegyzés növeli a kód sűrűségét, ami kis méretben ronthatja az olvashatóságot.',
        ],
      },
      {
        heading: 'Kompatibilitás és mentés',
        paragraphs: [
          'A vCard 3.0 széles körben támogatott, ezért ez a legbiztonságosabb választás, ha a kódot sokféle eszközön szeretnéd használni. A beolvasás után a telefon általában megjeleníti az adatokat, és külön gombbal kínálja fel a névjegy mentését.',
          'A viselkedés kisebb eltéréseket mutathat: egyes alkalmazások azonnal mentenek, mások előbb előnézetet mutatnak. Érdemes a kódot legalább egy Android és egy iPhone készüléken kipróbálni, ha fontos, hogy minden ügyfélnek zökkenőmentes legyen.',
        ],
      },
      {
        heading: 'Adatvédelem és felhasználás',
        paragraphs: [
          'A statikus vCard QR-kódban szereplő adatok bárki számára olvashatók, aki beolvassa a kódot. Csak olyan adatot tegyél bele, amelyet szívesen megosztasz a kódot látó közönséggel. Magáncélra használhatsz külön e-mail-címet vagy virtuális telefonszámot.',
          'A vCard kiváló névjegykártyán, szórólapon, e-mail-aláírásban, konferencián vagy irodai ajtón. Ha a névjegy adatai változnak, a statikus kódot újra kell készíteni; a régi kód ugyanis a régi adatokat tartalmazza.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Melyik vCard-verziót használja a generátor?',
        answer:
          'vCard 3.0-t, mert ezt támogatja a legszélesebb eszközkör. A formátum megfelelően kezeli az ékezetes neveket és a nemzetközi telefonszámokat is.',
      },
      {
        question: 'Kell-e minden mezőt kitölteni?',
        answer:
          'Nem. Legalább egy név szükséges, a többi mező opcionális. A rövidebb névjegy tisztább, kisebb QR-kódot eredményez, ami könnyebben beolvasható.',
      },
      {
        question: 'Miért nem jelenik meg a mentés gomb?',
        answer:
          'A beolvasó alkalmazás és a telefon rendszere eltérően kezelheti a vCard tartalmat. Próbáld meg a kamera helyett a rendszer beépített kódolvasóját, vagy egy névjegykezelő alkalmazást. A kód tartalma ettől még érvényes lehet.',
      },
      {
        question: 'Megoszthatom a vCard kódot online?',
        answer:
          'Igen, de csak olyan adatokkal, amelyeket nyilvánosan is vállalsz. A kód bárki számára olvasható, és nem tudod visszavonni, ha egyszer nyilvánosságra került.',
      },
    ],
    related: [
      { label: 'vCard QR-kód generátor', to: '/qr-kod-generator?type=vcard' },
      { label: 'Névjegykártya QR-kód', to: '/nevjegykartya-qr-kod' },
      { label: 'QR-kód nyomtatásra', to: '/qr-kod-nyomtatasra' },
    ],
    updated: UPDATED,
  },
  {
    slug: '/nevjegykartya-qr-kod',
    title: 'Névjegykártya QR-kód – ötletek és nyomdai tippek',
    description:
      'Hogyan kerüljön QR-kód a névjegykártyára? Méret, elhelyezés, kontraszt, anyag és tesztelési tippek magyarul, működő generátorral.',
    h1: 'Névjegykártya QR-kód készítése',
    kicker: 'Nyomdai felhasználás',
    intro: [
      'A névjegykártya QR-kódja kényelmes hidat teremt a papír és a digitális kapcsolat között: egy beolvasással elmenthető a névjegy, megnyitható a weboldal vagy elindítható egy e-mail. A siker azonban nem csak a kódon múlik, hanem a méreten, a kontraszton és a kártya anyagán is.',
      'Ezen az oldalon a nyomtatott névjegykártyára kerülő kód tervezéséhez adunk gyakorlati tanácsokat. A kódot a generátorban készítheted el, SVG formátumban pedig éles méretben adhatod át a nyomdának.',
    ],
    sections: [
      {
        heading: 'Mit tartalmazzon a kártya QR-kódja?',
        paragraphs: [
          'A leggyakoribb választás a vCard névjegy, mert beolvasás után a telefon felajánlja a kapcsolat mentését. Ugyanígy használható egy rövid bemutatkozó oldal, egy portfólió, egy időpontfoglaló link vagy egy közösségi profil is.',
          'Kerüld, hogy egyetlen kártyán több QR-kód versengjen egymással. Ha mégis szükség van kettőre, például névjegyre és weboldalra, tedd őket jól elkülönítve, rövid felirattal. A kártya hátoldala erre jó helyet adhat.',
        ],
      },
      {
        heading: 'Méret, kontraszt és csendes zóna',
        paragraphs: [
          'Névjegykártyán a kódnak elég nagynak kell lennie ahhoz, hogy kézben tartott telefonnal kényelmesen beolvasható legyen. A 2 × 2 cm-es kód általában működik, de 2,5–3 cm biztonságosabb, különösen ha a kód sok adatot tartalmaz.',
          'Használj erős kontrasztot: sötét minta világos háttéren. A kártya alapszíne lehet márkaszín, de a kód körül hagyj legalább 4 modulnyi üres sávot. Ne tedd a kódot fényes, tükröződő felületre, mert a tükröződés megzavarhatja a beolvasást.',
        ],
        tip: 'Kérj a nyomdától próbanyomatot, és a végleges anyagon olvasd be a kódot – ne csak a képernyőn.',
      },
      {
        heading: 'Anyag és nyomdatechnika',
        paragraphs: [
          'Matt papír vagy matt laminálás általában jobb, mint a magas fényű felület. A dombornyomás vagy a fóliázás szép lehet, de a kódot ne érintse, mert a tükröződő fólia ronthatja az olvashatóságot. Apró részleteknél a nyomdai pontatlanság is számíthat.',
          'Az SVG használatával a kód élesen nyomtatható bármilyen méretben. Kerüld a képernyőről készített képernyőfotót vagy a kicsinyített PNG-t, mert a pixeles élmosódás és a sérült modulok beolvasási hibát okozhatnak.',
        ],
      },
      {
        heading: 'Tesztelés nyomtatás után',
        paragraphs: [
          'A kész kártyát olvasd be több telefonnal, különböző fényviszonyok között. Ellenőrizd, hogy a kód a kártya szélétől elegendő távolságra van-e, és hogy nem takarja-e logó, név vagy díszítőelem.',
          'Ha a kód nem működik, először a méretet és a kontrasztot növeld, majd a benne lévő adat mennyiségét csökkentsd. A végső ellenőrzést mindig a nyomtatott példányon végezd el.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Mekkora QR-kód fér el egy névjegykártyán?',
        answer:
          'Egy szabványos 85 × 55 mm-es kártyán 2–3 cm-es kód kényelmesen elfér. Ennél nagyobb kód is lehetséges, de hagyni kell helyet a névnek, a logónak és a csendes zónának.',
      },
      {
        question: 'Elég a kártyára a weboldal linkje?',
        answer:
          'Ha a cél a kapcsolatfelvétel, a vCard hasznosabb, mert egy lépésben menthető a névjegy. Ha a cél a részletes bemutatkozás, egy rövid, mobilon jól működő weboldal lehet a jobb választás.',
      },
      {
        question: 'Használható a kártyához dinamikus QR-kód?',
        answer:
          'Igen, ha a cél később változhat, vagy szeretnéd mérni az olvasásokat. A dinamikus kód egy rövid címre mutat, ezért a nyomtatott kártya újranyomtatása nélkül is módosítható a cél.',
      },
      {
        question: 'Fekete-fehér helyett színes kód is lehet?',
        answer:
          'Igen, de a kontraszt számít. A sötét minta világos háttéren a legbiztonságosabb. A márkaszínt érdemes sötét árnyalatban használni, és a nyomtatás előtt ellenőrizni a kontrasztarányt.',
      },
    ],
    related: [
      { label: 'vCard QR-kód', to: '/vcard-qr-kod-generator' },
      { label: 'QR-kód nyomtatásra', to: '/qr-kod-nyomtatasra' },
      { label: 'QR-kód generátor', to: '/qr-kod-generator' },
    ],
    updated: UPDATED,
  },
  {
    slug: '/email-qr-kod-generator',
    title: 'E-mail QR-kód készítése – előre kitöltött levél',
    description:
      'Készíts e-mail QR-kódot előre kitöltött címmel, tárggyal és szöveggel. Hasznos ügyfélszolgálati, rendezvény- és kapcsolatfelvételi példák.',
    h1: 'E-mail QR-kód készítése',
    kicker: 'Kapcsolatfelvétel',
    intro: [
      'Az e-mail QR-kód beolvasás után megnyitja a telefon levelezőjét, és előre kitölti a címzettet, a tárgyat, sőt a levél szövegét is. Ez csökkenti a hibákat és megkönnyíti a kapcsolatfelvételt olyan helyzetekben, ahol nincs idő gépelni.',
      'A generátor a mailto: szabványt használja, amelyet a legtöbb mobil levelező alkalmazás támogat. A magyar ékezeteket és a sortöréseket is megfelelően kódolja.',
    ],
    qrType: 'email',
    sections: [
      {
        heading: 'Mire használható?',
        paragraphs: [
          'Ügyfélszolgálati pulton, szórólapon, vásárlói standon, névjegykártyán vagy egy termék csomagolásán is jó szolgálatot tehet. Ha a tárgy és a levél szövege előre ki van töltve, a felhasználónak már csak el kell küldenie a levelet.',
          'Támogatási kérésnél például a tárgy lehet „Terméktámogatás”, a szövegben pedig szerepelhetnek azok az adatok, amelyeket meg kell adni. Így kevesebb hiányos levél érkezik.',
        ],
      },
      {
        heading: 'Címzett, tárgy és szöveg',
        paragraphs: [
          'A címzett megadása kötelező. A tárgy és a szöveg opcionális, de érdemes rövid, egyértelmű szöveget írni. A generátor a mezőket URL-kódolással teszi a mailto: linkbe, ezért az ékezetek és a speciális karakterek is biztonságosan átadódnak.',
          'Ne tegyél a levél szövegébe jelszót vagy bizalmas adatot. A QR-kód tartalma bárki számára olvasható, és a beolvasó alkalmazások naplózhatják a linket.',
        ],
      },
      {
        heading: 'Kompatibilitás és tesztelés',
        paragraphs: [
          'A legtöbb telefon felismeri a mailto: linket, de a viselkedés eltérhet: egyes készülékek azonnal megnyitják a levelezőt, mások előbb választást kínálnak. Ha a felhasználónak nincs beállított levelezője, a link nem tud mit nyitni.',
          'A kódot érdemes legalább egy Android és egy iPhone készüléken kipróbálni. Ellenőrizd, hogy a címzett, a tárgy és a szöveg is helyesen jelenik meg, és hogy a levél nem tartalmaz felesleges karaktereket.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Működik a kód, ha nincs beállítva levelező a telefonon?',
        answer:
          'Nem garantáltan. A mailto: link egy levelező alkalmazást próbál megnyitni. Ha nincs ilyen beállítva, a telefon nem tudja végrehajtani a műveletet. Ilyen esetre érdemes a e-mail-címet szövegesen is kiírni.',
      },
      {
        question: 'Előre kitölthető a levél teljes szövege?',
        answer:
          'Igen, a generátor támogatja a tárgy és a szöveg előzetes kitöltését. A hosszú szöveg azonban sűrűbb QR-kódot eredményez, ezért csak rövid, lényegre törő üzenetet érdemes beletenni.',
      },
      {
        question: 'Használhatok több címzettet?',
        answer:
          'A generátor egy címzettet kezel, mert a legtöbb felhasználónak ez egyértelműbb. Több címzettnél a levelező alkalmazásban lehetőség van másolat vagy titkos másolat hozzáadására.',
      },
      {
        question: 'Spam célra használható?',
        answer:
          'Nem. A kód csak megkönnyíti a kapcsolatfelvételt; a levél elküldése a felhasználó döntése. Kéretlen üzenetek küldése jogszabályba és szolgáltatói feltételekbe ütközhet.',
      },
    ],
    related: [
      { label: 'E-mail QR-kód generátor', to: '/qr-kod-generator?type=email' },
      { label: 'Kapcsolat oldal', to: '/kapcsolat' },
      { label: 'vCard QR-kód', to: '/vcard-qr-kod-generator' },
    ],
    updated: UPDATED,
  },
  {
    slug: '/telefon-qr-kod-generator',
    title: 'Telefon QR-kód készítése – koppintásos hívás',
    description:
      'Telefonszámból készíts QR-kódot, amely beolvasás után azonnal hívást indít. Nemzetközi formátum, használati esetek és gyakorlati tippek.',
    h1: 'Telefon QR-kód készítése',
    kicker: 'Azonnali hívás',
    intro: [
      'A telefon QR-kód egy tel: linket tartalmaz, ezért beolvasás után a telefon felajánlja a hívást a megadott számra. Ügyfélszolgálatnál, szervizben, étteremben vagy rendezvényen különösen hasznos, ha a számot nem szeretnéd kézzel begépeltetni.',
      'A generátor a magyar és a nemzetközi telefonszámokat is kezeli. A 06-tal kezdődő hazai számot automatikusan +36-ra alakítja, a nemzetközi számokat pedig E.164 formára hozza.',
    ],
    qrType: 'phone',
    sections: [
      {
        heading: 'Mire ügyelj a telefonszámnál?',
        paragraphs: [
          'A hívás akkor működik megbízhatóan, ha a szám országkóddal szerepel. A magyar +36-os formátum külföldről is működik, míg a 06-tal kezdődő szám csak belföldön értelmezhető egyértelműen. A generátor ezért normalizálja a számot.',
          'A számot csak akkor tedd ki nyilvános QR-kódba, ha valóban fogadni szeretnéd a hívásokat. A kódot bárki beolvashatja, és a hívások száma nehezen korlátozható.',
        ],
      },
      {
        heading: 'Használati esetek',
        paragraphs: [
          'Egy szervizben a kód a közvetlen ügyeleti számra mutathat; egy étteremben a rendelésre; egy irodaházban a recepcióra. A kiírás mellett érdemes a telefonszámot szövegesen is feltüntetni, mert nem mindenki szeretne azonnal hívni.',
          'Ha a hívás célja időpontfoglalás, a telefonszám mellett egy webes foglalási link is lehet hasznos. A kódok száma azonban ne növelje a zsúfoltságot: egyértelmű felirattal válaszd el őket.',
        ],
      },
      {
        heading: 'Hívás vagy üzenet?',
        paragraphs: [
          'A telefon QR-kód hívást indít, az SMS QR-kód üzenetet. Ha a felhasználó inkább írna, válaszd az SMS-t vagy a WhatsAppot. A telefonszámra mutató kód nem tartalmaz előre megírt szöveget, ezért a hívás előtt a felhasználó dönt.',
          'A hívásindítás nem minden eszközön automatikus: a telefon általában megerősítést kér, és a hívás a rendszer telefonalkalmazásában indul. Ez a viselkedés nem hiba, hanem biztonsági megerősítés.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Nemzetközi számot is megadhatok?',
        answer:
          'Igen. Add meg országkóddal, például +49 30 1234567 formában. A generátor E.164 formára alakítja a számot, így a kód külföldön is használható.',
      },
      {
        question: 'A 06-tal kezdődő számot hogyan írjam be?',
        answer:
          'Beírhatod 06-tal is; a generátor automatikusan +36-ra alakítja. Hosszú távra a +36 30 123 4567 formátum ajánlott.',
      },
      {
        question: 'A beolvasás után azonnal tárcsáz a telefon?',
        answer:
          'A legtöbb eszköz megerősítést kér, mielőtt hívást indít. Ez a felhasználó védelmét szolgálja, ezért nem kell attól tartanod, hogy egy véletlen beolvasás azonnal hívást indít.',
      },
      {
        question: 'Használható a kód hívásmérésre?',
        answer:
          'A statikus QR-kód nem mér. A beérkező hívásokat a telefontársaság vagy a híváskezelő rendszer tudja mérni, de a QR-kódról érkező hívások elkülönítéséhez külön telefonszám vagy kampánykód szükséges.',
      },
    ],
    related: [
      { label: 'Telefon QR-kód generátor', to: '/qr-kod-generator?type=phone' },
      { label: 'SMS QR-kód', to: '/sms-qr-kod-generator' },
      { label: 'Kapcsolat oldal', to: '/kapcsolat' },
    ],
    updated: UPDATED,
  },
  {
    slug: '/sms-qr-kod-generator',
    title: 'SMS QR-kód készítése – előre megírt üzenet',
    description:
      'Készíts SMS QR-kódot előre kitöltött üzenettel. Használat, kompatibilitás, költségek és etikus felhasználási tippek magyarul.',
    h1: 'SMS QR-kód készítése',
    kicker: 'Üzenetküldés',
    intro: [
      'Az SMS QR-kód beolvasás után megnyitja a telefon üzenetküldőjét, a címzett és opcionálisan az üzenet pedig előre kitöltve jelenik meg. Jó megoldás időpontkérésre, rendelésre, visszajelzésre vagy egy egyszerű kapcsolatfelvételre ott, ahol nincs internet.',
      'A generátor SMSTO formátumot használ, amelyet a legtöbb mobil rendszer felismer. Az üzenet szövege URL-kódolva kerül a kódba, így az ékezetek és a speciális karakterek is megfelelően továbbadódnak.',
    ],
    qrType: 'sms',
    sections: [
      {
        heading: 'Mire jó az SMS QR-kód?',
        paragraphs: [
          'Használható asztali étlapon rendeléshez, szervizben hibabejelentéshez, szórólapon visszahíváskáéréshez vagy rendezvényen visszajelzéshez. A címzettet mindig előre kell megadni, így a felhasználónak csak az üzenet elküldése marad.',
          'Ha a cél egy hosszabb kérdőív vagy részletes adatbekérés, a webes űrlap általában jobb választás. Az SMS rövid, azonnali kommunikációra való.',
        ],
      },
      {
        heading: 'Üzenet, ékezetek és költségek',
        paragraphs: [
          'A magyar ékezetes karakterek az SMS-ben a szolgáltatótól és a készüléktől függően emelt díjas üzenetnek vagy több részletnek számíthatnak. Ha költségkritikus, használj ékezet nélküli, rövid szöveget.',
          'A kód nem küldi el automatikusan az üzenetet: a felhasználó látja a szöveget, és jóváhagyja a küldést. Ez fontos a tudatos hozzájárulás és a költségek szempontjából is.',
        ],
        tip: 'Az SMS-ben mindig írd le, miért írnak a felhasználónak, és ne kérj bizalmas adatot. A kéretlen üzenetek jogi és szolgáltatói problémákat okozhatnak.',
      },
      {
        heading: 'Tesztelés és kompatibilitás',
        paragraphs: [
          'A különböző Android-verziók és az iOS eltérően kezelhetik az SMSTO linket. Egyes készülékek az üzenetküldőt nyitják meg, mások előbb választást kínálnak. A kódot érdemes több telefonon kipróbálni.',
          'Ellenőrizd, hogy a címzett szám helyes, és hogy az üzenet nem tartalmaz olyan karaktert, amely a linket elrontja. A generátor ugyan kódolja a szöveget, de a végső tesztet a valós eszközön érdemes elvégezni.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Az SMS automatikusan elküldődik?',
        answer:
          'Nem. A beolvasás után a telefon megnyitja az üzenetküldőt az előre kitöltött adatokkal, de a küldés a felhasználó döntése. Ez véd a véletlen költségektől és a kéretlen üzenetektől.',
      },
      {
        question: 'Miért számít emelt díjasnak az ékezetes SMS?',
        answer:
          'Az SMS-szabvány eredetileg korlátozott karakterkészletet használ. Az ékezetes karakterek miatt a szolgáltató Unicode üzenetként küldheti, amely rövidebb, ezért több részletben is elküldhető. Ez emelt díjat eredményezhet.',
      },
      {
        question: 'Használhatom marketingcélra?',
        answer:
          'Csak akkor, ha a címzett előzetesen hozzájárult. A kéretlen SMS-ek jogszabályba ütköznek, és a szolgáltatók is szankcionálhatják őket. A QR-kód önmagában nem jelent hozzájárulást.',
      },
      {
        question: 'Működik tableten?',
        answer:
          'Tableten gyakran nincs SMS-küldési lehetőség. A beolvasó alkalmazás ilyenkor előfordulhat, hogy nem tudja megnyitni az üzenetküldőt. A webes kapcsolatfelvétel ilyen esetben megbízhatóbb.',
      },
    ],
    related: [
      { label: 'SMS QR-kód generátor', to: '/qr-kod-generator?type=sms' },
      { label: 'Telefon QR-kód', to: '/telefon-qr-kod-generator' },
      { label: 'Kapcsolat oldal', to: '/kapcsolat' },
    ],
    updated: UPDATED,
  },
  {
    slug: '/google-ertekeles-qr-kod-generator',
    title: 'QR-kód Google-értékeléshez – etikus útmutató',
    description:
      'Így irányíthatod a vásárlókat a Google-értékelő oldaladra QR-kóddal. Link megszerzése, elhelyezés, etika és gyakori hibák, hamis értékelések nélkül.',
    h1: 'QR-kód Google-értékeléshez',
    kicker: 'Vásárlói visszajelzés',
    intro: [
      'A Google-értékelő oldalra mutató QR-kód megkönnyíti, hogy az elégedett vásárlók valóban írjanak véleményt. A kód nem vásárol értékelést és nem kényszerít semmire: egyszerűen rövidebbé teszi az utat a Google Cégprofil értékelési oldaláig.',
      'A generátorban a Google által adott értékelési linket kell beilleszteni. A kód beolvasás után közvetlenül a Google-felületre viszi a felhasználót, ahol saját döntése alapján értékelhet.',
    ],
    qrType: 'google-review',
    sections: [
      {
        heading: 'Hol találod a Google-értékelési linkedet?',
        paragraphs: [
          'A Google Cégprofil kezelőfelületén a „Vélemények” vagy az „Értékelés kérése” résznél található egy megosztható link. Ez a link általában a g.page vagy a maps.app.goo.gl domainre mutat, és közvetlenül az értékeléshez vezet.',
          'A linket érdemes először böngészőben kipróbálni, és ellenőrizni, hogy a saját cégprofilod jelenik meg rajta. Ha több telephelyed van, minden telephelyhez külön link és külön QR-kód tartozhat.',
        ],
      },
      {
        heading: 'Elhelyezés és a kérés módja',
        paragraphs: [
          'A kódot ott érdemes elhelyezni, ahol a vásárló a legvalószínűbben elégedett: a fizetés után, a csomagoláson, a szerviz átvételekor vagy egy asztali kártyán. Egy rövid, udvarias felirat – például „Ha segítettünk, oszd meg velünk a véleményed” – sokat számít.',
          'Ne ígérj pénzt vagy ajándékot az értékelésért, és ne kérj kizárólag ötcsillagos véleményt. A hamis vagy ösztönzött értékelések sértik a Google irányelveit, és a fiókra nézve is kockázatot jelenthetnek.',
        ],
        tip: 'Az értékelés kérését soha ne tedd kötelezővé, és ne zárj el szolgáltatást a vélemény megírásáig.',
      },
      {
        heading: 'Mérés és visszajelzés',
        paragraphs: [
          'A QR-kód statikus, ezért önmagában nem méri, hányan olvassák be. A Google Cégprofil statisztikái mutatják az értékelések számát és átlagát, de a QR-kód és a szóbeli kérés hatását csak közvetett módon lehet látni.',
          'Ha szeretnéd összekapcsolni a kódot a forrással, használhatsz külön linket vagy dinamikus QR-kódot. A Google értékelési linkjét azonban ne módosítsd önkényesen, mert előfordulhat, hogy a Google nem ismeri fel a paramétereket.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Készíthetek QR-kódot a Google-értékeléshez?',
        answer:
          'Igen, ha a saját Google Cégprofilodhoz tartozó értékelési linket használod. A kód csak megkönnyíti a hozzáférést; az értékelés írása továbbra is a felhasználó szabad döntése.',
      },
      {
        question: 'Adható ajándék az értékelésért?',
        answer:
          'A Google irányelvei tiltják az ösztönzött értékeléseket. Ne kínálj kedvezményt, ajándékot vagy más előnyt azért cserébe, hogy valaki értékeljen. Ez a bizalom és a szabályok szempontjából is problémás.',
      },
      {
        question: 'Miért nem jelenik meg a cégem a linken?',
        answer:
          'Ellenőrizd, hogy a link a saját, jóváhagyott Google Cégprofilodra mutat-e, és hogy a profil nyilvánosan elérhető. Ha a link lejárt vagy másik telephelyre mutat, új linket kell beszerezned.',
      },
      {
        question: 'Mérhető a QR-kódról érkező értékelés?',
        answer:
          'Közvetlenül nem. A dinamikus QR-kódnál látod az olvasások számát, de azt nem, hogy ki írt értékelést. A Google statisztikái és a saját scanszámaid együtt adhatnak képet a hatásról.',
      },
    ],
    related: [
      { label: 'Google-értékelés QR generátor', to: '/qr-kod-generator?type=google-review' },
      { label: 'Névjegykártya QR-kód', to: '/nevjegykartya-qr-kod' },
      { label: 'QR-kód készítés útmutató', to: '/qr-kod-keszites' },
    ],
    updated: UPDATED,
  },
  {
    slug: '/etlap-qr-kod-generator',
    title: 'QR-kód étlaphoz – digitális étlap és asztali kártya',
    description:
      'Készíts QR-kódot étlaphoz vagy asztali kártyához. Tippek a nyomtatáshoz, a mobilos étlaphoz, az ételallergénekhez és a frissítéshez.',
    h1: 'QR-kód étlaphoz',
    kicker: 'Vendéglátás',
    intro: [
      'A QR-kódos étlap kényelmes megoldás a vendéglőknek: a vendég beolvassa a kódot, és a telefonján megnyitja az étlapot. Az asztali kártya tisztán tartható, és ha a kínálat változik, a digitális étlap a nyomtatott kártya újragyártása nélkül is frissíthető.',
      'A generátorban készíthetsz egy egyszerű, weboldalra mutató kódot, vagy használhatsz dinamikus QR-kódot, amelynek célja később módosítható. Utóbbi különösen akkor hasznos, ha gyakran változik az étlap.',
    ],
    qrType: 'menu',
    sections: [
      {
        heading: 'Mire mutasson az étlap QR-kód?',
        paragraphs: [
          'A legjobb, ha egy mobilon jól olvasható, gyorsan betöltő étlapoldalra mutat. Az oldalon legyenek ott az árak, az összetevők, az allergéninformációk és az esetleges opciók. A PDF önmagában is működik, de mobilon gyakran kényelmetlen nagyítgatni.',
          'Ha több nyelven szeretnél étlapot, a céloldalon váltható nyelvi verzió praktikusabb, mint külön QR-kód minden nyelvhez. Így az asztali kártya egyszerű marad.',
        ],
      },
      {
        heading: 'Asztali kártya és nyomtatás',
        paragraphs: [
          'Az asztali kártyát érdemes matt, vízálló anyagra nyomtatni, mert a vendéglátásban gyakori a nedvesség és a tisztítás. A kód legyen legalább 2,5–3 cm, jó kontraszttal, és ne takarja el sem etető, sem dekoráció.',
          'A kártyán szerepeljen rövid felirat is, például „Étlap – olvasd be telefonnal”. A kód mellett hasznos lehet a webcím szövegesen is, ha valakinek nem működik a kamerája. A kártyát ne lamináld fényes fóliába, mert a tükröződés nehezítheti a beolvasást.',
        ],
        tip: 'Tegyél egy tartalék kártyát a pultra, és hetente ellenőrizd, hogy a kód és a mögötte lévő étlap is működik.',
      },
      {
        heading: 'Frissítés és dinamikus QR',
        paragraphs: [
          'Ha az étlap gyakran változik, a dinamikus QR-kód kényelmes: a kártya ugyanaz marad, csak a mögötte lévő cél-URL-t módosítod. A statikus kódnál minden változásnál új kártyát kell nyomtatni.',
          'A dinamikus kódhoz rövid saját cím tartozik, ezért érdemes a domainre és a hosztingra is figyelni. Ha a szolgáltatás megszűnik, a kódok sem működnek tovább. A statikus kód ebből a szempontból függetlenebb.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Elég egy PDF az étlaphoz?',
        answer:
          'Működhet, de mobilon a reszponzív weboldal kényelmesebb. A PDF-et érdemes legalább mobilnézetben kipróbálni, mert a nagy zoomolás és a lassú betöltés rontja az élményt.',
      },
      {
        question: 'Mennyi ideig marad működőképes a statikus kód?',
        answer:
          'A statikus kód addig működik, amíg a céloldal elérhető. Ha a weboldal megszűnik vagy a link megváltozik, a kód nem tud új célt kapni. Ezért érdemes stabil, saját domainre mutatni.',
      },
      {
        question: 'Kötelező QR-kódot használni az étteremben?',
        answer:
          'Nem. A QR-kód kényelmi megoldás, nem helyettesítheti a személyes kiszolgálást vagy a papíralapú étlapot, ha a vendég azt kéri. Több csatorna biztosítása a vendégbarát megoldás.',
      },
      {
        question: 'Allergéninformációt is tehetek a QR-kód mögé?',
        answer:
          'Igen, de az allergéninformációnak könnyen elérhetőnek és egyértelműnek kell lennie. Ne csak a QR-kódra bízd: a személyzetnek is ismernie kell az összetevőket, és szükség esetén szóban is tájékoztatást kell adnia.',
      },
    ],
    related: [
      { label: 'URL QR-kód generátor', to: '/url-qr-kod-generator' },
      { label: 'QR-kód nyomtatásra', to: '/qr-kod-nyomtatasra' },
      { label: 'QR-kód generátor', to: '/qr-kod-generator' },
    ],
    updated: UPDATED,
  },
  {
    slug: '/qr-kod-nyomtatasra',
    title: 'QR-kód nyomtatásra – méret, felbontás, anyagok',
    description:
      'Így készül nyomdakész QR-kód: SVG vagy nagy felbontású PNG, helyes méret, csendes zóna, kontraszt, anyagválasztás és nyomtatás utáni teszt.',
    h1: 'QR-kód nyomtatásra',
    kicker: 'Nyomdai útmutató',
    intro: [
      'A nyomtatott QR-kód akkor működik jól, ha a fájl éles, a méret elegendő, és a felület nem csalja meg a kamerát. A képernyőn jól kinéző kód a papíron könnyen olvashatatlanná válhat, ha a felbontás alacsony vagy a kontraszt gyenge.',
      'A generátor SVG- és PNG-exportot kínál. Nyomdai anyaghoz az SVG a legjobb választás, mert vektoros, méretezhető, és nem veszít a minőségéből. Kisebb, digitális nyomatokhoz a nagy felbontású PNG is megfelel.',
    ],
    sections: [
      {
        heading: 'Mekkora legyen a nyomtatott kód?',
        paragraphs: [
          'A méret a beolvasási távolságtól függ. Kézből olvasott szórólapon 2–3 cm, asztali kártyán 2,5–3 cm, kirakatban vagy plakáton ennél lényegesen nagyobb kód szükséges. Nagy távolságnál a kódnak legalább a távolság tizedének kell lennie, de ez csak kiindulópont.',
          'Ha bizonytalan vagy, készíts próbanyomatot a tervezett méretben, és olvasd be a helyszínen. A valós körülmények – fény, távolság, szög – többet mondanak minden számításnál.',
        ],
      },
      {
        heading: 'SVG vagy PNG?',
        paragraphs: [
          'Az SVG vektoros, ezért bármilyen méretben éles marad. A nyomda általában elfogadja, de érdemes megnézni, hogy a szerkesztőprogram nem alakítja-e át raszteres formátummá. A szövegeket és a vonalakat ne alakítsd képpontokká.',
          'A PNG akkor jó, ha a nyomda kifejezetten raszteres fájlt kér, vagy ha digitális felületre készül a kód. Ilyenkor használj legalább 1024 px széles kódot, és ellenőrizd, hogy a szélek nem lettek-e elmosódottak.',
        ],
        tip: 'A generátorban állítsd 1024 px vagy nagyobb exportméretet, és válaszd a csendes zónát tartalmazó keretet, hogy a kód szélei ne vágódjanak le.',
      },
      {
        heading: 'Kontraszt, anyag és felület',
        paragraphs: [
          'A sötét minta világos háttéren a legbiztonságosabb. A fényes, tükröződő anyagok – fóliázott papír, üveg, fém – megnehezíthetik a beolvasást. Matt papír, matt laminálás vagy megfelelő szögben elhelyezett kód segíthet.',
          'A kód körül hagyj legalább négymodulnyi üres sávot, és ne helyezz közvetlenül mellé más grafikát. A túl vékony vonalak, a halvány színek és a kis méret kombinációja a leggyakoribb nyomdai hiba.',
        ],
      },
      {
        heading: 'Nyomtatás utáni ellenőrzés',
        paragraphs: [
          'A próbanyomatot olvasd be legalább két telefonnal, nappali fényben és beltéri világításnál. Ellenőrizd a kód minden sarkát, és nézd meg, hogy a link a megfelelő oldalra visz-e. Ha a kód sérült vagy elmosódott, ne a telefonban keresd a hibát.',
          'Nagy példányszám előtt érdemes egy próbadarabot készíteni. A nyomdai eljárások – ofszet, digitális, szitanyomás – eltérően kezelik az apró részleteket, ezért a végleges anyagon kell meggyőződni a minőségről.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Milyen fájlformátumot adjak a nyomdának?',
        answer:
          'Általában az SVG a legjobb, mert vektoros. Ha a nyomda raszteres fájlt kér, adj nagy felbontású PNG-t, legalább 1024 px szélességgel, és ne kicsinyítsd utólag.',
      },
      {
        question: 'Elég 300 DPI a nyomtatáshoz?',
        answer:
          'A 300 DPI a fotók és a raszteres nyomatok gyakori ajánlása. QR-kódnál azonban a vektoros SVG biztonságosabb, mert a méretezés nem okoz pixelvesztést. PNG-nél a kód tényleges méretéhez kell választani a felbontást.',
      },
      {
        question: 'Laminálhatom a kódot?',
        answer:
          'Igen, de a fényes laminálás tükröződhet. Matt laminálás vagy matt papír általában jobb. Ha fényes felületet használsz, a kódot döntsd meg úgy, hogy a fény ne közvetlenül a kamerába verődjön.',
      },
      {
        question: 'Miért olvashatatlan a kód nyomtatás után?',
        answer:
          'A leggyakoribb okok: túl kicsi méret, alacsony kontraszt, hiányzó csendes zóna, elmosódott nyomat vagy túl nagy logó. Készíts próbanyomatot, és fokozatosan növeld a méretet és a kontrasztot.',
      },
    ],
    related: [
      { label: 'QR-kód generátor', to: '/qr-kod-generator' },
      { label: 'Névjegykártya QR-kód', to: '/nevjegykartya-qr-kod' },
      { label: 'Wi-Fi QR-kód', to: '/wifi-qr-kod-generator' },
    ],
    updated: UPDATED,
  },
]

/** A kézzel írt és a típusonként generált landoló oldalak együtt. */
export const ALL_LANDING_PAGES: LandingPageContent[] = [...LANDING_PAGES, ...TYPE_PAGES]

export const LANDING_PAGE_MAP = new Map(ALL_LANDING_PAGES.map(page => [page.slug, page]))

export function getLandingPage(slug: string): LandingPageContent | undefined {
  return LANDING_PAGE_MAP.get(slug.startsWith('/') ? slug : `/${slug}`)
}

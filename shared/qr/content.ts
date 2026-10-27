import type {
  QrBuildResult,
  QrFieldDefinition,
  QrFormValues,
  QrTypeDefinition,
  QrTypeId,
} from './types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u
const SOCIAL_HANDLE_RE = /^[A-Za-z0-9._-]{1,60}$/

function asString(value: string | boolean | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asBool(value: string | boolean | undefined): boolean {
  return value === true || value === 'true'
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

/**
 * URL-t normalizál (hiányzó protokoll esetén https://-t feltételez).
 * Csak http(s) URL-eket fogad el, és megköveteli a hosztnevet.
 */
export function parseHttpUrl(input: string): URL | null {
  const value = input.trim()
  if (!value) return null
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(candidate)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname || !url.hostname.includes('.')) return null
    if (url.username || url.password) return null
    return url
  } catch {
    return null
  }
}

/**
 * IBAN ellenőrzés a ISO 13616 szerinti mod-97 ellenőrző összeggel.
 * A szóközök és kötőjelek megengedettek a bemenetben.
 */
export function isValidIban(input: string): boolean {
  const value = input.replace(/[\s-]/g, '').toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(value)) return false
  const rearranged = value.slice(4) + value.slice(0, 4)
  let remainder = 0
  for (const char of rearranged) {
    const charCode = char.charCodeAt(0)
    const digits = charCode >= 65 ? String(charCode - 55) : char
    for (const digit of digits) {
      remainder = (remainder * 10 + Number(digit)) % 97
    }
  }
  return remainder === 1
}

/**
 * Nemzetközi telefonszámot E.164 formára hoz.
 * Kezeli a magyar 06 / 0036 előtagokat és a +36 nélküli hazai számokat is.
 */
export function normalizePhone(input: string): string | null {
  let value = input.trim().replace(/[\s().\-/]/g, '')
  if (!value) return null
  if (!/^\+?\d+$/.test(value)) return null

  if (value.startsWith('00')) value = `+${value.slice(2)}`
  else if (value.startsWith('06')) value = `+36${value.slice(2)}`
  else if (value.startsWith('+')) {
    // már nemzetközi formátum
  } else if (value.startsWith('36') && value.length >= 11) value = `+${value}`
  else if (/^[1-9]\d{8,9}$/.test(value)) value = `+36${value}`
  else value = `+${value}`

  const digits = value.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return null
  return `+${digits}`
}

/** Wi-Fi QR-specifikáció szerinti speciális karakter escaping. */
export function escapeWifiValue(value: string): string {
  return value.replace(/([\\;,":])/g, '\\$1')
}

/** vCard 3.0 szövegmező escaping (backslash, pontosvessző, vessző, sortörés). */
export function escapeVCardValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '').replace(/;/g, '\\;').replace(/,/g, '\\,')
}

/** iCalendar szövegmező escaping. */
export function escapeICalValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year!, month! - 1, day!))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month! - 1 &&
    date.getUTCDate() === day
  )
}

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false
  const [hours, minutes] = value.split(':').map(Number)
  return hours! >= 0 && hours! <= 23 && minutes! >= 0 && minutes! <= 59
}

function toICalStamp(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`
}

export const QR_TYPES: QrTypeDefinition[] = [
  {
    id: 'url',
    label: 'Weboldal',
    shortLabel: 'Weboldal',
    icon: 'lucide:link',
    description: 'Weboldal, webshop vagy bármilyen webcím megnyitása egyetlen beolvasással.',
    examples: 'https://qrkod24.hu',
    seoPath: '/url-qr-kod-generator',
    fields: [
      {
        key: 'protocol',
        label: 'Előtag',
        type: 'select',
        required: true,
        defaultValue: 'https://',
        half: true,
        options: [
          { value: 'https://', label: 'https://' },
          { value: 'http://', label: 'http://' },
          { value: 'www.', label: 'www.' },
        ],
      },
      {
        key: 'url',
        label: 'Weboldal címe',
        type: 'text',
        placeholder: 'qrkod24.hu',
        help: 'A kód a kiválasztott előtaggal készül. Ha teljes címet másolsz be, a protokollt lecseréljük.',
        required: true,
        half: true,
        inputmode: 'url',
        autocomplete: 'url',
      },
    ],
  },
  {
    id: 'text',
    label: 'Szöveg',
    shortLabel: 'Szöveg',
    icon: 'lucide:type',
    description: 'Egyszerű szöveg, jegyzet vagy utasítás megjelenítése a beolvasó alkalmazásban.',
    examples: 'Asztalfoglalás: +36 30 123 4567',
    seoPath: '/szoveg-qr-kod-generator',
    fields: [
      {
        key: 'text',
        label: 'Szöveg',
        type: 'textarea',
        placeholder: 'Írd ide a szöveget…',
        help: 'Az ékezeteket és a sortöréseket a QR-kód változtatás nélkül tárolja.',
        required: true,
        rows: 5,
      },
    ],
  },
  {
    id: 'phone',
    label: 'Telefon',
    shortLabel: 'Telefon',
    icon: 'lucide:phone',
    description: 'Telefonszám, amelyre a beolvasás után egy koppintással hívás indítható.',
    examples: '+36 30 123 4567',
    seoPath: '/telefon-qr-kod-generator',
    fields: [
      {
        key: 'phone',
        label: 'Telefonszám',
        type: 'tel',
        placeholder: '+36 30 123 4567',
        help: 'Magyar vagy nemzetközi formátum. A 06-tal kezdődő számot automatikusan +36-ra alakítjuk.',
        required: true,
        inputmode: 'tel',
        autocomplete: 'tel',
      },
    ],
  },
  {
    id: 'email',
    label: 'E-mail',
    shortLabel: 'E-mail',
    icon: 'lucide:mail',
    description: 'E-mail írása előre kitöltött címmel, tárggyal és szöveggel.',
    examples: 'info@qrkod24.hu',
    seoPath: '/email-qr-kod-generator',
    fields: [
      {
        key: 'email',
        label: 'E-mail-cím',
        type: 'email',
        placeholder: 'info@qrkod24.hu',
        required: true,
        inputmode: 'email',
        autocomplete: 'email',
      },
      {
        key: 'subject',
        label: 'Tárgy (opcionális)',
        type: 'text',
        placeholder: 'Ajánlatkérés',
        half: true,
      },
      {
        key: 'body',
        label: 'Levél szövege (opcionális)',
        type: 'textarea',
        placeholder: 'Üdvözlet…',
        rows: 3,
      },
    ],
  },
  {
    id: 'sms',
    label: 'SMS',
    shortLabel: 'SMS',
    icon: 'lucide:message-square',
    description: 'Előre megírt SMS üzenet küldése a megadott számra.',
    examples: '+36 30 123 4567',
    seoPath: '/sms-qr-kod-generator',
    fields: [
      {
        key: 'phone',
        label: 'Telefonszám',
        type: 'tel',
        placeholder: '+36 30 123 4567',
        required: true,
        inputmode: 'tel',
        autocomplete: 'tel',
      },
      {
        key: 'message',
        label: 'Üzenet (opcionális)',
        type: 'textarea',
        placeholder: 'Szeretnék időpontot kérni…',
        rows: 3,
      },
    ],
  },
  {
    id: 'wifi',
    label: 'Wi-Fi',
    shortLabel: 'Wi-Fi',
    icon: 'lucide:wifi',
    description: 'Wi-Fi-hálózat megosztása jelszóval együtt, vendégeknek és ügyfeleknek.',
    examples: 'VendégWiFi / jelszó',
    seoPath: '/wifi-qr-kod-generator',
    fields: [
      {
        key: 'ssid',
        label: 'Hálózat neve (SSID)',
        type: 'text',
        placeholder: 'VendegWiFi',
        required: true,
        help: 'Pontosan úgy írd be, ahogy a telefont beállítod. Kis- és nagybetű számít.',
      },
      {
        key: 'security',
        label: 'Biztonsági típus',
        type: 'select',
        required: true,
        defaultValue: 'WPA',
        options: [
          { value: 'WPA', label: 'WPA / WPA2 / WPA3' },
          { value: 'WEP', label: 'WEP' },
          { value: 'nopass', label: 'Nyílt hálózat (nincs jelszó)' },
        ],
        half: true,
      },
      {
        key: 'password',
        label: 'Jelszó',
        type: 'text',
        placeholder: 'A hálózat jelszava',
        help: 'Nyílt hálózatnál üresen hagyható.',
        half: true,
      },
      {
        key: 'hidden',
        label: 'Rejtett hálózat',
        type: 'checkbox',
        defaultValue: false,
        help: 'Jelöld be, ha az SSID nem látható a hálózatok listájában.',
      },
    ],
  },
  {
    id: 'vcard',
    label: 'vCard',
    shortLabel: 'Névjegy',
    icon: 'lucide:id-card',
    description: 'Digitális névjegy, amely beolvasás után a telefon névjegyei közé menthető.',
    examples: 'Nagy Anna, ügyvezető',
    seoPath: '/vcard-qr-kod-generator',
    fields: [
      {
        key: 'lastName',
        label: 'Vezetéknév',
        type: 'text',
        placeholder: 'Nagy',
        required: true,
        half: true,
        autocomplete: 'family-name',
      },
      {
        key: 'firstName',
        label: 'Keresztnév',
        type: 'text',
        placeholder: 'Anna',
        required: true,
        half: true,
        autocomplete: 'given-name',
      },
      {
        key: 'organization',
        label: 'Cégnév (opcionális)',
        type: 'text',
        placeholder: 'Példa Kft.',
        half: true,
        autocomplete: 'organization',
      },
      {
        key: 'title',
        label: 'Beosztás (opcionális)',
        type: 'text',
        placeholder: 'Ügyvezető',
        half: true,
        autocomplete: 'organization-title',
      },
      {
        key: 'phone',
        label: 'Telefonszám (opcionális)',
        type: 'tel',
        placeholder: '+36 30 123 4567',
        inputmode: 'tel',
        autocomplete: 'tel',
        half: true,
      },
      {
        key: 'email',
        label: 'E-mail-cím (opcionális)',
        type: 'email',
        placeholder: 'anna@qrkod24.hu',
        inputmode: 'email',
        autocomplete: 'email',
        half: true,
      },
      {
        key: 'website',
        label: 'Weboldal (opcionális)',
        type: 'url',
        placeholder: 'https://qrkod24.hu',
        inputmode: 'url',
        autocomplete: 'url',
      },
      {
        key: 'street',
        label: 'Utca, házszám (opcionális)',
        type: 'text',
        placeholder: 'Fő utca 1.',
        half: true,
        autocomplete: 'street-address',
      },
      {
        key: 'city',
        label: 'Város (opcionális)',
        type: 'text',
        placeholder: 'Budapest',
        half: true,
        autocomplete: 'address-level2',
      },
      {
        key: 'zip',
        label: 'Postakód (opcionális)',
        type: 'text',
        placeholder: '1011',
        half: true,
        autocomplete: 'postal-code',
      },
      {
        key: 'country',
        label: 'Ország (opcionális)',
        type: 'text',
        placeholder: 'Magyarország',
        half: true,
        autocomplete: 'country-name',
      },
      {
        key: 'note',
        label: 'Megjegyzés (opcionális)',
        type: 'textarea',
        placeholder: 'Rövid bemutatkozás…',
        rows: 2,
      },
    ],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    shortLabel: 'WhatsApp',
    icon: 'lucide:message-circle',
    description: 'WhatsApp-beszélgetés indítása előre kitöltött üzenettel.',
    examples: '+36 30 123 4567',
    fields: [
      {
        key: 'phone',
        label: 'WhatsApp-szám',
        type: 'tel',
        placeholder: '+36 30 123 4567',
        help: 'Nemzetközi formátumban, országkóddal.',
        required: true,
        inputmode: 'tel',
      },
      {
        key: 'message',
        label: 'Előre kitöltött üzenet (opcionális)',
        type: 'textarea',
        placeholder: 'Szia! Érdeklődni szeretnék…',
        rows: 3,
      },
    ],
  },
  {
    id: 'social',
    label: 'Közösségi',
    shortLabel: 'Közösségi',
    icon: 'lucide:share-2',
    description: 'Instagram-, Facebook-, TikTok- és más közösségi profilok megnyitása.',
    examples: '@pelda',
    fields: [
      {
        key: 'platform',
        label: 'Platform',
        type: 'select',
        required: true,
        defaultValue: 'instagram',
        options: [
          { value: 'instagram', label: 'Instagram' },
          { value: 'facebook', label: 'Facebook' },
          { value: 'tiktok', label: 'TikTok' },
          { value: 'linkedin', label: 'LinkedIn' },
          { value: 'youtube', label: 'YouTube' },
          { value: 'x', label: 'X (Twitter)' },
        ],
        half: true,
      },
      {
        key: 'handle',
        label: 'Felhasználónév vagy profil URL',
        type: 'text',
        placeholder: '@pelda',
        required: true,
        half: true,
        help: 'Elfogad teljes profil URL-t is. A @ jelet elhagyhatod.',
      },
    ],
  },
  {
    id: 'google-review',
    label: 'Google-értékelés',
    shortLabel: 'Értékelés',
    icon: 'lucide:star',
    description: 'Vásárlók egy koppintással eljutnak a Google-értékelő oldaladra.',
    examples: 'https://g.page/r/…/review',
    seoPath: '/google-ertekeles-qr-kod-generator',
    fields: [
      {
        key: 'url',
        label: 'Google-értékelési link',
        type: 'url',
        placeholder: 'https://g.page/r/…/review',
        help: 'A Google Cégprofil „Értékelés kérése” menüjében található linket másold be.',
        required: true,
        inputmode: 'url',
      },
    ],
  },
  {
    id: 'map',
    label: 'Helyszín',
    shortLabel: 'Helyszín',
    icon: 'lucide:map-pin',
    description: 'Cím, koordináta vagy térképlink, amely a beolvasás után azonnal útvonalat tervez.',
    examples: 'Fő utca 1., Budapest',
    fields: [
      {
        key: 'url',
        label: 'Térkép URL (opcionális)',
        type: 'url',
        placeholder: 'https://maps.app.goo.gl/…',
        help: 'Ha van kész térképlinked, ezt használjuk. Egyébként töltsd ki az alábbi mezők valamelyikét.',
        inputmode: 'url',
      },
      {
        key: 'address',
        label: 'Cím vagy helyszín',
        type: 'text',
        placeholder: 'Fő utca 1., Budapest',
        half: true,
      },
      {
        key: 'latitude',
        label: 'Szélesség (opcionális)',
        type: 'text',
        placeholder: '47.4979',
        half: true,
        inputmode: 'decimal',
      },
      {
        key: 'longitude',
        label: 'Hosszúság (opcionális)',
        type: 'text',
        placeholder: '19.0402',
        half: true,
        inputmode: 'decimal',
      },
    ],
  },
  {
    id: 'event',
    label: 'Esemény',
    shortLabel: 'Esemény',
    icon: 'lucide:calendar-days',
    description: 'Naptáresemény címmel, időponttal és helyszínnel, amely egy koppintással menthető.',
    examples: 'Koncert, 2026. június 12. 19:00',
    fields: [
      {
        key: 'title',
        label: 'Esemény neve',
        type: 'text',
        placeholder: 'Nyílt nap',
        required: true,
      },
      {
        key: 'startDate',
        label: 'Kezdés dátuma',
        type: 'date',
        required: true,
        half: true,
      },
      {
        key: 'startTime',
        label: 'Kezdés ideje',
        type: 'time',
        required: true,
        half: true,
      },
      {
        key: 'endDate',
        label: 'Befejezés dátuma (opcionális)',
        type: 'date',
        half: true,
      },
      {
        key: 'endTime',
        label: 'Befejezés ideje (opcionális)',
        type: 'time',
        half: true,
      },
      {
        key: 'location',
        label: 'Helyszín (opcionális)',
        type: 'text',
        placeholder: 'Budapest, Fő utca 1.',
        autocomplete: 'address-level1',
      },
      {
        key: 'description',
        label: 'Leírás (opcionális)',
        type: 'textarea',
        placeholder: 'Rövid információ az eseményről…',
        rows: 3,
      },
      {
        key: 'url',
        label: 'Esemény weboldala (opcionális)',
        type: 'url',
        placeholder: 'https://qrkod24.hu/esemeny',
        inputmode: 'url',
      },
    ],
  },
  {
    id: 'contact',
    label: 'Kapcsolat',
    shortLabel: 'Kapcsolat',
    icon: 'lucide:user-round',
    description: 'Egyszerű névjegy névvel, telefonszámmal és e-mail-címmel, hogy a beolvasó egy koppintással elmenthesse.',
    examples: 'Nagy Anna, +36 30 123 4567',
    fields: [
      {
        key: 'firstName',
        label: 'Keresztnév',
        type: 'text',
        placeholder: 'Anna',
        required: true,
        half: true,
        autocomplete: 'given-name',
      },
      {
        key: 'lastName',
        label: 'Vezetéknév',
        type: 'text',
        placeholder: 'Nagy',
        required: true,
        half: true,
        autocomplete: 'family-name',
      },
      {
        key: 'phone',
        label: 'Telefonszám',
        type: 'tel',
        placeholder: '+36 30 123 4567',
        half: true,
        inputmode: 'tel',
        autocomplete: 'tel',
      },
      {
        key: 'email',
        label: 'E-mail-cím',
        type: 'email',
        placeholder: 'anna@qrkod24.hu',
        half: true,
        inputmode: 'email',
        autocomplete: 'email',
      },
      {
        key: 'organization',
        label: 'Cég (opcionális)',
        type: 'text',
        placeholder: 'Példa Kft.',
        half: true,
        autocomplete: 'organization',
      },
      {
        key: 'title',
        label: 'Beosztás (opcionális)',
        type: 'text',
        placeholder: 'Ügyvezető',
        half: true,
        autocomplete: 'organization-title',
      },
    ],
  },
  {
    id: 'bank',
    label: 'Bank',
    shortLabel: 'Bank',
    icon: 'lucide:landmark',
    description: 'SEPA-átutalás előkészítése: a beolvasás után a banki alkalmazás kitölti a kedvezményezett adatait.',
    examples: 'HU42 1177 3016 1111 1018 0000 0000',
    fields: [
      {
        key: 'beneficiary',
        label: 'Kedvezményezett neve',
        type: 'text',
        placeholder: 'Példa Kft.',
        required: true,
        help: 'Legfeljebb 70 karakter, ahogy a bankszámlán szerepel.',
      },
      {
        key: 'iban',
        label: 'IBAN-számlaszám',
        type: 'text',
        placeholder: 'HU42 1177 3016 1111 1018 0000 0000',
        required: true,
        help: 'A szóközök elhagyhatók, a kód ellenőrzi az IBAN-t.',
      },
      {
        key: 'bic',
        label: 'BIC / SWIFT (opcionális)',
        type: 'text',
        placeholder: 'OTPVHUHB',
        half: true,
      },
      {
        key: 'currency',
        label: 'Pénznem',
        type: 'select',
        defaultValue: 'EUR',
        half: true,
        options: [
          { value: 'EUR', label: 'EUR – euró (SEPA)' },
          { value: 'HUF', label: 'HUF – forint' },
        ],
      },
      {
        key: 'amount',
        label: 'Összeg (opcionális)',
        type: 'number',
        placeholder: '5000',
        half: true,
        min: 0,
        step: 0.01,
        inputmode: 'decimal',
      },
      {
        key: 'reference',
        label: 'Közlemény (opcionális)',
        type: 'text',
        placeholder: 'Számla 2026-104',
        half: true,
      },
    ],
  },
  {
    id: 'paypal',
    label: 'PayPal',
    shortLabel: 'PayPal',
    icon: 'lucide:wallet',
    description: 'PayPal-fizetés kérése: a beolvasó a PayPal.Me oldaladra jut, opcionálisan előre kitöltött összeggel.',
    examples: 'paypal.me/pelda',
    fields: [
      {
        key: 'handle',
        label: 'PayPal.Me név vagy link',
        type: 'text',
        placeholder: 'pelda',
        required: true,
        help: 'A paypal.me utáni név, de a teljes paypal.me linket is elfogadja.',
      },
      {
        key: 'amount',
        label: 'Összeg (opcionális)',
        type: 'number',
        placeholder: '25',
        half: true,
        min: 0,
        step: 0.01,
        inputmode: 'decimal',
      },
      {
        key: 'currency',
        label: 'Pénznem',
        type: 'select',
        defaultValue: 'EUR',
        half: true,
        options: [
          { value: 'EUR', label: 'EUR' },
          { value: 'USD', label: 'USD' },
          { value: 'GBP', label: 'GBP' },
          { value: 'HUF', label: 'HUF' },
        ],
      },
    ],
  },
  {
    id: 'coupon',
    label: 'Kupon',
    shortLabel: 'Kupon',
    icon: 'lucide:ticket-percent',
    description: 'Kuponkód vagy akciós kód, amely beolvasás után szövegként jelenik meg a kasszánál.',
    examples: 'NYAR2026 – 10% kedvezmény',
    fields: [
      {
        key: 'code',
        label: 'Kuponkód',
        type: 'text',
        placeholder: 'NYAR2026',
        required: true,
        help: 'Legfeljebb 40 karakter. Nagybetűvel a legbiztonságosabb.',
      },
      {
        key: 'url',
        label: 'Beváltási link (opcionális)',
        type: 'url',
        placeholder: 'https://qrkod24.hu/akcio',
        inputmode: 'url',
      },
      {
        key: 'note',
        label: 'Feltétel vagy megjegyzés (opcionális)',
        type: 'text',
        placeholder: '2026. december 31-ig, egyszer beváltható',
        help: 'A kód alatt jelenik meg a beolvasó alkalmazásban.',
      },
    ],
  },
  {
    id: 'business',
    label: 'Céges',
    shortLabel: 'Céges',
    icon: 'lucide:building-2',
    description: 'Céges névjegy nyitvatartással és elérhetőségekkel – ügyfeleknek, partnereknek.',
    examples: 'Példa Kft., 1011 Budapest',
    fields: [
      {
        key: 'company',
        label: 'Cégnév',
        type: 'text',
        placeholder: 'Példa Kft.',
        required: true,
        autocomplete: 'organization',
      },
      {
        key: 'phone',
        label: 'Telefonszám',
        type: 'tel',
        placeholder: '+36 1 234 5678',
        half: true,
        inputmode: 'tel',
        autocomplete: 'tel',
      },
      {
        key: 'email',
        label: 'E-mail-cím',
        type: 'email',
        placeholder: 'info@qrkod24.hu',
        half: true,
        inputmode: 'email',
        autocomplete: 'email',
      },
      {
        key: 'website',
        label: 'Weboldal',
        type: 'url',
        placeholder: 'https://qrkod24.hu',
        inputmode: 'url',
        autocomplete: 'url',
      },
      {
        key: 'street',
        label: 'Utca, házszám',
        type: 'text',
        placeholder: 'Fő utca 1.',
        half: true,
        autocomplete: 'street-address',
      },
      {
        key: 'city',
        label: 'Város',
        type: 'text',
        placeholder: 'Budapest',
        half: true,
        autocomplete: 'address-level2',
      },
      {
        key: 'zip',
        label: 'Postakód',
        type: 'text',
        placeholder: '1011',
        half: true,
        autocomplete: 'postal-code',
      },
      {
        key: 'country',
        label: 'Ország',
        type: 'text',
        placeholder: 'Magyarország',
        half: true,
        autocomplete: 'country-name',
      },
      {
        key: 'hours',
        label: 'Nyitvatartás (opcionális)',
        type: 'textarea',
        placeholder: 'H–P: 9:00–17:00',
        rows: 2,
        help: 'A névjegy megjegyzésébe kerül, így mentés után is látható.',
      },
    ],
  },
  {
    id: 'pdf',
    label: 'PDF',
    shortLabel: 'PDF',
    icon: 'lucide:file-text',
    description: 'PDF dokumentum, árlista vagy tájékoztató megnyitása egyetlen beolvasással.',
    examples: 'https://qrkod24.hu/arlista.pdf',
    fields: [
      {
        key: 'url',
        label: 'PDF hivatkozása',
        type: 'url',
        placeholder: 'https://qrkod24.hu/arlista.pdf',
        required: true,
        inputmode: 'url',
        help: 'A fájlnak nyilvánosan elérhető címen kell lennie. A QR-kód a meglévő PDF-et nyitja meg.',
      },
    ],
  },
  {
    id: 'app',
    label: 'App',
    shortLabel: 'App',
    icon: 'lucide:smartphone',
    description: 'Alkalmazás letöltése App Store-ból vagy Google Play-ből egyetlen koppintással.',
    examples: 'https://apps.apple.com/…',
    fields: [
      {
        key: 'url',
        label: 'App Store vagy Google Play link',
        type: 'url',
        placeholder: 'https://play.google.com/store/apps/details?id=…',
        required: true,
        inputmode: 'url',
        help: 'Használhatod az univerzális linket is, amely a készüléknek megfelelő áruházat nyitja meg.',
      },
    ],
  },
  {
    id: 'event-page',
    label: 'Eseményoldal',
    shortLabel: 'Eseményoldal',
    icon: 'lucide:calendar-check',
    description: 'Esemény részletei, jelentkezés vagy jegyvásárlás a saját eseményoldaladon.',
    examples: 'https://qrkod24.hu/esemeny',
    fields: [
      {
        key: 'url',
        label: 'Eseményoldal címe',
        type: 'url',
        placeholder: 'https://qrkod24.hu/esemeny',
        required: true,
        inputmode: 'url',
      },
    ],
  },
  {
    id: 'menu',
    label: 'Étlap',
    shortLabel: 'Étlap',
    icon: 'lucide:utensils',
    description: 'Étlap megnyitása az asztalnál: PDF vagy webes étlap, frissíthető tartalommal.',
    examples: 'https://qrkod24.hu/etlap',
    fields: [
      {
        key: 'url',
        label: 'Étlap címe',
        type: 'url',
        placeholder: 'https://qrkod24.hu/etlap',
        required: true,
        inputmode: 'url',
        help: 'Ha az étlap PDF, akkor a PDF közvetlen linkjét add meg.',
      },
    ],
  },
  {
    id: 'feedback',
    label: 'Visszajelzés',
    shortLabel: 'Visszajelzés',
    icon: 'lucide:thumbs-up',
    description: 'Vendégvélemény vagy elégedettségi kérdőív megnyitása a beolvasás után.',
    examples: 'https://forms.gle/…',
    fields: [
      {
        key: 'url',
        label: 'Visszajelzés űrlap linkje',
        type: 'url',
        placeholder: 'https://forms.gle/…',
        required: true,
        inputmode: 'url',
      },
    ],
  },
  {
    id: 'form',
    label: 'Űrlap',
    shortLabel: 'Űrlap',
    icon: 'lucide:clipboard-list',
    description: 'Online űrlap, jelentkezés vagy ajánlatkérés megnyitása.',
    examples: 'https://qrkod24.hu/urlap',
    fields: [
      {
        key: 'url',
        label: 'Űrlap címe',
        type: 'url',
        placeholder: 'https://qrkod24.hu/urlap',
        required: true,
        inputmode: 'url',
        help: 'Google Űrlap, Microsoft Forms vagy a saját űrlapod linkje.',
      },
    ],
  },
  {
    id: 'files',
    label: 'Fájlok',
    shortLabel: 'Fájlok',
    icon: 'lucide:folder-open',
    description: 'Letöltendő fájl vagy megosztott mappa elérése a telefonról.',
    examples: 'https://drive.google.com/…',
    fields: [
      {
        key: 'url',
        label: 'Fájl vagy mappa linkje',
        type: 'url',
        placeholder: 'https://drive.google.com/…',
        required: true,
        inputmode: 'url',
        help: 'A megosztás legyen „bárki, aki a linkkel rendelkezik” szintű, különben a beolvasó nem éri el.',
      },
    ],
  },
  {
    id: 'audio',
    label: 'Hang',
    shortLabel: 'Hang',
    icon: 'lucide:headphones',
    description: 'Hanganyag, podcast vagy zenei lejátszási lista megnyitása.',
    examples: 'https://open.spotify.com/…',
    fields: [
      {
        key: 'url',
        label: 'Hanganyag linkje',
        type: 'url',
        placeholder: 'https://open.spotify.com/…',
        required: true,
        inputmode: 'url',
      },
    ],
  },
  {
    id: 'gallery',
    label: 'Galéria',
    shortLabel: 'Galéria',
    icon: 'lucide:images',
    description: 'Fotógaléria vagy album megnyitása a beolvasás után.',
    examples: 'https://photos.app.goo.gl/…',
    fields: [
      {
        key: 'url',
        label: 'Galéria linkje',
        type: 'url',
        placeholder: 'https://photos.app.goo.gl/…',
        required: true,
        inputmode: 'url',
      },
    ],
  },
  {
    id: 'video',
    label: 'Videó',
    shortLabel: 'Videó',
    icon: 'lucide:video',
    description: 'Videó, bemutató vagy YouTube-csatorna megnyitása.',
    examples: 'https://youtu.be/…',
    fields: [
      {
        key: 'url',
        label: 'Videó linkje',
        type: 'url',
        placeholder: 'https://youtu.be/…',
        required: true,
        inputmode: 'url',
      },
    ],
  },
]

/** A főoldali típusválasztó és a generátor fülei ebben a sorrendben jelennek meg. */
export const QR_MENU_ORDER: QrTypeId[] = [
  'text',
  'url',
  'vcard',
  'contact',
  'wifi',
  'social',
  'pdf',
  'whatsapp',
  'google-review',
  'menu',
  'email',
  'phone',
  'map',
  'event',
  'form',
  'feedback',
  'app',
  'video',
  'gallery',
  'files',
  'event-page',
  'coupon',
  'business',
  'sms',
  'bank',
  'paypal',
  'audio',
]

export const QR_MENU_TYPES: QrTypeDefinition[] = QR_MENU_ORDER.map(id => getQrType(id))

export function getQrType(id: string): QrTypeDefinition {
  return QR_TYPES.find(type => type.id === id) || QR_TYPES[0]!
}

export function isQrTypeId(value: unknown): value is QrTypeId {
  return typeof value === 'string' && QR_TYPES.some(type => type.id === value)
}

export function createDefaultValues(typeId: QrTypeId): QrFormValues {
  const type = getQrType(typeId)
  const values: QrFormValues = {}
  for (const field of type.fields) {
    values[field.key] = field.defaultValue ?? (field.type === 'checkbox' ? false : '')
  }
  return values
}

/**
 * Bemutató adatok: a generátor már az első betöltéskor mutat egy minta
 * QR-kódot, a felhasználó pedig bármikor felülírhatja a mezőket.
 */
export type UrlProtocol = 'https://' | 'http://' | 'www.'

/** A weboldal QR-kód előtag-választója. */
export const URL_PROTOCOLS: UrlProtocol[] = ['https://', 'http://', 'www.']

export const SAMPLE_VALUES: Partial<Record<QrTypeId, QrFormValues>> = {
  url: { protocol: 'https://', url: 'qrkod24.hu' },
  text: { text: 'Írd ide a szöveget, amelyet beolvasás után látni szeretnél.' },
  phone: { phone: '+36 30 123 4567' },
  email: { email: 'info@qrkod24.hu', subject: 'Ajánlatkérés', body: 'Kedves Csapat!\nÉrdeklődni szeretnék.' },
  sms: { phone: '+36 30 123 4567', message: 'Szia! Érdeklődni szeretnék.' },
  wifi: { ssid: 'VendegWiFi', security: 'WPA', password: 'vendeg-2026' },
  vcard: {
    firstName: 'Anna',
    lastName: 'Nagy',
    organization: 'Példa Kft.',
    title: 'Ügyvezető',
    phone: '+36 30 123 4567',
    email: 'anna@qrkod24.hu',
    website: 'https://qrkod24.hu',
  },
  contact: {
    firstName: 'Anna',
    lastName: 'Nagy',
    phone: '+36 30 123 4567',
    email: 'anna@qrkod24.hu',
    organization: 'Példa Kft.',
  },
  business: {
    company: 'Példa Kft.',
    phone: '+36 1 234 5678',
    email: 'info@qrkod24.hu',
    website: 'https://qrkod24.hu',
    street: 'Fő utca 1.',
    city: 'Budapest',
    zip: '1011',
  },
  whatsapp: { phone: '+36 30 123 4567', message: 'Szia! Érdeklődni szeretnék.' },
  social: { platform: 'instagram', handle: '@pelda' },
  'google-review': { url: 'https://g.page/r/pelda/review' },
  map: { address: 'Fő utca 1., Budapest' },
  event: {
    title: 'Nyílt nap',
    startDate: '2026-12-12',
    startTime: '18:00',
    endDate: '2026-12-12',
    endTime: '20:00',
    location: 'Budapest, Fő utca 1.',
  },
  paypal: { handle: 'pelda', currency: 'EUR' },
  bank: { beneficiary: 'Példa Kft.', iban: 'HU42 1177 3016 1111 1018 0000 0000', currency: 'EUR' },
  coupon: { code: 'NYAR2026' },
  pdf: { url: 'https://qrkod24.hu/arlista.pdf' },
  app: { url: 'https://play.google.com/store/apps' },
  'event-page': { url: 'https://qrkod24.hu/esemeny' },
  menu: { url: 'https://qrkod24.hu/etlap' },
  feedback: { url: 'https://forms.gle/pelda' },
  form: { url: 'https://qrkod24.hu/urlap' },
  files: { url: 'https://drive.google.com/' },
  audio: { url: 'https://open.spotify.com/' },
  gallery: { url: 'https://photos.app.goo.gl/' },
  video: { url: 'https://youtu.be/dQw4w9WgXcQ' },
}

export function createSampleValues(typeId: QrTypeId): QrFormValues {
  return { ...createDefaultValues(typeId), ...(SAMPLE_VALUES[typeId] || {}) }
}

function fail(errors: Record<string, string>): QrBuildResult {
  return { ok: false, errors, warnings: [] }
}

export function buildQrContent(typeId: QrTypeId, values: QrFormValues): QrBuildResult {
  const errors: Record<string, string> = {}
  const warnings: string[] = []
  const get = (key: string) => asString(values[key])

  if (typeId === 'url') {
    const protocol = URL_PROTOCOLS.includes(get('protocol') as UrlProtocol) ? (get('protocol') as UrlProtocol) : 'https://'
    const raw = get('url').trim()
    // A beírt címről levesszük a protokollt és a www. előtagot, hogy az
    // előtag-választó döntsön: https://, http:// vagy www.
    const scheme = raw.match(/^([a-z][a-z0-9+.-]*):\/\//i)
    const address = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/^www\./i, '').replace(/^\/+/, '')
    if (!raw) errors.url = 'Add meg a weboldal címét.'
    else if (scheme && !/^https?$/i.test(scheme[1]!)) errors.url = 'Csak http:// vagy https:// cím használható.'
    else if (!address) errors.url = 'Érvénytelen webcím. Példa: qrkod24.hu'
    else if (!parseHttpUrl(`https://${address}`)) {
      errors.url = 'Érvénytelen webcím. Példa: qrkod24.hu vagy https://qrkod24.hu/ajanlat'
    }
    if (Object.keys(errors).length) return fail(errors)
    if (protocol === 'www.') return { ok: true, data: `www.${address}`, warnings }
    return { ok: true, data: parseHttpUrl(`${protocol}${address}`)!.toString(), warnings }
  }

  if (typeId === 'text') {
    const text = get('text')
    if (!text) errors.text = 'Írj be valamilyen szöveget.'
    else if (text.length > 2000) errors.text = 'A szöveg legfeljebb 2000 karakter lehet.'
    if (Object.keys(errors).length) return fail(errors)
    return { ok: true, data: text, warnings }
  }

  if (typeId === 'phone') {
    const raw = get('phone')
    if (!raw) errors.phone = 'Add meg a telefonszámot.'
    const phone = raw ? normalizePhone(raw) : null
    if (raw && !phone) errors.phone = 'Érvénytelen telefonszám. Példa: +36 30 123 4567'
    if (Object.keys(errors).length || !phone) return fail(errors)
    return { ok: true, data: `tel:${phone}`, warnings }
  }

  if (typeId === 'email') {
    const email = get('email')
    if (!email) errors.email = 'Add meg az e-mail-címet.'
    else if (!isValidEmail(email)) errors.email = 'Érvénytelen e-mail-cím.'
    if (Object.keys(errors).length) return fail(errors)
    const subject = get('subject')
    const body = get('body')
    const params = new URLSearchParams()
    if (subject) params.set('subject', subject)
    if (body) params.set('body', body)
    const query = params.toString()
    return { ok: true, data: `mailto:${email}${query ? `?${query}` : ''}`, warnings }
  }

  if (typeId === 'sms') {
    const raw = get('phone')
    if (!raw) errors.phone = 'Add meg a telefonszámot.'
    const phone = raw ? normalizePhone(raw) : null
    if (raw && !phone) errors.phone = 'Érvénytelen telefonszám. Példa: +36 30 123 4567'
    if (Object.keys(errors).length || !phone) return fail(errors)
    const message = get('message')
    return {
      ok: true,
      data: `SMSTO:${phone}:${encodeURIComponent(message)}`,
      warnings,
    }
  }

  if (typeId === 'wifi') {
    const ssid = get('ssid')
    const security = get('security') || 'WPA'
    const password = get('password')
    const hidden = asBool(values.hidden)
    if (!ssid) errors.ssid = 'Add meg a hálózat nevét (SSID).'
    if (!['WPA', 'WEP', 'nopass'].includes(security)) errors.security = 'Válassz érvényes biztonsági típust.'
    if (security !== 'nopass' && !password) errors.password = 'Add meg a jelszót, vagy válaszd a nyílt hálózatot.'
    if (Object.keys(errors).length) return fail(errors)
    const parts = [
      `T:${security}`,
      `S:${escapeWifiValue(ssid)}`,
    ]
    if (security !== 'nopass') parts.push(`P:${escapeWifiValue(password)}`)
    if (hidden) parts.push('H:true')
    return { ok: true, data: `WIFI:${parts.join(';')};;`, warnings }
  }

  if (typeId === 'vcard') {
    const lastName = get('lastName')
    const firstName = get('firstName')
    const phoneRaw = get('phone')
    const email = get('email')
    const website = get('website')
    if (!lastName && !firstName) {
      errors.lastName = 'Adj meg legalább vezeték- vagy keresztnevet.'
    }
    if (phoneRaw && !normalizePhone(phoneRaw)) errors.phone = 'Érvénytelen telefonszám. Példa: +36 30 123 4567'
    if (email && !isValidEmail(email)) errors.email = 'Érvénytelen e-mail-cím.'
    if (website && !parseHttpUrl(website)) errors.website = 'Érvénytelen webcím. Példa: https://qrkod24.hu'
    if (Object.keys(errors).length) return fail(errors)

    const esc = escapeVCardValue
    const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0']
    lines.push(`N:${esc(lastName)};${esc(firstName)};;;`)
    lines.push(`FN:${esc([firstName, lastName].filter(Boolean).join(' '))}`)
    if (get('organization')) lines.push(`ORG:${esc(get('organization'))}`)
    if (get('title')) lines.push(`TITLE:${esc(get('title'))}`)
    const phone = phoneRaw ? normalizePhone(phoneRaw) : null
    if (phone) lines.push(`TEL;TYPE=CELL:${phone}`)
    if (email) lines.push(`EMAIL;TYPE=INTERNET:${email}`)
    if (website) lines.push(`URL:${parseHttpUrl(website)!.toString()}`)
    if (get('street') || get('city') || get('zip') || get('country')) {
      lines.push(
        `ADR;TYPE=WORK:;;${esc(get('street'))};${esc(get('city'))};;${esc(get('zip'))};${esc(get('country'))}`,
      )
    }
    if (get('note')) lines.push(`NOTE:${esc(get('note'))}`)
    lines.push('END:VCARD')
    return { ok: true, data: lines.join('\r\n'), warnings }
  }

  if (typeId === 'whatsapp') {
    const raw = get('phone')
    if (!raw) errors.phone = 'Add meg a WhatsApp-számot.'
    const phone = raw ? normalizePhone(raw) : null
    if (raw && !phone) errors.phone = 'Érvénytelen telefonszám. Példa: +36 30 123 4567'
    if (Object.keys(errors).length || !phone) return fail(errors)
    const message = get('message')
    const query = message ? `?text=${encodeURIComponent(message)}` : ''
    return { ok: true, data: `https://wa.me/${phone.replace('+', '')}${query}`, warnings }
  }

  if (typeId === 'social') {
    const platform = get('platform') || 'instagram'
    const input = get('handle')
    if (!input) {
      errors.handle = 'Add meg a felhasználónevet vagy a profil URL-jét.'
      return fail(errors)
    }
    const parsed = parseHttpUrl(input)
    if (parsed) {
      return { ok: true, data: parsed.toString(), warnings }
    }
    const handle = input.replace(/^@+/, '')
    if (!SOCIAL_HANDLE_RE.test(handle)) {
      errors.handle = 'Érvénytelen felhasználónév. Csak betűk, számok, pont, aláhúzás és kötőjel használható.'
      return fail(errors)
    }
    const map: Record<string, string> = {
      instagram: `https://www.instagram.com/${handle}`,
      facebook: `https://www.facebook.com/${handle}`,
      tiktok: `https://www.tiktok.com/@${handle}`,
      linkedin: `https://www.linkedin.com/in/${handle}`,
      youtube: `https://www.youtube.com/@${handle}`,
      x: `https://x.com/${handle}`,
    }
    const url = map[platform]
    if (!url) {
      errors.platform = 'Válassz érvényes platformot.'
      return fail(errors)
    }
    return { ok: true, data: url, warnings }
  }

  if (typeId === 'google-review') {
    const raw = get('url')
    if (!raw) errors.url = 'Add meg a Google-értékelési linket.'
    const url = raw ? parseHttpUrl(raw) : null
    if (raw && !url) errors.url = 'Érvénytelen webcím.'
    else if (url) {
      const host = url.hostname.toLowerCase()
      const allowed = ['goo.gl', 'g.page', 'maps.app.goo.gl'].some(domain => host === domain || host.endsWith(`.${domain}`))
        || /(^|\.)google\.[a-z.]+$/.test(host)
      if (!allowed) {
        errors.url = 'Ez nem tűnik Google-linknek. Használj g.page, maps.app.goo.gl vagy google.com címet.'
      }
    }
    if (Object.keys(errors).length || !url) return fail(errors)
    return { ok: true, data: url.toString(), warnings }
  }

  if (typeId === 'map') {
    const urlRaw = get('url')
    const address = get('address')
    const latRaw = get('latitude').replace(',', '.')
    const lngRaw = get('longitude').replace(',', '.')
    if (urlRaw) {
      const url = parseHttpUrl(urlRaw)
      if (!url) errors.url = 'Érvénytelen térképlink.'
      if (Object.keys(errors).length) return fail(errors)
      return { ok: true, data: url!.toString(), warnings }
    }
    if (latRaw || lngRaw) {
      const lat = Number(latRaw)
      const lng = Number(lngRaw)
      if (!latRaw || !lngRaw) errors.latitude = 'A koordinátához a szélességet és a hosszúságot is add meg.'
      else if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.latitude = 'A szélesség -90 és 90 között lehet.'
      else if (!Number.isFinite(lng) || lng < -180 || lng > 180) errors.longitude = 'A hosszúság -180 és 180 között lehet.'
      if (Object.keys(errors).length) return fail(errors)
      return {
        ok: true,
        data: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        warnings,
      }
    }
    if (address) {
      return {
        ok: true,
        data: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
        warnings,
      }
    }
    errors.url = 'Adj meg térképlinket, címet vagy koordinátát.'
    return fail(errors)
  }

  if (typeId === 'event') {
    const title = get('title')
    const startDate = get('startDate')
    const startTime = get('startTime')
    const endDate = get('endDate')
    const endTime = get('endTime')
    if (!title) errors.title = 'Add meg az esemény nevét.'
    if (!startDate) errors.startDate = 'Add meg a kezdés dátumát.'
    else if (!isValidDate(startDate)) errors.startDate = 'Érvénytelen dátum.'
    if (!startTime) errors.startTime = 'Add meg a kezdés idejét.'
    else if (!isValidTime(startTime)) errors.startTime = 'Érvénytelen időpont.'
    if (endDate && !isValidDate(endDate)) errors.endDate = 'Érvénytelen dátum.'
    if (endTime && !isValidTime(endTime)) errors.endTime = 'Érvénytelen időpont.'
    if ((endDate && !endTime) || (!endDate && endTime)) {
      errors.endTime = 'A befejezéshez a dátumot és az időt is add meg.'
    }
    if (!Object.keys(errors).length && startDate && startTime) {
      if (endDate && endTime) {
        const start = new Date(`${startDate}T${startTime}:00`).getTime()
        const end = new Date(`${endDate}T${endTime}:00`).getTime()
        if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
          errors.endTime = 'A befejezésnek a kezdés után kell lennie.'
        }
      }
    }
    const eventUrl = get('url')
    if (eventUrl && !parseHttpUrl(eventUrl)) errors.url = 'Érvénytelen webcím.'
    if (Object.keys(errors).length) return fail(errors)

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//QR Varazs//QR Kod Generator//HU',
      'BEGIN:VEVENT',
      `UID:${toICalStamp(startDate, startTime)}-event@qrkod24.hu`,
      `DTSTAMP:${toICalStamp(startDate, startTime)}`,
      `DTSTART:${toICalStamp(startDate, startTime)}`,
    ]
    if (endDate && endTime) lines.push(`DTEND:${toICalStamp(endDate, endTime)}`)
    lines.push(`SUMMARY:${escapeICalValue(title)}`)
    if (get('location')) lines.push(`LOCATION:${escapeICalValue(get('location'))}`)
    if (get('description')) lines.push(`DESCRIPTION:${escapeICalValue(get('description'))}`)
    if (eventUrl) lines.push(`URL:${parseHttpUrl(eventUrl)!.toString()}`)
    lines.push('END:VEVENT', 'END:VCALENDAR')
    return { ok: true, data: lines.join('\r\n'), warnings }
  }

  if (typeId === 'contact') {
    const firstName = get('firstName')
    const lastName = get('lastName')
    const phoneRaw = get('phone')
    const email = get('email')
    if (!firstName) errors.firstName = 'Add meg a keresztnevet.'
    if (!lastName) errors.lastName = 'Add meg a vezetéknevet.'
    if (phoneRaw && !normalizePhone(phoneRaw)) errors.phone = 'Érvénytelen telefonszám. Példa: +36 30 123 4567'
    if (email && !isValidEmail(email)) errors.email = 'Érvénytelen e-mail-cím.'
    if (Object.keys(errors).length) return fail(errors)

    const esc = escapeVCardValue
    const lines: string[] = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${esc(lastName)};${esc(firstName)};;;`,
      `FN:${esc(`${firstName} ${lastName}`.trim())}`,
    ]
    if (get('organization')) lines.push(`ORG:${esc(get('organization'))}`)
    if (get('title')) lines.push(`TITLE:${esc(get('title'))}`)
    const phone = phoneRaw ? normalizePhone(phoneRaw) : null
    if (phone) lines.push(`TEL;TYPE=CELL:${phone}`)
    if (email) lines.push(`EMAIL;TYPE=INTERNET:${email}`)
    lines.push('END:VCARD')
    return { ok: true, data: lines.join('\r\n'), warnings }
  }

  if (typeId === 'business') {
    const company = get('company')
    const phoneRaw = get('phone')
    const email = get('email')
    const website = get('website')
    if (!company) errors.company = 'Add meg a cégnév nevét.'
    if (phoneRaw && !normalizePhone(phoneRaw)) errors.phone = 'Érvénytelen telefonszám. Példa: +36 1 234 5678'
    if (email && !isValidEmail(email)) errors.email = 'Érvénytelen e-mail-cím.'
    if (website && !parseHttpUrl(website)) errors.website = 'Érvénytelen webcím. Példa: https://qrkod24.hu'
    if (get('hours').length > 300) errors.hours = 'A nyitvatartás legfeljebb 300 karakter lehet.'
    if (Object.keys(errors).length) return fail(errors)

    const esc = escapeVCardValue
    const lines: string[] = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${esc(company)};;;;`,
      `FN:${esc(company)}`,
      `ORG:${esc(company)}`,
    ]
    const phone = phoneRaw ? normalizePhone(phoneRaw) : null
    if (phone) lines.push(`TEL;TYPE=WORK,VOICE:${phone}`)
    if (email) lines.push(`EMAIL;TYPE=WORK:${email}`)
    if (website) lines.push(`URL:${parseHttpUrl(website)!.toString()}`)
    if (get('street') || get('city') || get('zip') || get('country')) {
      lines.push(
        `ADR;TYPE=WORK:;;${esc(get('street'))};${esc(get('city'))};;${esc(get('zip'))};${esc(get('country'))}`,
      )
    }
    if (get('hours')) lines.push(`NOTE:${esc(`Nyitvatartás: ${get('hours')}`)}`)
    lines.push('END:VCARD')
    return { ok: true, data: lines.join('\r\n'), warnings }
  }

  if (typeId === 'bank') {
    const beneficiary = get('beneficiary')
    const ibanRaw = get('iban')
    const bic = get('bic').toUpperCase()
    const currency = get('currency') || 'EUR'
    const reference = get('reference')
    const amountRaw = get('amount').replace(',', '.')

    if (!beneficiary) errors.beneficiary = 'Add meg a kedvezményezett nevét.'
    else if (beneficiary.length > 70) errors.beneficiary = 'A név legfeljebb 70 karakter lehet.'
    if (!ibanRaw) errors.iban = 'Add meg az IBAN-számlaszámot.'
    else if (!isValidIban(ibanRaw)) errors.iban = 'Érvénytelen IBAN. Ellenőrizd a számlaszámot.'
    if (bic && !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(bic)) errors.bic = 'A BIC 8 vagy 11 karakter lehet.'
    if (reference.length > 140) errors.reference = 'A közlemény legfeljebb 140 karakter lehet.'
    if (!['EUR', 'HUF'].includes(currency)) errors.currency = 'Válassz érvényes pénznemet.'

    let amount = ''
    if (amountRaw) {
      const parsedAmount = Number(amountRaw)
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        errors.amount = 'Nullánál nagyobb összeget adj meg.'
      } else {
        amount = `${currency}${parsedAmount.toFixed(2)}`
      }
    }
    if (currency === 'HUF' && amount) {
      warnings.push('A HUF összeget a legtöbb banki alkalmazás nem tölti ki automatikusan az EPC QR-kódból.')
    }
    if (Object.keys(errors).length) return fail(errors)

    const lines = [
      'BCD',
      '002',
      '1',
      'SCT',
      bic,
      beneficiary,
      ibanRaw.replace(/[\s-]/g, '').toUpperCase(),
      amount,
      '',
      reference,
    ]
    while (lines.length && lines[lines.length - 1] === '') lines.pop()
    return { ok: true, data: lines.join('\n'), warnings }
  }

  if (typeId === 'paypal') {
    const raw = get('handle')
    let handle = ''
    if (!raw) {
      errors.handle = 'Add meg a PayPal.Me nevet vagy linket.'
    } else {
      const parsed = parseHttpUrl(raw)
      handle = parsed
        ? parsed.pathname.split('/').filter(Boolean).pop() || ''
        : raw.replace(/^@+/, '')
      if (!/^[A-Za-z0-9._-]{2,30}$/.test(handle)) {
        errors.handle = 'Érvénytelen PayPal.Me név. Csak betűk, számok, pont, aláhúzás és kötőjel használható.'
      }
    }

    let amount = ''
    const amountRaw = get('amount').replace(',', '.')
    if (amountRaw) {
      const parsedAmount = Number(amountRaw)
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) errors.amount = 'Nullánál nagyobb összeget adj meg.'
      else amount = parsedAmount.toFixed(2)
    }
    if (Object.keys(errors).length) return fail(errors)

    const currency = get('currency') || 'EUR'
    return {
      ok: true,
      data: `https://www.paypal.com/paypalme/${handle}${amount ? `/${amount}${currency}` : ''}`,
      warnings,
    }
  }

  if (typeId === 'coupon') {
    const code = get('code')
    const urlRaw = get('url')
    const url = urlRaw ? parseHttpUrl(urlRaw) : null
    const note = get('note')
    if (!code) errors.code = 'Add meg a kuponkódot.'
    else if (code.length > 40) errors.code = 'A kuponkód legfeljebb 40 karakter lehet.'
    if (urlRaw && !url) errors.url = 'Érvénytelen webcím. Példa: https://qrkod24.hu/akcio'
    if (note.length > 120) errors.note = 'A megjegyzés legfeljebb 120 karakter lehet.'
    if (Object.keys(errors).length) return fail(errors)

    let data = `KUPON: ${code}`
    if (url) data += `\n${url.toString()}`
    if (note) data += `\n${note}`
    return { ok: true, data, warnings }
  }

  if (
    typeId === 'pdf' ||
    typeId === 'app' ||
    typeId === 'event-page' ||
    typeId === 'menu' ||
    typeId === 'feedback' ||
    typeId === 'form' ||
    typeId === 'files' ||
    typeId === 'audio' ||
    typeId === 'gallery' ||
    typeId === 'video'
  ) {
    const raw = get('url')
    const url = raw ? parseHttpUrl(raw) : null
    if (!raw) errors.url = 'Add meg a hivatkozott oldal címét.'
    else if (!url) errors.url = 'Érvénytelen webcím. Példa: https://qrkod24.hu'
    if (Object.keys(errors).length || !url) return fail(errors)
    return { ok: true, data: url.toString(), warnings }
  }

  errors.form = 'Ismeretlen QR-kód típus.'
  return fail(errors)
}

export const POPULAR_QR_TYPES = [
  { id: 'url', label: 'Weboldal QR-kód', icon: 'lucide:link', path: '/url-qr-kod-generator' },
  { id: 'vcard', label: 'Kapcsolat (vCard)', icon: 'lucide:id-card', path: '/vcard-qr-kod-generator' },
  { id: 'wifi', label: 'Wi-Fi megosztás', icon: 'lucide:wifi', path: '/wifi-qr-kod-generator' },
  { id: 'email', label: 'E-mail küldés', icon: 'lucide:mail', path: '/email-qr-kod-generator' },
  { id: 'phone', label: 'Telefonhívás', icon: 'lucide:phone', path: '/telefon-qr-kod-generator' },
  { id: 'sms', label: 'SMS küldés', icon: 'lucide:message-square', path: '/sms-qr-kod-generator' },
  { id: 'social', label: 'Közösségi oldalak', icon: 'lucide:share-2', path: '/qr-kod-generator' },
  { id: 'text', label: 'Szöveg', icon: 'lucide:type', path: '/szoveg-qr-kod-generator' },
] as const


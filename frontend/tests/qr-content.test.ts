import { describe, expect, it } from 'vitest'
import {
  QR_MENU_ORDER,
  QR_TYPES,
  buildQrContent,
  createDefaultValues,
  escapeWifiValue,
  isValidIban,
  normalizePhone,
  parseHttpUrl,
} from '../shared/qr/content'
import type { QrFormValues, QrTypeId } from '../shared/qr/types'

function build(type: QrTypeId, values: QrFormValues) {
  return buildQrContent(type, { ...createDefaultValues(type), ...values })
}

describe('QR type registry', () => {
  it('contains the required unique QR types with fields', () => {
    const ids = QR_TYPES.map(type => type.id)
    expect(ids).toHaveLength(28)
    expect(new Set(ids).size).toBe(28)
    for (const type of QR_TYPES) {
      expect(type.fields.length).toBeGreaterThan(0)
      const keys = type.fields.map(field => field.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it('lists every type exactly once in the home menu order', () => {
    expect(QR_MENU_ORDER).toHaveLength(QR_TYPES.length)
    expect(new Set(QR_MENU_ORDER).size).toBe(QR_TYPES.length)
    for (const type of QR_TYPES) expect(QR_MENU_ORDER).toContain(type.id)
  })
})

describe('URL QR codes', () => {
  it('adds https:// and normalizes a valid URL', () => {
    const result = build('url', { url: 'pelda.hu/ajanlat' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBe('https://pelda.hu/ajanlat')
  })

  it('rejects invalid and unsafe URL schemes', () => {
    expect(build('url', { url: '' }).ok).toBe(false)
    expect(build('url', { url: 'nem url' }).ok).toBe(false)
    expect(parseHttpUrl('javascript:alert(1)')).toBeNull()
    expect(parseHttpUrl('https://user:pass@pelda.hu')).toBeNull()
    expect(parseHttpUrl('http://localhost:3000')).toBeNull()
  })
})

describe('text QR codes', () => {
  it('preserves Hungarian accents and line breaks', () => {
    const text = 'Árvíztűrő tükörfúrógép\nMásodik sor – ő, ű, á, é.'
    const result = build('text', { text })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBe(text)
  })

  it('rejects empty text', () => {
    const result = build('text', { text: '   ' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.text).toBeTruthy()
  })
})

describe('phone QR codes', () => {
  it('normalizes Hungarian and international numbers', () => {
    expect(normalizePhone('06 30 123 4567')).toBe('+36301234567')
    expect(normalizePhone('+49 30 123456')).toBe('+4930123456')
    expect(normalizePhone('0036 1 234 5678')).toBe('+3612345678')
    expect(normalizePhone('123')).toBeNull()
    expect(normalizePhone('abc')).toBeNull()
    const result = build('phone', { phone: '06 30 123 4567' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBe('tel:+36301234567')
  })

  it('rejects an invalid phone number', () => {
    expect(build('phone', { phone: 'telefon' }).ok).toBe(false)
  })
})

describe('email QR codes', () => {
  it('builds a mailto URI with encoded subject and body', () => {
    const result = build('email', {
      email: 'info@pelda.hu',
      subject: 'Ajánlatkérés',
      body: 'Kedves Csapat!\nÉrdeklődöm.',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.startsWith('mailto:info@pelda.hu?')).toBe(true)
    const params = new URLSearchParams(result.data.split('?')[1])
    expect(params.get('subject')).toBe('Ajánlatkérés')
    expect(params.get('body')).toBe('Kedves Csapat!\nÉrdeklődöm.')
  })

  it('validates the email address', () => {
    const result = build('email', { email: 'nem-email' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.email).toBeTruthy()
  })
})

describe('SMS QR codes', () => {
  it('builds an SMSTO URI with an encoded message', () => {
    const result = build('sms', { phone: '+36 30 123 4567', message: 'Szia, időpontot kérnék!' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.startsWith('SMSTO:+36301234567:')).toBe(true)
      expect(result.data).toContain(encodeURIComponent('Szia, időpontot kérnék!'))
    }
  })
})

describe('Wi-Fi QR codes', () => {
  it('escapes special characters and supports hidden networks', () => {
    const result = build('wifi', {
      ssid: 'Café;Guest',
      security: 'WPA',
      password: 'p@ss;word:',
      hidden: true,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toBe('WIFI:T:WPA;S:Café\\;Guest;P:p@ss\\;word\\:;H:true;;')
    }
  })

  it('supports open networks and rejects missing passwords', () => {
    const open = build('wifi', { ssid: 'Vendeg', security: 'nopass', password: '' })
    expect(open.ok).toBe(true)
    if (open.ok) expect(open.data).toBe('WIFI:T:nopass;S:Vendeg;;')

    const missing = build('wifi', { ssid: 'Vendeg', security: 'WPA', password: '' })
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.errors.password).toBeTruthy()
  })

  it('escapes each special Wi-Fi character', () => {
    expect(escapeWifiValue('a\\b;c,d:e"f')).toBe('a\\\\b\\;c\\,d\\:e\\"f')
  })
})

describe('vCard QR codes', () => {
  it('builds CRLF-formatted vCard 3.0 data with escaped accents', () => {
    const result = build('vcard', {
      lastName: 'Nagy',
      firstName: 'Anna',
      organization: 'Példa Kft.',
      title: 'Ügyvezető',
      phone: '06 30 123 4567',
      email: 'anna@pelda.hu',
      website: 'pelda.hu',
      street: 'Fő utca 1.',
      city: 'Budapest',
      zip: '1011',
      country: 'Magyarország',
      note: 'Első sor\nMásodik sor',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toContain('\r\n')
    expect(result.data).toContain('BEGIN:VCARD')
    expect(result.data).toContain('VERSION:3.0')
    expect(result.data).toContain('N:Nagy;Anna;;;')
    expect(result.data).toContain('FN:Anna Nagy')
    expect(result.data).toContain('ORG:Példa Kft.')
    expect(result.data).toContain('TEL;TYPE=CELL:+36301234567')
    expect(result.data).toContain('EMAIL;TYPE=INTERNET:anna@pelda.hu')
    expect(result.data).toContain('URL:https://pelda.hu/')
    expect(result.data).toContain('ADR;TYPE=WORK:;;Fő utca 1.;Budapest;;1011;Magyarország')
    expect(result.data).toContain('NOTE:Első sor\\nMásodik sor')
    expect(result.data.endsWith('END:VCARD')).toBe(true)
  })

  it('requires at least one name and validates contact fields', () => {
    expect(build('vcard', { lastName: '', firstName: '' }).ok).toBe(false)
    expect(build('vcard', { lastName: 'Nagy', firstName: 'Anna', email: 'hibás' }).ok).toBe(false)
    expect(build('vcard', { lastName: 'Nagy', firstName: 'Anna', phone: 'x' }).ok).toBe(false)
  })
})

describe('WhatsApp and social QR codes', () => {
  it('builds a wa.me link and encodes the prefilled message', () => {
    const result = build('whatsapp', { phone: '+36 30 123 4567', message: 'Szia világ' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBe('https://wa.me/36301234567?text=Szia%20vil%C3%A1g')
  })

  it('builds social profile URLs from handles and accepts full URLs', () => {
    const instagram = build('social', { platform: 'instagram', handle: '@pelda' })
    expect(instagram.ok && instagram.data).toBe('https://www.instagram.com/pelda')
    const custom = build('social', { platform: 'instagram', handle: 'https://example.com/profil' })
    expect(custom.ok && custom.data).toBe('https://example.com/profil')
    expect(build('social', { platform: 'instagram', handle: 'nem megengedett név!' }).ok).toBe(false)
  })
})

describe('Google review QR codes', () => {
  it('accepts Google review links and rejects unrelated domains', () => {
    expect(build('google-review', { url: 'https://g.page/r/abc/review' }).ok).toBe(true)
    expect(build('google-review', { url: 'https://pelda.hu/ertekeles' }).ok).toBe(false)
    expect(build('google-review', { url: '' }).ok).toBe(false)
  })
})

describe('contact and business QR codes', () => {
  it('builds a short vCard for a contact', () => {
    const result = build('contact', {
      firstName: 'Anna',
      lastName: 'Nagy',
      phone: '06 30 123 4567',
      email: 'anna@pelda.hu',
      organization: 'Példa Kft.',
      title: 'Ügyvezető',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toContain('N:Nagy;Anna;;;')
    expect(result.data).toContain('FN:Anna Nagy')
    expect(result.data).toContain('ORG:Példa Kft.')
    expect(result.data).toContain('TEL;TYPE=CELL:+36301234567')
    expect(result.data.endsWith('END:VCARD')).toBe(true)
  })

  it('requires both names and validates the contact fields', () => {
    expect(build('contact', { firstName: '', lastName: '' }).ok).toBe(false)
    expect(build('contact', { firstName: 'Anna', lastName: 'Nagy', email: 'hibás' }).ok).toBe(false)
  })

  it('builds a company vCard with opening hours', () => {
    const result = build('business', {
      company: 'Példa Kft.',
      phone: '+36 1 234 5678',
      email: 'info@pelda.hu',
      website: 'pelda.hu',
      street: 'Fő utca 1.',
      city: 'Budapest',
      zip: '1011',
      country: 'Magyarország',
      hours: 'H–P: 9:00–17:00',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toContain('ORG:Példa Kft.')
    expect(result.data).toContain('TEL;TYPE=WORK,VOICE:+3612345678')
    expect(result.data).toContain('NOTE:Nyitvatartás: H–P: 9:00–17:00')
    expect(build('business', { company: '' }).ok).toBe(false)
  })
})

describe('bank QR codes', () => {
  it('validates IBAN checksums', () => {
    expect(isValidIban('HU42 1177 3016 1111 1018 0000 0000')).toBe(true)
    expect(isValidIban('HU42 1177 3016 1111 1018 0000 0001')).toBe(false)
    expect(isValidIban('HU42117730161111101800000000')).toBe(true)
    expect(isValidIban('nem-iban')).toBe(false)
  })

  it('builds an EPC QR payload with the amount and reference', () => {
    const result = build('bank', {
      beneficiary: 'Példa Kft.',
      iban: 'HU42 1177 3016 1111 1018 0000 0000',
      bic: 'OTPVHUHB',
      currency: 'EUR',
      amount: '49.9',
      reference: 'Számla 2026-104',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const lines = result.data.split('\n')
    expect(lines.slice(0, 4)).toEqual(['BCD', '002', '1', 'SCT'])
    expect(lines[5]).toBe('Példa Kft.')
    expect(lines[6]).toBe('HU42117730161111101800000000')
    expect(lines[7]).toBe('EUR49.90')
  })

  it('rejects an invalid IBAN and warns about HUF amounts', () => {
    const invalid = build('bank', { beneficiary: 'Példa Kft.', iban: 'HU00 0000' })
    expect(invalid.ok).toBe(false)
    if (!invalid.ok) expect(invalid.errors.iban).toBeTruthy()

    const huf = build('bank', {
      beneficiary: 'Példa Kft.',
      iban: 'HU42 1177 3016 1111 1018 0000 0000',
      currency: 'HUF',
      amount: '5000',
    })
    expect(huf.ok).toBe(true)
    if (huf.ok) expect(huf.warnings.length).toBeGreaterThan(0)
  })
})

describe('PayPal QR codes', () => {
  it('builds a PayPal.Me link with an optional amount', () => {
    const plain = build('paypal', { handle: '@pelda' })
    expect(plain.ok && plain.data).toBe('https://www.paypal.com/paypalme/pelda')

    const withAmount = build('paypal', { handle: 'pelda', amount: '25', currency: 'EUR' })
    expect(withAmount.ok && withAmount.data).toBe('https://www.paypal.com/paypalme/pelda/25.00EUR')

    const fromUrl = build('paypal', { handle: 'https://paypal.me/pelda' })
    expect(fromUrl.ok && fromUrl.data).toBe('https://www.paypal.com/paypalme/pelda')
  })

  it('rejects invalid handles and amounts', () => {
    expect(build('paypal', { handle: '' }).ok).toBe(false)
    expect(build('paypal', { handle: 'ne legyen szóköz' }).ok).toBe(false)
    expect(build('paypal', { handle: 'pelda', amount: '0' }).ok).toBe(false)
  })
})

describe('coupon QR codes', () => {
  it('builds a readable coupon payload with link and note', () => {
    const result = build('coupon', {
      code: 'NYAR2026',
      url: 'pelda.hu/akcio',
      note: 'December 31-ig',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toBe('KUPON: NYAR2026\nhttps://pelda.hu/akcio\nDecember 31-ig')
    }
  })

  it('requires a code', () => {
    const result = build('coupon', { code: '   ' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.code).toBeTruthy()
  })
})

describe('link-based QR codes', () => {
  const linkTypes = ['pdf', 'app', 'links', 'event-page', 'menu', 'feedback', 'form', 'files', 'audio', 'gallery', 'video'] as const

  it('normalizes the URL for every link type', () => {
    for (const type of linkTypes) {
      const result = build(type, { url: 'pelda.hu/tartalom' })
      expect(result.ok, type).toBe(true)
      if (result.ok) expect(result.data).toBe('https://pelda.hu/tartalom')
    }
  })

  it('requires a valid URL', () => {
    for (const type of linkTypes) {
      expect(build(type, { url: '' }).ok, type).toBe(false)
      expect(build(type, { url: 'javascript:alert(1)' }).ok, type).toBe(false)
    }
  })
})

describe('map QR codes', () => {
  it('builds map URLs from address or coordinates', () => {
    const address = build('map', { address: 'Fő utca 1., Budapest' })
    expect(address.ok).toBe(true)
    if (address.ok) {
      expect(address.data).toBe(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Fő utca 1., Budapest')}`)
    }

    const coords = build('map', { latitude: '47.4979', longitude: '19.0402' })
    expect(coords.ok).toBe(true)
    if (coords.ok) expect(coords.data).toBe('https://www.google.com/maps/search/?api=1&query=47.4979,19.0402')

    expect(build('map', {}).ok).toBe(false)
    expect(build('map', { latitude: '91', longitude: '19' }).ok).toBe(false)
  })
})

describe('event QR codes', () => {
  it('builds an iCalendar event with escaped content', () => {
    const result = build('event', {
      title: 'Nyílt nap; regisztráció',
      startDate: '2026-06-12',
      startTime: '19:00',
      endDate: '2026-06-12',
      endTime: '21:00',
      location: 'Budapest, Fő utca 1.',
      description: 'Bemutató, kérdések; válaszok.',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toContain('BEGIN:VCALENDAR')
    expect(result.data).toContain('DTSTART:20260612T190000')
    expect(result.data).toContain('DTEND:20260612T210000')
    expect(result.data).toContain('SUMMARY:Nyílt nap\\; regisztráció')
    expect(result.data).toContain('DESCRIPTION:Bemutató\\, kérdések\\; válaszok.')
  })

  it('rejects an end before the start', () => {
    const result = build('event', {
      title: 'Esemény',
      startDate: '2026-06-12',
      startTime: '19:00',
      endDate: '2026-06-12',
      endTime: '18:00',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.endTime).toBeTruthy()
  })
})


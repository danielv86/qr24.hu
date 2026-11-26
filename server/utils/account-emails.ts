import type { BillingInterval, PlanDefinition, SubscriptionSummary } from '#shared/types/api'
import { logger } from './logger'
import { sendMail } from './mailer'

/**
 * A fiókhoz tartozó tranzakcionális levelek. Minden levél a `renderEmail`
 * közös váza alapján épül fel, így a megjelenést (színek, fejléc, lábléc)
 * egyetlen helyen kell módosítani. A levelek nem részei a műveletnek: ha az
 * SMTP nincs beállítva vagy éppen nem elérhető, a művelet (regisztráció,
 * csomagváltás, törlés) akkor is sikeres marad, csak a levél marad el – ezért
 * minden értesítés a `sendAccountNotification`-ön keresztül megy.
 */
export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const TIME_ZONE = 'Europe/Budapest'

export function formatDateHu(date: Date): string {
  return date.toLocaleDateString('hu-HU', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTimeHu(date: Date): string {
  const time = date.toLocaleTimeString('hu-HU', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${formatDateHu(date)} ${time}`
}

export function greetingFor(name?: string | null): string {
  return name?.trim() ? `Szia ${name.trim()}!` : 'Szia!'
}

export function siteLink(siteUrl: string, path: string): string {
  return `${siteUrl.replace(/\/$/, '')}${path}`
}

export interface EmailRow {
  label: string
  value: string
}

export interface EmailContent {
  title: string
  greeting: string
  paragraphs: string[]
  /** Nagy, kiemelt kód (e-mail megerősítés). */
  code?: string
  rows?: EmailRow[]
  cta?: { label: string; url: string }
  footnote?: string
}

/** Egységes váz minden levélhez: fejléc, bekezdések, adatblokk, gomb, lábléc. */
export function renderEmail(content: EmailContent): { html: string; text: string } {
  const paragraphsHtml = content.paragraphs
    .map(
      paragraph =>
        `<p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#475569">${escapeHtml(paragraph)}</p>`,
    )
    .join('')

  const codeHtml = content.code
    ? `<tr>
      <td style="padding:18px 28px">
        <div style="border-radius:12px;background:#f5f3ff;border:1px solid #ddd6fe;padding:18px;text-align:center">
          <span style="font-size:30px;font-weight:800;letter-spacing:.22em;color:#4c1d95">${escapeHtml(content.code)}</span>
        </div>
      </td>
    </tr>`
    : ''

  const rowsHtml = content.rows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;border-radius:12px;background:#f5f3ff;border:1px solid #ddd6fe">${content.rows
        .map(
          row =>
            `<tr><td style="padding:11px 16px;font-size:13px;color:#6d28d9">${escapeHtml(row.label)}</td><td style="padding:11px 16px;font-size:14px;font-weight:600;color:#0f172a;text-align:right">${escapeHtml(row.value)}</td></tr>`,
        )
        .join('')}</table>`
    : ''

  const ctaHtml = content.cta
    ? `<tr>
      <td style="padding:18px 28px">
        <a href="${escapeHtml(content.cta.url)}" style="display:inline-block;border-radius:12px;background:#7c3aed;padding:13px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none">
          ${escapeHtml(content.cta.label)}
        </a>
        <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#64748b;word-break:break-all">${escapeHtml(content.cta.url)}</p>
      </td>
    </tr>`
    : ''

  const footnoteHtml = content.footnote
    ? `<tr>
      <td style="padding:0 28px 26px">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b">${escapeHtml(content.footnote)}</p>
      </td>
    </tr>`
    : ''

  const html = `<!doctype html>
<html lang="hu">
<body style="margin:0;padding:24px;background:#f5f3ff;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #ddd6fe;border-radius:16px">
    <tr>
      <td style="padding:28px 28px 8px">
        <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6d28d9">QRKOD24.hu</p>
        <h1 style="margin:14px 0 0;font-size:22px;line-height:1.3">${escapeHtml(content.title)}</h1>
        <p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#475569">${escapeHtml(content.greeting)}</p>
        ${paragraphsHtml}
      </td>
    </tr>
    ${codeHtml}
    ${rowsHtml ? `<tr><td style="padding:0 28px 6px">${rowsHtml}</td></tr>` : ''}
    ${ctaHtml}
    ${footnoteHtml}
  </table>
</body>
</html>`

  const text = [
    content.greeting,
    ...content.paragraphs,
    ...(content.code ? [content.code] : []),
    ...(content.rows?.length ? content.rows.map(row => `${row.label}: ${row.value}`) : []),
    ...(content.cta ? [`${content.cta.label}: ${content.cta.url}`] : []),
    ...(content.footnote ? [content.footnote] : []),
    'QRKOD24.hu – ingyenes QR-kód generátor',
  ].join('\n\n')

  return { html, text }
}

/**
 * A fiók megerősítése után: mit tud kezdeni a fiókjával. A limitek a
 * csomagbeállításokból jönnek, hogy az admin módosítása a levélben is
 * érvényesüljön.
 */
export function welcomeEmail(input: {
  name?: string | null
  siteUrl: string
  plan: PlanDefinition
}): RenderedEmail {
  return {
    subject: 'QRKOD24.hu – kész a fiókod',
    ...renderEmail({
      title: 'Kész a fiókod',
      greeting: greetingFor(input.name),
      paragraphs: [
        'Sikeresen megerősítetted az e-mail-címedet, így mostantól be tudsz jelentkezni a QRKOD24.hu fiókodba.',
        `A fiókodhoz tartozó ${input.plan.label} csomagban ${input.plan.maxDynamicQr} dinamikus QR-kódot hozhatsz létre, és ${input.plan.analyticsDays} napra visszamenőleg látod a scan-statisztikákat. Ha többre van szükséged, a fiókodon belül bármikor bővítheted a csomagot.`,
        'Tipp: a dinamikus QR-kód célcíme utólag is módosítható, a már kinyomtatott kód változatlan marad.',
      ],
      cta: { label: 'Irány a fiókom', url: siteLink(input.siteUrl, '/fiok') },
      footnote: 'Ha nem te regisztráltál, válaszolj erre a levélre, és töröljük a fiókot.',
    }),
  }
}

/**
 * E-mail-cím módosításakor a KORÁBBI címre megy, hogy a régi postafiók
 * tulajdonosa is értesüljön, ha valaki átállította a fiókot.
 */
export function emailChangedEmail(input: {
  name?: string | null
  newEmail: string
  when: Date
  siteUrl: string
}): RenderedEmail {
  return {
    subject: 'QRKOD24.hu – megváltozott a fiókod e-mail-címe',
    ...renderEmail({
      title: 'Megváltozott az e-mail-címed',
      greeting: greetingFor(input.name),
      paragraphs: [
        `A fiókod e-mail-címe megváltozott: ${formatDateTimeHu(input.when)} (magyar idő szerint).`,
        'Az új címet egy külön levélben kapott 8 karakteres kóddal kell megerősítened. A jelenlegi jelszavad változatlan marad.',
      ],
      rows: [{ label: 'Új e-mail-cím', value: input.newEmail }],
      cta: { label: 'Új jelszó kérése', url: siteLink(input.siteUrl, '/jelszo-emlekezteto') },
      footnote:
        'Ha nem te módosítottad a címet, valaki hozzáfért a fiókodhoz: állíts be új jelszót, és válaszolj erre a levélre.',
    }),
  }
}

/** Fióktörlés visszaigazolása a törölt címre (a törlés után már nincs fiók). */
export function accountDeletedEmail(input: {
  name?: string | null
  when: Date
}): RenderedEmail {
  return {
    subject: 'QRKOD24.hu – töröltük a fiókodat',
    ...renderEmail({
      title: 'Töröltük a fiókodat',
      greeting: greetingFor(input.name),
      paragraphs: [
        `A QRKOD24.hu fiókodat ${formatDateTimeHu(input.when)} (magyar idő szerint) töröltük.`,
        'A fiókhoz tartozó dinamikus QR-kódok, statisztikák, API-kulcsok, egyéni domainek és bejelentkezési adatok is törlődtek. A törlés nem visszavonható.',
        'A dinamikus QR-kódjaid ezért már nem irányítanak át; a korábban kinyomtatott statikus QR-kódok képe természetesen továbbra is beolvasható.',
      ],
      footnote: 'Ha nem te kérted a törlést, válaszolj erre a levélre, és megvizsgáljuk az esetet.',
    }),
  }
}

/**
 * Jelszó-változás vagy első jelszó beállítása. Akkor is kimegy, ha a
 * felhasználó nem maga kérte, hogy a postafiók tulajdonosa észrevegye az
 * illetéktelen hozzáférést.
 */
export function passwordChangedEmail(input: {
  name?: string | null
  siteUrl: string
  when?: Date
  firstTime?: boolean
}): RenderedEmail {
  const when = formatDateTimeHu(input.when ?? new Date())
  const changeLine = input.firstTime
    ? `A QRKOD24.hu fiókodhoz jelszót állítottál be: ${when} (magyar idő szerint). Mostantól e-mail-címmel és jelszóval is be tudsz jelentkezni.`
    : `A QRKOD24.hu fiókod jelszava megváltozott: ${when} (magyar idő szerint).`

  return {
    subject: input.firstTime
      ? 'QRKOD24.hu – jelszó beállítva'
      : 'QRKOD24.hu – a jelszavad megváltozott',
    ...renderEmail({
      title: input.firstTime ? 'Beállítottad a jelszavad' : 'Megváltozott a jelszavad',
      greeting: greetingFor(input.name),
      paragraphs: [
        changeLine,
        'Ha te változtattad meg, nincs további teendőd.',
        'Ha nem te voltál, valaki hozzáfért a postaládádhoz: állíts be új jelszót, és válaszolj erre a levélre.',
      ],
      cta: { label: 'Új jelszó kérése', url: siteLink(input.siteUrl, '/jelszo-emlekezteto') },
    }),
  }
}

const INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: 'havi',
  yearly: 'éves',
  lifetime: 'élettartam',
}

export interface SubscriptionEmailInput {
  name?: string | null
  summary: SubscriptionSummary
  siteUrl: string
}

function subscriptionRows(summary: SubscriptionSummary): EmailRow[] {
  const rows: EmailRow[] = [
    { label: 'Csomag', value: summary.planLabel },
    { label: 'Számlázás', value: INTERVAL_LABELS[summary.interval] },
  ]
  if (summary.currentPeriodEnd) {
    rows.push({
      label: summary.status === 'trialing' ? 'Próbaidő vége' : 'Időszak vége',
      value: formatDateHu(new Date(summary.currentPeriodEnd)),
    })
  }
  if (summary.price > 0) {
    const currency = summary.currency === 'HUF' ? 'Ft' : summary.currency
    rows.push({ label: 'Az időszak ára', value: `${summary.price.toLocaleString('hu-HU')} ${currency}` })
  }
  return rows
}

export function subscriptionStartedEmail(input: SubscriptionEmailInput): RenderedEmail {
  const { summary } = input
  const paragraphs =
    summary.status === 'trialing' && summary.currentPeriodEnd
      ? [
          `A(z) ${summary.planLabel} csomag mostantól aktív a fiókodon, próbaidővel.`,
          `A próbaidő ${formatDateHu(new Date(summary.currentPeriodEnd))}-ig tart, utána a fiók visszavált az ingyenes csomagra. Automatikus megújítás és terhelés nincs.`,
        ]
      : [
          `A(z) ${summary.planLabel} csomag mostantól aktív a fiókodon.`,
          summary.currentPeriodEnd
            ? `Az időszak ${formatDateHu(new Date(summary.currentPeriodEnd))}-ig tart, utána a fiók visszavált az ingyenes csomagra. Automatikus megújítás és terhelés nincs.`
            : 'A csomag a fiókodhoz tartozó időszakra érvényes.',
        ]

  return {
    subject: `${summary.planLabel} csomag – aktív a QRKOD24.hu fiókodon`,
    ...renderEmail({
      title: `Aktív a(z) ${summary.planLabel} csomag`,
      greeting: greetingFor(input.name),
      paragraphs,
      rows: subscriptionRows(summary),
      cta: { label: 'Csomagom kezelése', url: siteLink(input.siteUrl, '/fiok/szamlazas') },
    }),
  }
}

export function subscriptionCanceledEmail(input: SubscriptionEmailInput): RenderedEmail {
  const { summary } = input
  return {
    subject: `Lemondtad a(z) ${summary.planLabel} csomagot`,
    ...renderEmail({
      title: 'Lemondtad az előfizetésed',
      greeting: greetingFor(input.name),
      paragraphs: [
        summary.currentPeriodEnd
          ? `A(z) ${summary.planLabel} csomag ${formatDateHu(new Date(summary.currentPeriodEnd))}-ig még használható, utána a fiók automatikusan az ingyenes csomagra vált.`
          : `A(z) ${summary.planLabel} csomag az időszak végéig még használható, utána a fiók az ingyenes csomagra vált.`,
        'A lemondást az időszak végéig bármikor visszavonhatod; ekkor a csomag változatlanul tovább él.',
      ],
      rows: subscriptionRows(summary),
      cta: { label: 'Lemondás visszavonása', url: siteLink(input.siteUrl, '/fiok/szamlazas') },
    }),
  }
}

export function subscriptionResumedEmail(input: SubscriptionEmailInput): RenderedEmail {
  const { summary } = input
  return {
    subject: `Újraindítottad a(z) ${summary.planLabel} csomagot`,
    ...renderEmail({
      title: 'Ismét aktív az előfizetésed',
      greeting: greetingFor(input.name),
      paragraphs: [
        `A lemondást visszavontuk, a(z) ${summary.planLabel} csomag ${
          summary.currentPeriodEnd
            ? `${formatDateHu(new Date(summary.currentPeriodEnd))}-ig`
            : 'a hátralévő időszakra'
        } jár.`,
        'A fiókodban semmi további teendőd nincs, a csomag szolgáltatásai változatlanul elérhetők.',
      ],
      rows: subscriptionRows(summary),
      cta: { label: 'Csomagom kezelése', url: siteLink(input.siteUrl, '/fiok/szamlazas') },
    }),
  }
}

/** Biztonsági értesítés új API-kulcsról (a kulcs titkos értéke nélkül). */
export function apiKeyCreatedEmail(input: {
  name?: string | null
  keyName: string
  when: Date
  siteUrl: string
}): RenderedEmail {
  return {
    subject: 'QRKOD24.hu – új API-kulcs készült',
    ...renderEmail({
      title: 'Új API-kulcs a fiókodban',
      greeting: greetingFor(input.name),
      paragraphs: [
        `Új API-kulcsot hoztál létre: ${formatDateTimeHu(input.when)} (magyar idő szerint).`,
        'A kulcs titkos értékét csak egyszer láttad, ezt a levél nem tartalmazza. Ha elveszett, vond vissza, és készíts újat.',
        'Ha nem te hoztad létre, azonnal vond vissza a kulcsot, és változtass jelszót.',
      ],
      rows: [{ label: 'Kulcs neve', value: input.keyName }],
      cta: { label: 'API-kulcsok kezelése', url: siteLink(input.siteUrl, '/fiok/api') },
    }),
  }
}

export interface AccountNotificationInput {
  to: string
  email: RenderedEmail
  /** Naplózáshoz és az esetleges hibák beazonosításához. */
  kind: string
  userId?: bigint | number
}

/**
 * Értesítő levél küldése, ami sosem borítja a mögötte álló műveletet: hiba
 * esetén csak figyelmeztetést naplózunk. Visszatérés: kiment-e a levél.
 */
export async function sendAccountNotification(input: AccountNotificationInput): Promise<boolean> {
  try {
    await sendMail({ to: input.to, ...input.email })
    return true
  } catch (error) {
    logger.warn('Account notification email could not be sent', {
      kind: input.kind,
      ...(input.userId === undefined ? {} : { userId: Number(input.userId) }),
      error: error instanceof Error ? { name: error.name, message: error.message } : 'unknown',
    })
    return false
  }
}

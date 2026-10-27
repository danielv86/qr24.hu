export interface AdsenseSlots {
  top: string
  sidebar: string
  content: string
  guide: string
  mobile: string
}

export interface AdsenseSettings {
  client: string
  slots: AdsenseSlots
}

export interface LegalSettings {
  providerName: string
  providerAddress: string
  providerEmail: string
  providerPhone: string
  taxNumber: string
  registryNumber: string
  hostingProvider: string
  hostingAddress: string
}

export interface SeoOverride {
  title: string
  description: string
  noindex: boolean
}

export type PlanId = 'free' | 'pro' | 'business'

/**
 * Egy csomag szabályai. A backend ebből kényszeríti ki a limiteket, a felület
 * ugyanezt kapja meg a nyilvános beállításokkal, hogy a gombok állapota egyezzen.
 */
export interface PlanDefinition {
  id: PlanId
  label: string
  /** Egyszerre használható dinamikus QR-kódok száma. */
  maxDynamicQr: number
  /** Hány napra visszamenőleg érhető el a részletes analitika. */
  analyticsDays: number
  campaigns: boolean
  expiresAt: boolean
  csvExport: boolean
  apiAccess: boolean
  customDomain: boolean
  /** Havi listaár forintban; 0 = ingyenes. */
  priceMonthly: number
  /** Éves előfizetés ára forintban (a havi ár 12 hónapjához képest kedvezmény). */
  priceYearly: number
  /** Hány saját domain rendelhető a csomagban (0 = nem elérhető). */
  domainLimit: number
}

export type PlansConfig = Record<PlanId, PlanDefinition>

export interface PublicSettings {
  brandName: string
  siteUrl: string
  dynamicQrEnabled: boolean
  adsense: AdsenseSettings
  legal: LegalSettings
  seo: Record<string, SeoOverride>
  /** Ha valamiért nem érhető el, a felület nem kínál prémium funkciót. */
  plans?: PlansConfig
}

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiErrorBody {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, string>
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody

export interface DynamicQrListItem {
  id: number
  shortCode: string
  shortUrl: string
  targetUrl: string
  title: string | null
  status: string
  isActive: boolean
  scans: number
  createdAt: string
  updatedAt: string
  lastScanAt: string | null
}

export interface DynamicQrCreated extends DynamicQrListItem {
  editToken: string
}

export interface AdminQrListItem extends DynamicQrListItem {
  ownerRef: string | null
}

export interface AdminStats {
  totalQrCodes: number
  activeQrCodes: number
  totalScans: number
  scansLast30Days: number
  daily: { day: string; scans: number }[]
}

export interface AdminSession {
  email: string
  role: 'admin'
}

export interface DailyScanPoint {
  day: string
  scans: number
}

export interface UserProfile {
  id: number
  email: string
  name: string | null
  plan: string
  createdAt: string
}

export interface OAuthProviderAvailability {
  google: boolean
  apple: boolean
}

export interface UserSessionPayload {
  user: UserProfile | null
  providers: OAuthProviderAvailability
}

export type UserDynamicQrStatus = 'active' | 'paused' | 'expired' | 'archived'

export interface UserDynamicQrItem {
  id: number
  shortCode: string
  shortUrl: string
  name: string | null
  targetUrl: string
  status: UserDynamicQrStatus
  category: string | null
  campaign: string | null
  description: string | null
  expiresAt: string | null
  scans: number
  lastScanAt: string | null
  createdAt: string
  updatedAt: string
}

export interface UserDynamicQrList {
  items: UserDynamicQrItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export interface DashboardActivity {
  id: number
  action: string
  label: string
  qrName: string | null
  shortCode: string | null
  createdAt: string
}

export interface DashboardSummary {
  totalQrCodes: number
  activeQrCodes: number
  pausedQrCodes: number
  archivedQrCodes: number
  totalScans: number
  scansLast30Days: number
  plan: string
  planLabel: string
  planLimit: number
  topQrCodes: { shortCode: string; name: string | null; scans: number }[]
  recentActivity: DashboardActivity[]
}

export interface QrAnalyticsBreakdown {
  label: string
  count: number
}

export interface QrAnalytics {
  shortCode: string
  from: string
  to: string
  total: number
  humanTotal: number
  botTotal: number
  lastScanAt: string | null
  daily: DailyScanPoint[]
  devices: QrAnalyticsBreakdown[]
  browsers: QrAnalyticsBreakdown[]
}

export interface AccountScanItem {
  shortCode: string
  name: string | null
  createdAt: string
  device: string
  browser: string
  country: string | null
  isBot: boolean
}

/** Fiókszintű analitika: az összes saját dinamikus QR-kód együtt. */
export interface AccountAnalytics {
  from: string
  to: string
  days: number
  planAnalyticsDays: number
  total: number
  humanTotal: number
  botTotal: number
  daily: DailyScanPoint[]
  topQrCodes: { shortCode: string; name: string | null; scans: number }[]
  devices: QrAnalyticsBreakdown[]
  browsers: QrAnalyticsBreakdown[]
  countries: QrAnalyticsBreakdown[]
  referrers: QrAnalyticsBreakdown[]
  recentScans: AccountScanItem[]
}

export type CustomDomainStatus = 'pending' | 'verified'

export interface CustomDomainItem {
  id: number
  host: string
  status: CustomDomainStatus
  /** A TXT rekord neve és értéke, amivel a tulajdonjog igazolható. */
  verificationName: string
  verificationValue: string
  /** A hitelesített domainen használható rövidlink-előtag. */
  shortUrlBase: string
  verifiedAt: string | null
  lastCheckedAt: string | null
  createdAt: string
}

export interface ApiKeyItem {
  id: number
  name: string
  prefix: string
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
}

export interface ApiKeyCreated extends ApiKeyItem {
  /** A teljes kulcs csak létrehozáskor jelenik meg egyszer. */
  token: string
}

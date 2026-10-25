import type { QrTypeId } from '../qr/types'

export interface ContentFaq {
  question: string
  answer: string
}

export interface ContentSection {
  heading: string
  paragraphs: string[]
  bullets?: string[]
  tip?: string
}

export interface RelatedLink {
  label: string
  to: string
  description?: string
}

export interface LandingPageContent {
  slug: string
  title: string
  description: string
  h1: string
  kicker: string
  intro: string[]
  qrType?: QrTypeId
  showGenerator?: boolean
  sections: ContentSection[]
  faqs: ContentFaq[]
  related: RelatedLink[]
  updated: string
}

export interface LegalPageContent {
  slug: string
  title: string
  description: string
  h1: string
  intro: string[]
  sections: ContentSection[]
  updated: string
  requiresProviderData?: boolean
}

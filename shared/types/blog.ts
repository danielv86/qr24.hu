export type BlogPostStatus = 'draft' | 'published'

export interface BlogPostListItem {
  id: number
  slug: string
  title: string
  excerpt: string
  coverImage: string | null
  category: string
  tags: string[]
  status: BlogPostStatus
  publishedAt: string | null
  readingMinutes: number
  views: number
  createdAt: string
  updatedAt: string
}

export interface BlogPostDetail extends BlogPostListItem {
  /** Tisztított HTML, közvetlenül megjeleníthető. */
  content: string
}

export interface BlogCategoryCount {
  name: string
  count: number
}

export interface BlogPostPublicList {
  items: BlogPostListItem[]
  total: number
  page: number
  perPage: number
  categories: BlogCategoryCount[]
}

export interface BlogPostAdminList {
  items: BlogPostListItem[]
  total: number
  page: number
  perPage: number
  counts: { all: number; published: number; draft: number }
}

export interface BlogMediaResult {
  id: string
  url: string
  name: string
  mimeType: string
  size: number
}

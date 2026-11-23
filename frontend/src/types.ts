export interface User {
  id: number
  name: string
  email: string
  member_code: string
  phone?: string
  avatar?: string
  locked: boolean
  roles: string[]
  permissions: string[]
}
export interface Taxon {
  id: number
  name: string
  slug?: string
  books_count?: number
  color?: string
  bio?: string
  location?: string
}
export interface Book {
  editorial?: BookEditorial | null
  review_distribution?: { rating: number; count: number }[]
  id: number
  title: string
  slug: string
  isbn?: string
  authors: Taxon[]
  categories: Taxon[]
  publisher?: Taxon
  year?: number
  pages?: number
  language: string
  summary?: string
  description?: string
  cover?: string
  source?: string
  price?: number
  visible: boolean
  featured: boolean
  copies_count: number
  available_count: number
  loans_count: number
  reviews_count: number
  rating?: number
  reviews?: any[]
  copies?: any[]
  shelves?: Taxon[]
  can_review?: boolean
  my_loan?: any
  my_reservation?: any
}
export interface BookEditorial {
  headline?: string
  introduction?: string[]
  topics?: { title: string; description: string }[]
  takeaways?: string[]
  audience?: string[]
  reading_guide?: { title: string; description: string }[]
  author_notes?: { name: string; note: string }[]
  edition_note?: string
  sources?: { title: string; url: string }[]
}
export interface Page<T> {
  data: T[]
  meta: { current_page: number; last_page: number; total: number; per_page: number }
}

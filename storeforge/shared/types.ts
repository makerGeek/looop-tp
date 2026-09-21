/**
 * The store document model.
 *
 * Everything the AI builder produces lands in these shapes, and the storefront
 * renderer consumes them directly. Keeping one schema on both sides is what
 * makes "describe it and watch it appear" work: the model writes theme +
 * sections, the renderer has no other input.
 */

export type SectionType =
  | 'hero'
  | 'featured_products'
  | 'rich_text'
  | 'feature_grid'
  | 'testimonials'
  | 'gallery'
  | 'faq'
  | 'cta_banner'
  | 'newsletter'
  | 'logo_cloud'

export interface SectionBase {
  id: string
  type: SectionType
}

export interface HeroSection extends SectionBase {
  type: 'hero'
  heading: string
  subheading?: string
  ctaLabel?: string
  ctaHref?: string
  secondaryCtaLabel?: string
  secondaryCtaHref?: string
  image?: string
  layout?: 'center' | 'split' | 'minimal'
  eyebrow?: string
}

export interface FeaturedProductsSection extends SectionBase {
  type: 'featured_products'
  heading?: string
  subheading?: string
  /** Product handles to show. Empty means "the newest products in the store". */
  handles?: string[]
  collection?: string
  limit?: number
  columns?: 2 | 3 | 4
}

export interface RichTextSection extends SectionBase {
  type: 'rich_text'
  heading?: string
  body: string
  align?: 'left' | 'center'
}

export interface FeatureGridSection extends SectionBase {
  type: 'feature_grid'
  heading?: string
  subheading?: string
  items: Array<{ icon?: string, title: string, body: string }>
}

export interface TestimonialsSection extends SectionBase {
  type: 'testimonials'
  heading?: string
  items: Array<{ quote: string, author: string, role?: string }>
}

export interface GallerySection extends SectionBase {
  type: 'gallery'
  heading?: string
  images: string[]
}

export interface FaqSection extends SectionBase {
  type: 'faq'
  heading?: string
  items: Array<{ question: string, answer: string }>
}

export interface CtaBannerSection extends SectionBase {
  type: 'cta_banner'
  heading: string
  body?: string
  ctaLabel?: string
  ctaHref?: string
}

export interface NewsletterSection extends SectionBase {
  type: 'newsletter'
  heading?: string
  body?: string
  buttonLabel?: string
}

export interface LogoCloudSection extends SectionBase {
  type: 'logo_cloud'
  heading?: string
  items: string[]
}

export type Section =
  | HeroSection
  | FeaturedProductsSection
  | RichTextSection
  | FeatureGridSection
  | TestimonialsSection
  | GallerySection
  | FaqSection
  | CtaBannerSection
  | NewsletterSection
  | LogoCloudSection

export interface Theme {
  palette: {
    primary: string
    onPrimary: string
    background: string
    surface: string
    text: string
    muted: string
    border: string
    accent: string
  }
  fonts: {
    heading: string
    body: string
  }
  radius: 'none' | 'sm' | 'md' | 'lg' | 'full'
  density: 'compact' | 'comfortable' | 'airy'
  buttonStyle: 'solid' | 'outline' | 'pill'
}

export interface Brand {
  name: string
  tagline?: string
  logoText?: string
  announcement?: string
}

export interface StoreSettings {
  currency: string
  shippingFlatCents: number
  freeShippingThresholdCents: number | null
  taxRateBps: number
  supportEmail?: string
  footerLinks: Array<{ label: string, href: string }>
  socialLinks: Array<{ label: string, href: string }>
}

export interface StoreRecord {
  id: string
  userId: string
  name: string
  slug: string
  status: 'draft' | 'published'
  brand: Brand
  theme: Theme
  settings: StoreSettings
  createdAt: string
  updatedAt: string
}

export interface PageRecord {
  id: string
  storeId: string
  path: string
  title: string
  sections: Section[]
  isHome: boolean
  navLabel: string | null
  navOrder: number
}

export interface VariantRecord {
  id: string
  productId: string
  title: string
  priceCents: number | null
  sku: string | null
  inventory: number
}

export interface ProductRecord {
  id: string
  storeId: string
  handle: string
  title: string
  description: string
  priceCents: number
  compareAtCents: number | null
  image: string | null
  status: 'active' | 'draft'
  inventory: number
  tags: string[]
  collection: string | null
  variants: VariantRecord[]
  createdAt: string
}

export interface CartLine {
  productId: string
  variantId: string | null
  handle: string
  title: string
  variantTitle: string | null
  unitPriceCents: number
  quantity: number
  image: string | null
}

export interface CartTotals {
  subtotalCents: number
  shippingCents: number
  taxCents: number
  totalCents: number
}

export interface CartView {
  token: string
  lines: CartLine[]
  totals: CartTotals
  currency: string
}

export type OrderStatus = 'paid' | 'fulfilled' | 'refunded' | 'cancelled'

export interface OrderRecord {
  id: string
  storeId: string
  number: number
  email: string
  status: OrderStatus
  lines: CartLine[]
  totals: CartTotals
  currency: string
  shipping: {
    name: string
    address1: string
    address2?: string
    city: string
    region: string
    postal: string
    country: string
  }
  paymentRef: string
  createdAt: string
}

export type ChatRole = 'user' | 'assistant'

export interface BuildAction {
  tool: string
  summary: string
  detail?: string
}

export interface ChatMessageRecord {
  id: string
  storeId: string
  role: ChatRole
  content: string
  actions: BuildAction[]
  createdAt: string
}

/** Everything the storefront renderer needs for one page render. */
export interface StorefrontPayload {
  store: Pick<StoreRecord, 'id' | 'name' | 'slug' | 'status' | 'brand' | 'theme' | 'settings'>
  page: PageRecord
  nav: Array<{ label: string, href: string }>
  products: ProductRecord[]
}

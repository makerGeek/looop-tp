import type { CartView } from '#shared/types'

/**
 * Per-store cart state.
 *
 * Keyed by slug in `useState` so two storefronts open in one browser never see
 * each other's cart, and so the count in the header stays in sync with whatever
 * page last mutated it.
 */
export function useCart(slug: string) {
  const cart = useState<CartView | null>(`cart:${slug}`, () => null)
  const pending = useState<boolean>(`cart-pending:${slug}`, () => false)
  const error = useState<string | null>(`cart-error:${slug}`, () => null)

  const count = computed(() =>
    cart.value?.lines.reduce((sum, l) => sum + l.quantity, 0) ?? 0,
  )

  async function refresh() {
    // `useRequestFetch` forwards the cart cookie during SSR; `$fetch` would not,
    // so a server-rendered cart page would always look empty.
    const request = import.meta.server ? useRequestFetch() : $fetch
    try {
      cart.value = await request<CartView>(`/api/storefront/${slug}/cart`)
    }
    catch {
      // A missing cart is not an error worth surfacing — treat it as empty.
      cart.value = null
    }
  }

  async function mutate(body: Record<string, unknown>) {
    pending.value = true
    error.value = null
    try {
      cart.value = await $fetch<CartView>(`/api/storefront/${slug}/cart`, { method: 'POST', body })
    }
    catch (err: any) {
      error.value = err?.data?.statusMessage ?? err?.statusMessage ?? 'Could not update your cart'
    }
    finally {
      pending.value = false
    }
  }

  return {
    cart,
    count,
    pending,
    error,
    refresh,
    add: (handle: string, variantId: string | null = null, quantity = 1) =>
      mutate({ action: 'add', handle, variantId, quantity }),
    setQuantity: (productId: string, variantId: string | null, quantity: number) =>
      mutate({ action: 'setQuantity', productId, variantId, quantity }),
    remove: (productId: string, variantId: string | null) =>
      mutate({ action: 'remove', productId, variantId }),
    clear: () => mutate({ action: 'clear' }),
  }
}

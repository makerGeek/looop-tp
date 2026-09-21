import { listChat, listPages, listProducts } from '../../../db/repo'
import { requireOwnedStore } from '../../../utils/store-guard'
import { isAiConfigured } from '../../../ai/agent'

export default defineEventHandler((event) => {
  const store = requireOwnedStore(event)
  return {
    store,
    pages: listPages(store.id),
    products: listProducts(store.id),
    messages: listChat(store.id),
    aiConfigured: isAiConfigured(),
  }
})

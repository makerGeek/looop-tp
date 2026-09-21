import { createStore, slugExists } from '../../db/repo'
import { requireUser } from '../../utils/auth'
import { uniqueSlug } from '../../utils/slug'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const body = await readBody<{ name?: string }>(event)

  const name = (body?.name ?? '').trim() || 'Untitled store'
  if (name.length > 60) {
    throw createError({ statusCode: 400, statusMessage: 'Store name is too long' })
  }

  const slug = uniqueSlug(name, slugExists)
  return createStore(user.id, name, slug)
})

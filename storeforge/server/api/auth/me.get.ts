import { listOrgsForUser } from '../../db/repo'
import { currentUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await currentUser(event)
  if (!user) return { user: null, orgs: [] }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: !!user.emailVerifiedAt,
    },
    orgs: await listOrgsForUser(user.id),
  }
})

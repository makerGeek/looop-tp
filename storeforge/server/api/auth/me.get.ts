import { currentUser } from '../../utils/auth'

export default defineEventHandler((event) => {
  const user = currentUser(event)
  if (!user) return { user: null }
  return { user: { id: user.id, email: user.email, name: user.name } }
})

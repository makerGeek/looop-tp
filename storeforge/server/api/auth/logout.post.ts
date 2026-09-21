import { endSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await endSession(event)
  return { ok: true }
})

export default defineNuxtRouteMiddleware(async (to) => {
  const { user, refresh } = useAuth()
  if (!user.value) await refresh()

  if (!user.value) {
    return navigateTo(`/login?next=${encodeURIComponent(to.fullPath)}`)
  }
})

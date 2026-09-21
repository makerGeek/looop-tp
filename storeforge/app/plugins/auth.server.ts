/** Hydrates the session on first render so guards don't flash the login page. */
export default defineNuxtPlugin(async () => {
  const { refresh } = useAuth()
  await refresh()
})

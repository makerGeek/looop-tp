interface SessionUser { id: string, email: string, name: string }

/**
 * Session state, hydrated once on the server and shared across the app.
 *
 * Every read goes through `useRequestFetch()` rather than plain `$fetch`: during
 * SSR the latter sends no cookies, so the session would look empty on the server
 * and the auth middleware would bounce a signed-in user to the login page.
 */
export function useAuth() {
  const user = useState<SessionUser | null>('auth-user', () => null)

  async function refresh() {
    const request = useRequestFetch()
    try {
      const res = await request<{ user: SessionUser | null }>('/api/auth/me')
      user.value = res.user
    }
    catch {
      user.value = null
    }
  }

  async function login(email: string, password: string) {
    user.value = await $fetch<SessionUser>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
  }

  async function signup(email: string, password: string, name: string) {
    user.value = await $fetch<SessionUser>('/api/auth/signup', {
      method: 'POST',
      body: { email, password, name },
    })
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/login')
  }

  return { user, refresh, login, signup, logout }
}

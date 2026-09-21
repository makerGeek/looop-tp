interface SessionUser { id: string, email: string, name: string, emailVerified: boolean }

export interface OrgMembership {
  orgId: string
  orgName: string
  orgSlug: string
  role: 'owner' | 'admin' | 'member'
}

/**
 * Session state, hydrated once on the server and shared across the app.
 *
 * Reads go through `useRequestFetch()` rather than plain `$fetch`: during SSR the
 * latter sends no cookies, so the session would look empty on the server and the
 * auth middleware would bounce a signed-in user to the login page.
 */
export function useAuth() {
  const user = useState<SessionUser | null>('auth-user', () => null)
  const orgs = useState<OrgMembership[]>('auth-orgs', () => [])
  const activeOrgId = useState<string | null>('auth-active-org', () => null)

  const activeOrg = computed(() =>
    orgs.value.find(o => o.orgId === activeOrgId.value) ?? orgs.value[0] ?? null,
  )

  async function refresh() {
    const request = useRequestFetch()
    try {
      const res = await request<{ user: SessionUser | null, orgs: OrgMembership[] }>('/api/auth/me')
      user.value = res.user
      orgs.value = res.orgs
      if (!activeOrgId.value && res.orgs.length) activeOrgId.value = res.orgs[0]!.orgId
    }
    catch {
      user.value = null
      orgs.value = []
    }
  }

  async function login(email: string, password: string) {
    await $fetch('/api/auth/login', { method: 'POST', body: { email, password } })
    await refresh()
  }

  async function signup(email: string, password: string, name: string) {
    await $fetch('/api/auth/signup', { method: 'POST', body: { email, password, name } })
    await refresh()
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    orgs.value = []
    activeOrgId.value = null
    await navigateTo('/login')
  }

  return { user, orgs, activeOrg, activeOrgId, refresh, login, signup, logout }
}

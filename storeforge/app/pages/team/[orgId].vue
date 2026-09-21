<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

type Role = 'owner' | 'admin' | 'member'

interface Member {
  userId: string
  email: string
  name: string
  role: Role
  joinedAt: string
}

interface Invitation {
  id: string
  email: string
  role: Role
  expiresAt: string
}

const route = useRoute()
const orgId = String(route.params.orgId)
const { user, orgs, refresh: refreshAuth } = useAuth()

const { data, refresh, error: loadError } = await useFetch<{
  role: Role
  members: Member[]
  invitations: Invitation[]
}>(`/api/orgs/${orgId}/members`)

if (loadError.value) {
  throw createError({ statusCode: 404, statusMessage: 'Organization not found', fatal: true })
}

const org = computed(() => orgs.value.find(o => o.orgId === orgId))
const myRole = computed(() => data.value?.role ?? 'member')
const canInvite = computed(() => myRole.value === 'owner' || myRole.value === 'admin')
const canManageRoles = computed(() => myRole.value === 'owner')

const inviteEmail = ref('')
const inviteRole = ref<Role>('member')
const inviting = ref(false)
const inviteError = ref<string | null>(null)
/** Shown when mail isn't configured, so an invite can still be delivered by hand. */
const manualLink = ref<string | null>(null)

async function invite() {
  inviting.value = true
  inviteError.value = null
  manualLink.value = null
  try {
    const res = await $fetch<{ emailSent: boolean, inviteLink?: string }>(
      `/api/orgs/${orgId}/invitations`,
      { method: 'POST', body: { email: inviteEmail.value, role: inviteRole.value } },
    )
    if (!res.emailSent && res.inviteLink) manualLink.value = res.inviteLink
    inviteEmail.value = ''
    await refresh()
  }
  catch (err: any) {
    inviteError.value = err?.data?.statusMessage ?? 'Could not send that invitation'
  }
  finally {
    inviting.value = false
  }
}

async function changeRole(member: Member, role: Role) {
  try {
    await $fetch(`/api/orgs/${orgId}/members`, { method: 'PATCH', body: { userId: member.userId, role } })
    await refresh()
  }
  catch (err: any) {
    inviteError.value = err?.data?.statusMessage ?? 'Could not change that role'
  }
}

async function removeMember(member: Member) {
  const self = member.userId === user.value?.id
  const question = self
    ? `Leave ${org.value?.orgName ?? 'this organization'}? You'll lose access to its stores.`
    : `Remove ${member.name} from ${org.value?.orgName ?? 'this organization'}?`
  if (!confirm(question)) return

  try {
    await $fetch(`/api/orgs/${orgId}/members`, { method: 'DELETE', body: { userId: member.userId } })
    if (self) {
      await refreshAuth()
      await navigateTo('/dashboard')
      return
    }
    await refresh()
  }
  catch (err: any) {
    inviteError.value = err?.data?.statusMessage ?? 'Could not remove that member'
  }
}

async function revoke(invitation: Invitation) {
  await $fetch(`/api/orgs/${orgId}/members`, { method: 'DELETE', body: { invitationId: invitation.id } })
  await refresh()
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

useHead(() => ({ title: `Team — ${org.value?.orgName ?? 'StoreForge'}` }))
</script>

<template>
  <div class="sf-page">
    <div class="sf-page__head">
      <div>
        <h1>{{ org?.orgName ?? 'Team' }}</h1>
        <p>Everyone who can build and manage stores in this organization.</p>
      </div>
      <NuxtLink class="sf-btn sf-btn--ghost sf-btn--sm" to="/dashboard">Back to stores</NuxtLink>
    </div>

    <div v-if="inviteError" class="sf-alert sf-alert--error">{{ inviteError }}</div>

    <div v-if="canInvite" class="sf-card" style="margin-bottom: 24px;">
      <h3 style="margin: 0 0 14px; font-size: 15.5px;">Invite someone</h3>
      <form style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;" @submit.prevent="invite">
        <div class="sf-field" style="flex: 1; min-width: 220px; margin: 0;">
          <label class="sf-label" for="inviteEmail">Email</label>
          <input id="inviteEmail" v-model="inviteEmail" class="sf-input" type="email" required placeholder="teammate@company.com">
        </div>
        <div class="sf-field" style="margin: 0;">
          <label class="sf-label" for="inviteRole">Role</label>
          <select id="inviteRole" v-model="inviteRole" class="sf-select" style="width: auto;">
            <option value="member">Member — build and edit stores</option>
            <option value="admin">Admin — also manage stores and people</option>
          </select>
        </div>
        <button class="sf-btn" type="submit" :disabled="inviting || !inviteEmail">
          {{ inviting ? 'Sending…' : 'Send invite' }}
        </button>
      </form>

      <div v-if="manualLink" class="sf-alert sf-alert--info" style="margin: 14px 0 0;">
        Email isn't configured, so nothing was sent. Share this link directly — it expires in 7 days:
        <div class="sf-mono" style="margin-top: 8px; word-break: break-all; color: var(--sf-text);">
          {{ manualLink }}
        </div>
      </div>
    </div>

    <div class="sf-card" style="padding: 0; overflow-x: auto;">
      <table class="sf-table">
        <thead>
          <tr>
            <th>Member</th>
            <th>Role</th>
            <th>Joined</th>
            <th style="width: 110px;" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in data!.members" :key="member.userId">
            <td>
              <div style="font-weight: 550;">
                {{ member.name }}
                <span v-if="member.userId === user?.id" class="sf-faint" style="font-weight: 400;"> (you)</span>
              </div>
              <div class="sf-faint" style="font-size: 12.5px;">{{ member.email }}</div>
            </td>
            <td>
              <select
                v-if="canManageRoles"
                class="sf-select"
                style="width: auto; padding: 5px 9px; font-size: 13px;"
                :value="member.role"
                @change="changeRole(member, ($event.target as HTMLSelectElement).value as Role)"
              >
                <option value="owner">owner</option>
                <option value="admin">admin</option>
                <option value="member">member</option>
              </select>
              <span v-else class="sf-badge">{{ member.role }}</span>
            </td>
            <td class="sf-muted" style="font-size: 13px;">{{ formatDate(member.joinedAt) }}</td>
            <td style="text-align: right;">
              <button
                v-if="canInvite || member.userId === user?.id"
                class="sf-btn sf-btn--danger sf-btn--sm"
                @click="removeMember(member)"
              >
                {{ member.userId === user?.id ? 'Leave' : 'Remove' }}
              </button>
            </td>
          </tr>

          <tr v-for="invitation in data!.invitations" :key="invitation.id">
            <td>
              <div style="font-weight: 550;">{{ invitation.email }}</div>
              <div class="sf-faint" style="font-size: 12.5px;">Invitation pending</div>
            </td>
            <td><span class="sf-badge">{{ invitation.role }}</span></td>
            <td class="sf-muted" style="font-size: 13px;">Expires {{ formatDate(invitation.expiresAt) }}</td>
            <td style="text-align: right;">
              <button v-if="canInvite" class="sf-btn sf-btn--danger sf-btn--sm" @click="revoke(invitation)">
                Revoke
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

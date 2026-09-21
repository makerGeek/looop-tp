import { describe, expect, it } from 'vitest'
import { createClient, del, patch, post } from './helpers'

const client = () => createClient()

let seq = 0
const uniqueEmail = (label: string) => `${label}-${Date.now()}-${seq++}@test.io`

async function signUp(c: ReturnType<typeof client>, email: string) {
  return c.json<{ id: string, orgId: string }>('/api/auth/signup', post({
    email, password: 'password123', name: label(email),
  }))
}

const label = (email: string) => email.split('@')[0]!

interface Invite { emailSent: boolean, inviteLink?: string }

/** With no Resend key configured the API hands back the link instead of mailing it. */
function tokenFrom(invite: Invite): string {
  expect(invite.inviteLink, 'expected a link when email is not configured').toBeTruthy()
  return invite.inviteLink!.split('/invite/')[1]!
}

describe('invitations', () => {
  it('invites someone, lets them accept, and shares the org\'s stores', async () => {
    const owner = client()
    const ownerEmail = uniqueEmail('owner')
    const { orgId } = await signUp(owner, ownerEmail)

    const store = await owner.json<{ id: string }>('/api/stores', post({ name: 'Shared Co' }))

    const inviteeEmail = uniqueEmail('invitee')
    const invite = await owner.json<Invite>(`/api/orgs/${orgId}/invitations`, post({
      email: inviteeEmail, role: 'member',
    }))
    const token = tokenFrom(invite)

    // Before accepting, the invitee cannot see the store at all.
    const invitee = client()
    await signUp(invitee, inviteeEmail)
    expect(await invitee.status(`/api/stores/${store.id}`)).toBe(404)

    await invitee.json('/api/invitations/accept', post({ token }))

    // After accepting, it's theirs to work on.
    expect(await invitee.status(`/api/stores/${store.id}`)).toBe(200)
    const me = await invitee.json<{ orgs: Array<{ orgId: string, role: string }> }>('/api/auth/me')
    expect(me.orgs.map(o => o.orgId)).toContain(orgId)
    expect(me.orgs.find(o => o.orgId === orgId)!.role).toBe('member')
  })

  it('refuses an invitation addressed to someone else', async () => {
    const owner = client()
    const { orgId } = await signUp(owner, uniqueEmail('owner'))

    const invite = await owner.json<Invite>(`/api/orgs/${orgId}/invitations`, post({
      email: uniqueEmail('intended'), role: 'member',
    }))

    const wrongPerson = client()
    await signUp(wrongPerson, uniqueEmail('wrong'))

    const res = await wrongPerson.raw('/api/invitations/accept', post({ token: tokenFrom(invite) }))
    expect(res.status).toBe(403)
  })

  it('rejects an unknown token and refuses to invite an existing member', async () => {
    const owner = client()
    const ownerEmail = uniqueEmail('owner')
    const { orgId } = await signUp(owner, ownerEmail)

    expect(await owner.status('/api/invitations/accept', post({ token: 'not-a-real-token' }))).toBe(404)
    expect(await owner.status(`/api/orgs/${orgId}/invitations`, post({ email: ownerEmail }))).toBe(409)
    expect(await owner.status(`/api/orgs/${orgId}/invitations`, post({ email: 'not-an-email' }))).toBe(400)
  })
})

describe('roles', () => {
  /** Owner plus an accepted member in one org. */
  async function orgWithMember() {
    const owner = client()
    const { orgId } = await signUp(owner, uniqueEmail('owner'))

    const memberEmail = uniqueEmail('member')
    const invite = await owner.json<Invite>(`/api/orgs/${orgId}/invitations`, post({
      email: memberEmail, role: 'member',
    }))

    const member = client()
    const { id: memberId } = await signUp(member, memberEmail)
    await member.json('/api/invitations/accept', post({ token: tokenFrom(invite) }))

    return { owner, member, memberId, orgId }
  }

  it('stops a member from deleting a store or managing people', async () => {
    const { owner, member, orgId, memberId } = await orgWithMember()
    const store = await owner.json<{ id: string }>('/api/stores', post({ name: 'Role Co' }))

    // A member can build and edit…
    expect(await member.status(`/api/stores/${store.id}`)).toBe(200)
    expect(await member.status(`/api/stores/${store.id}`, patch({ name: 'Renamed' }))).toBe(200)

    // …but not destroy, invite, or change roles.
    expect(await member.status(`/api/stores/${store.id}`, del())).toBe(403)
    expect(await member.status(`/api/orgs/${orgId}/invitations`, post({ email: uniqueEmail('x') }))).toBe(403)
    expect(await member.status(`/api/orgs/${orgId}/members`, patch({ userId: memberId, role: 'owner' }))).toBe(403)
  })

  it('lets an owner promote a member, who can then delete stores', async () => {
    const { owner, member, orgId, memberId } = await orgWithMember()
    const store = await owner.json<{ id: string }>('/api/stores', post({ name: 'Promote Co' }))

    expect(await member.status(`/api/stores/${store.id}`, del())).toBe(403)

    await owner.json(`/api/orgs/${orgId}/members`, patch({ userId: memberId, role: 'admin' }))

    expect(await member.status(`/api/stores/${store.id}`, del())).toBe(200)
  })

  it('never lets the last owner step down or be removed', async () => {
    const owner = client()
    const { id: ownerId, orgId } = await signUp(owner, uniqueEmail('solo'))

    expect(await owner.status(`/api/orgs/${orgId}/members`, patch({ userId: ownerId, role: 'member' }))).toBe(409)
    expect(await owner.status(`/api/orgs/${orgId}/members`, del({ userId: ownerId }))).toBe(409)
  })

  it('hides another organization\'s member list', async () => {
    const owner = client()
    const { orgId } = await signUp(owner, uniqueEmail('owner'))

    const stranger = client()
    await signUp(stranger, uniqueEmail('stranger'))

    expect(await stranger.status(`/api/orgs/${orgId}/members`)).toBe(404)
    expect(await stranger.status(`/api/orgs/${orgId}/invitations`, post({ email: uniqueEmail('x') }))).toBe(404)
  })
})

describe('password reset', () => {
  it('answers identically whether or not the address exists', async () => {
    const c = client()
    const known = uniqueEmail('known')
    await signUp(c, known)

    const a = await c.json<{ message: string }>('/api/auth/request-reset', post({ email: known }))
    const b = await c.json<{ message: string }>('/api/auth/request-reset', post({
      email: 'definitely-not-registered@test.io',
    }))

    expect(a).toEqual(b)
  })

  it('rejects an invalid reset token', async () => {
    expect(await client().status('/api/auth/reset', post({
      token: 'bogus', password: 'newpassword123',
    }))).toBe(400)
  })
})

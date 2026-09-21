<script setup lang="ts">
import { formatMoney } from '#shared/money'

definePageMeta({ middleware: 'auth' })

interface Plan {
  id: 'free' | 'pro' | 'business'
  name: string
  priceCentsMonthly: number
  stores: number
  aiBuildsPerMonth: number
  customDomains: number
  blurb: string
}

const { activeOrgId, orgs } = useAuth()
const route = useRoute()

const { data, refresh } = await useFetch<{
  orgId: string
  plans: Plan[]
  currentPlan: string
  usage: { aiBuilds: number, buildLimit: number, remaining: number, period: string }
  billingEnabled: boolean
  subscription: {
    status: string
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
    hasBillingAccount: boolean
  }
}>('/api/billing/plans', { query: { orgId: activeOrgId } })

/** Only an owner can spend money, so only an owner sees the buttons. */
const isOwner = computed(() =>
  orgs.value.find(o => o.orgId === data.value?.orgId)?.role === 'owner',
)

const busy = ref<string | null>(null)
const problem = ref<string | null>(null)

/** Stripe redirects back with ?upgraded=1, but the webhook is what grants it. */
const justUpgraded = computed(() => route.query.upgraded === '1')

async function upgrade(plan: Plan) {
  busy.value = plan.id
  problem.value = null
  try {
    const res = await $fetch<{ url: string }>('/api/billing/checkout', {
      method: 'POST',
      body: { orgId: data.value!.orgId, plan: plan.id },
    })
    window.location.href = res.url
  }
  catch (err: any) {
    problem.value = err?.data?.statusMessage ?? 'Could not start checkout'
    busy.value = null
  }
}

async function manageBilling() {
  busy.value = 'portal'
  problem.value = null
  try {
    const res = await $fetch<{ url: string }>('/api/billing/portal', {
      method: 'POST',
      body: { orgId: data.value!.orgId },
    })
    window.location.href = res.url
  }
  catch (err: any) {
    problem.value = err?.data?.statusMessage ?? 'Could not open the billing portal'
    busy.value = null
  }
}

// The webhook can land a moment after the redirect, so re-check once.
onMounted(() => {
  if (justUpgraded.value) setTimeout(refresh, 1500)
})

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })

const usedPct = computed(() => {
  if (!data.value?.usage.buildLimit) return 0
  return Math.min(100, Math.round((data.value.usage.aiBuilds / data.value.usage.buildLimit) * 100))
})

useHead({ title: 'Plan — StoreForge' })
</script>

<template>
  <div v-if="data" class="sf-page">
    <div class="sf-page__head">
      <div>
        <h1>Plan &amp; usage</h1>
        <p>
          You're on the <strong>{{ data.currentPlan }}</strong> plan.
          <template v-if="data.subscription.cancelAtPeriodEnd && data.subscription.currentPeriodEnd">
            It ends on {{ formatDate(data.subscription.currentPeriodEnd) }}.
          </template>
          <template v-else-if="data.subscription.currentPeriodEnd">
            Renews {{ formatDate(data.subscription.currentPeriodEnd) }}.
          </template>
        </p>
      </div>
      <button
        v-if="isOwner && data.billingEnabled && data.subscription.hasBillingAccount"
        class="sf-btn sf-btn--ghost sf-btn--sm"
        :disabled="busy === 'portal'"
        @click="manageBilling"
      >
        {{ busy === 'portal' ? 'Opening…' : 'Manage billing' }}
      </button>
    </div>

    <div v-if="justUpgraded" class="sf-alert sf-alert--info">
      Thanks — your payment went through. The plan updates as soon as Stripe confirms it, usually
      within a few seconds.
    </div>

    <div v-if="data.subscription.status === 'past_due'" class="sf-alert sf-alert--error">
      Your last payment failed. Update your card from <strong>Manage billing</strong> to keep your
      plan — nothing has been removed yet.
    </div>

    <div v-if="problem" class="sf-alert sf-alert--error">{{ problem }}</div>

    <div class="sf-card" style="margin-bottom: 28px;">
      <h3 style="margin: 0 0 4px; font-size: 15.5px;">AI builds this month</h3>
      <p class="sf-muted" style="margin: 0 0 14px; font-size: 13.5px;">
        Billing period {{ data.usage.period }} · resets on the 1st
      </p>

      <div style="height: 8px; border-radius: 99px; background: var(--sf-bg-inset); overflow: hidden;">
        <div
          :style="{
            width: `${usedPct}%`,
            height: '100%',
            background: usedPct > 90 ? 'var(--sf-danger)' : 'var(--sf-accent)',
            transition: 'width .3s',
          }"
        />
      </div>
      <p class="sf-muted" style="margin: 10px 0 0; font-size: 13.5px;">
        {{ data.usage.aiBuilds }} of {{ data.usage.buildLimit }} used
        · {{ data.usage.remaining }} remaining
      </p>
    </div>

    <div v-if="!data.billingEnabled" class="sf-alert sf-alert--info">
      Stripe isn't configured on this deployment, so plans can be compared but not changed.
      Set <span class="sf-mono">NUXT_STRIPE_SECRET_KEY</span> to enable upgrades.
    </div>

    <div class="sf-grid sf-grid--3">
      <div
        v-for="plan in data.plans"
        :key="plan.id"
        class="sf-card"
        :style="plan.id === data.currentPlan ? 'border-color: var(--sf-accent);' : ''"
      >
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <h3 style="margin: 0; font-size: 17px; font-weight: 640;">{{ plan.name }}</h3>
          <span v-if="plan.id === data.currentPlan" class="sf-badge sf-badge--live">Current</span>
        </div>

        <div style="margin: 12px 0 6px; font-size: 27px; font-weight: 680; letter-spacing: -0.02em;">
          {{ formatMoney(plan.priceCentsMonthly) }}
          <span class="sf-faint" style="font-size: 14px; font-weight: 400;">/mo</span>
        </div>

        <p class="sf-muted" style="font-size: 13.5px; margin: 0 0 16px; line-height: 1.6;">{{ plan.blurb }}</p>

        <ul style="list-style: none; padding: 0; margin: 0 0 18px; font-size: 14px; display: grid; gap: 7px;">
          <li>{{ plan.stores }} store{{ plan.stores === 1 ? '' : 's' }}</li>
          <li>{{ plan.aiBuildsPerMonth.toLocaleString() }} AI builds a month</li>
          <li>
            {{ plan.customDomains === 0 ? 'No custom domain' : `${plan.customDomains} custom domain${plan.customDomains === 1 ? '' : 's'}` }}
          </li>
        </ul>

        <button
          v-if="plan.id !== data.currentPlan && plan.priceCentsMonthly > 0"
          class="sf-btn"
          style="width: 100%;"
          :disabled="!data.billingEnabled || !isOwner || busy === plan.id"
          @click="upgrade(plan)"
        >
          <template v-if="!data.billingEnabled">Billing not configured</template>
          <template v-else-if="!isOwner">Owners can change the plan</template>
          <template v-else-if="busy === plan.id">Opening checkout…</template>
          <template v-else>Switch to {{ plan.name }}</template>
        </button>

        <button
          v-else-if="plan.id !== data.currentPlan"
          class="sf-btn sf-btn--ghost"
          style="width: 100%;"
          :disabled="!isOwner || !data.subscription.hasBillingAccount"
          @click="manageBilling"
        >
          Downgrade in billing
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { user, orgs, activeOrg, activeOrgId, logout } = useAuth()

const switching = ref(false)

function switchOrg(orgId: string) {
  activeOrgId.value = orgId
  switching.value = false
}
</script>

<template>
  <div class="sf-shell">
    <header class="sf-topbar">
      <NuxtLink class="sf-logo" to="/">
        <span class="sf-logo__mark">S</span>
        StoreForge
      </NuxtLink>

      <template v-if="user">
        <nav class="sf-nav">
          <NuxtLink to="/dashboard">Stores</NuxtLink>
          <NuxtLink v-if="activeOrg" :to="`/team/${activeOrg.orgId}`">Team</NuxtLink>
          <NuxtLink to="/pricing">Plan</NuxtLink>
        </nav>

        <!-- Only worth showing once someone belongs to more than one org. -->
        <div v-if="orgs.length > 1" style="position: relative;">
          <button class="sf-btn sf-btn--ghost sf-btn--sm" @click="switching = !switching">
            {{ activeOrg?.orgName }} ▾
          </button>
          <div
            v-if="switching"
            class="sf-card"
            style="position: absolute; top: 100%; left: 0; margin-top: 6px; padding: 6px; min-width: 220px; z-index: 40;"
          >
            <button
              v-for="org in orgs"
              :key="org.orgId"
              class="sf-btn sf-btn--ghost sf-btn--sm"
              style="width: 100%; justify-content: space-between; border: none;"
              @click="switchOrg(org.orgId)"
            >
              <span>{{ org.orgName }}</span>
              <span class="sf-faint" style="font-size: 11.5px;">{{ org.role }}</span>
            </button>
          </div>
        </div>
      </template>

      <div class="sf-spacer" />

      <template v-if="user">
        <span class="sf-faint" style="font-size: 13px;">{{ user.email }}</span>
        <button class="sf-btn sf-btn--ghost sf-btn--sm" @click="logout">Sign out</button>
      </template>
      <template v-else>
        <NuxtLink class="sf-btn sf-btn--ghost sf-btn--sm" to="/login">Sign in</NuxtLink>
        <NuxtLink class="sf-btn sf-btn--sm" to="/signup">Start building</NuxtLink>
      </template>
    </header>

    <slot />
  </div>
</template>

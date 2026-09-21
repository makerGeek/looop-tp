<script setup lang="ts">
const { user, logout } = useAuth()
</script>

<template>
  <div class="sf-shell">
    <header class="sf-topbar">
      <NuxtLink class="sf-logo" to="/">
        <span class="sf-logo__mark">S</span>
        StoreForge
      </NuxtLink>

      <nav v-if="user" class="sf-nav">
        <NuxtLink to="/dashboard">Stores</NuxtLink>
      </nav>

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

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'

const auth = useAuthStore()

useTheme()

onMounted(() => {
  if (auth.token) {
    auth.fetchMe().catch(() => {
      // token 失效时静默清理
    })
  }
})
</script>

<template>
  <router-view />
</template>

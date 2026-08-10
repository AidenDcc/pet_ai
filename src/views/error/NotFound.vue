<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
const router = useRouter()
const { t } = useI18n()
</script>

<template>
  <div class="not-found">
    <div class="nf-code">404</div>
    <div class="nf-text">{{ t('common.pageLost') }}</div>
    <el-button type="primary" @click="router.push('/login')">{{ t('common.backHome') }}</el-button>
  </div>
</template>

<style scoped>
.not-found {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--sp-bg);
}
.nf-code {
  font-size: 72px;
  font-weight: 800;
  color: var(--sp-primary);
}
.nf-text {
  color: var(--sp-text-secondary);
  margin-bottom: 8px;
}
</style>

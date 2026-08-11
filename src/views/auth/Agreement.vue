<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PhoneShell from '@/components/PhoneShell.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

/** /agreement/:type — service | privacy | register */
const type = computed(() => (route.params.type as string) || 'service')

const title = computed(() => {
  if (type.value === 'privacy') return t('agreement.privacyTitle')
  if (type.value === 'register') return t('agreement.registerTitle')
  return t('agreement.serviceTitle')
})

/** 通用协议条款段落（agreement.p1 ~ p13） */
const paragraphs = computed(() => {
  const list: string[] = []
  for (let i = 1; i <= 13; i++) list.push(t(`agreement.p${i}`))
  return list
})

const updatedAt = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
</script>

<template>
  <PhoneShell>
    <div class="agreement-app">
      <!-- 顶部导航 -->
      <div class="auth-nav">
        <van-icon name="arrow-left" size="20" class="nav-back" @click="router.back()" />
        <span class="nav-title">{{ title }}</span>
        <span class="nav-right"></span>
      </div>

      <!-- 协议正文 -->
      <div class="agreement-body">
        <h2 class="agreement-title">{{ title }}</h2>
        <div class="agreement-date">{{ t('agreement.updated', { date: updatedAt }) }}</div>
        <div class="agreement-content">
          <p
            v-for="(p, i) in paragraphs"
            :key="i"
            class="agreement-p"
            :class="{ 'agreement-heading': p.startsWith('一、') || p.startsWith('二、') || p.startsWith('三、') || p.startsWith('四、') || p.startsWith('五、') || p.startsWith('六、') || /^\d+\.\s/.test(p) }"
          >
            {{ p }}
          </p>
        </div>
      </div>
    </div>
  </PhoneShell>
</template>

<style scoped lang="scss">
.agreement-app {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: #fff;
}

/* ---------- 顶部导航 ---------- */
.auth-nav {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 46px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid var(--sp-border);
  .nav-back {
    padding: 4px;
    color: var(--sp-text);
    cursor: pointer;
  }
  .nav-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--sp-text);
  }
  .nav-right {
    width: 28px;
  }
}

.agreement-body {
  padding: 20px 22px 40px;
}

.agreement-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--sp-text);
  text-align: center;
}

.agreement-date {
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
  color: var(--sp-text-placeholder);
}

.agreement-content {
  margin-top: 18px;
  .agreement-p {
    font-size: 14px;
    line-height: 1.9;
    color: var(--sp-text-secondary);
    margin-bottom: 12px;
    text-align: justify;
    &.agreement-heading {
      font-weight: 700;
      color: var(--sp-text);
      margin-top: 6px;
    }
  }
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useI18nStore } from '@/stores/i18n'
import PhoneShell from '@/components/PhoneShell.vue'
import type { AppLocale } from '@/locales'
import type { Role } from '@/types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { t } = useI18n()
const i18nStore = useI18nStore()

/** 宠物主端 = 手机 APP 样式（套手机外壳 + 静态导航栏/底部栏）；医生端保持普通移动 H5 列 */
const isUserApp = computed(() => auth.role === 'user')

const showTabbar = computed(() => route.meta.tabbar === true)
const hideNavbar = computed(() => route.meta.hideNavbar === true)
const title = computed(() => (route.meta.titleKey ? t(route.meta.titleKey as string) : 'ShuxinPet'))

/** 语言切换：显示当前语言的短标签（中文=中 / English=EN），点击弹出选择 */
const showLangSheet = ref(false)
const langLabel = computed(() => (i18nStore.locale === 'zh-CN' ? '中' : 'EN'))
const langOptions = computed(() => [
  { name: t('admin.i18n.zh'), value: 'zh-CN' },
  { name: t('admin.i18n.en'), value: 'en-US' },
])
function onLangSelect(action: { value: AppLocale } | undefined) {
  if (action) i18nStore.applyLocale(action.value)
  showLangSheet.value = false
}

interface TabItem {
  key: string
  titleKey: string
  icon: string
  routeName: string
  match: string[]
}

/** 各角色的底部 Tabbar 配置（match 命中当前高亮 tab；title 存 i18n key） */
const TAB_CONFIG: Record<Role, TabItem[]> = {
  user: [
    { key: 'home', titleKey: 'nav.home', icon: 'home-o', routeName: 'user-home', match: ['/user/home'] },
    { key: 'health', titleKey: 'nav.healthMonitor', icon: 'chart-trending-o', routeName: 'user-health', match: ['/user/health'] },
    { key: 'location', titleKey: 'nav.realtimeLoc', icon: 'location-o', routeName: 'user-location', match: ['/user/location'] },
    { key: 'me', titleKey: 'nav.me', icon: 'user-o', routeName: 'user-me', match: ['/user/me'] },
  ],
  doctor: [
    { key: 'dashboard', titleKey: 'nav.dashboard', icon: 'apps-o', routeName: 'doctor-dashboard', match: ['/doctor/dashboard'] },
    { key: 'patients', titleKey: 'nav.patientManage', icon: 'friends-o', routeName: 'doctor-patients', match: ['/doctor/patients'] },
    { key: 'telemetry', titleKey: 'nav.telemetry', icon: 'chart-trending-o', routeName: 'doctor-telemetry', match: ['/doctor/telemetry'] },
    { key: 'reports', titleKey: 'nav.healthReport', icon: 'description-o', routeName: 'doctor-reports', match: ['/doctor/reports'] },
    { key: 'ai', titleKey: 'nav.aiAnalysis', icon: 'bulb-o', routeName: 'doctor-ai', match: ['/doctor/ai-analysis'] },
    { key: 'bi', titleKey: 'nav.bi', icon: 'bar-chart-o', routeName: 'doctor-bi', match: ['/doctor/bi'] },
  ],
  admin: [],
}

const tabs = computed(() => TAB_CONFIG[auth.role as Role] ?? TAB_CONFIG.user)

const active = computed(() => {
  const path = route.path
  return tabs.value.find((t) => t.match.some((p) => path.startsWith(p)))?.key ?? ''
})

function onTabChange(name: string | number) {
  const tab = tabs.value.find((t) => t.key === String(name))
  if (tab && tab.routeName !== route.name) router.push({ name: tab.routeName })
}
</script>

<template>
  <!-- 宠物主端：手机 APP 外壳 -->
  <PhoneShell v-if="isUserApp" :transparent-status="hideNavbar">
    <van-nav-bar v-if="!hideNavbar" :title="title">
      <template #left>
        <van-icon v-if="!showTabbar" name="arrow-left" size="18" @click="router.back()" />
      </template>
      <template #right>
        <span class="lang-toggle" @click="showLangSheet = true">{{ langLabel }}</span>
      </template>
    </van-nav-bar>
    <div class="app-body" :class="{ 'app-body--fullscreen': hideNavbar }">
      <router-view />
    </div>
    <van-tabbar v-if="showTabbar" :model-value="active" :fixed="false" active-color="#ff6b00" :class="{ 'tabbar--bottom': hideNavbar }" @change="onTabChange">
      <van-tabbar-item v-for="tab in tabs" :key="tab.key" :name="tab.key" :icon="tab.icon">{{ t(tab.titleKey) }}</van-tabbar-item>
    </van-tabbar>
  </PhoneShell>

  <!-- 医生端：普通移动 H5 列 -->
  <div v-else class="mobile-layout">
    <van-nav-bar :title="title" fixed placeholder safe-area-inset-top>
      <template #left>
        <van-icon v-if="!showTabbar" name="arrow-left" size="18" @click="router.back()" />
      </template>
      <template #right>
        <span class="lang-toggle" @click="showLangSheet = true">{{ langLabel }}</span>
      </template>
    </van-nav-bar>

    <div class="mobile-content">
      <router-view />
    </div>

    <van-tabbar v-if="showTabbar" :model-value="active" active-color="#ff6b00" @change="onTabChange">
      <van-tabbar-item v-for="tab in tabs" :key="tab.key" :name="tab.key" :icon="tab.icon">{{ t(tab.titleKey) }}</van-tabbar-item>
    </van-tabbar>
  </div>

  <van-action-sheet
    v-model:show="showLangSheet"
    :title="t('common.language')"
    :cancel-text="t('common.cancel')"
    :actions="langOptions"
    @select="onLangSelect"
  />
</template>

<style scoped lang="scss">
.mobile-layout {
  position: relative;
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--sp-bg);
  box-shadow: 0 0 28px rgba(0, 0, 0, 0.08);
}

.mobile-content {
  min-height: 100vh;
  padding-bottom: 60px;
}

.mobile-layout :deep(.van-tabbar) {
  max-width: 480px;
  left: 50%;
  transform: translateX(-50%);
}

/* 手机外壳内滚动区 */
.app-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;

  &--fullscreen {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
}

/* 全屏页（hideNavbar）时 app-body 为 absolute 脱离文档流，
   tabbar 在 flex 容器中需要用 auto margin 推到底部 */
:deep(.tabbar--bottom) {
  margin-top: auto !important;
}

.lang-toggle {
  font-size: 13px;
  font-weight: 600;
  color: var(--sp-text);
  padding: 4px 10px;
  border: 1px solid var(--sp-border);
  border-radius: 12px;
  line-height: 1.4;
}
</style>

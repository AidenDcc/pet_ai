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

/** 宠物主端 / 医生端 = 手机 APP 样式（套华为 Mate80 手机外壳 + 静态导航栏/底部栏） */
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
    { key: 'health', titleKey: 'nav.guard', icon: 'guard', routeName: 'user-health', match: ['/user/health'] },
    { key: 'community', titleKey: 'nav.community', icon: 'circle-paw', routeName: 'user-community', match: ['/user/community'] },
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
  <!-- 宠物主端 / 医生端：手机 APP 外壳 -->
  <PhoneShell :transparent-status="hideNavbar">
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
      <van-tabbar-item v-for="tab in tabs" :key="tab.key" :name="tab.key">
        <template #icon>
          <!-- 宠圈：宠物社交圈子（圆环+爪印）；守护：src/asset/image/bg-pet.svg 守护盾牌 —— 均随选中态着色；其余页签仍用 Vant 图标 -->
          <svg v-if="tab.icon === 'circle-paw'" class="tabbar-circle-paw-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path fill="currentColor" d="M12 11.4c-1.2 0-2.15.9-2.15 2.05s.95 2.05 2.15 2.05 2.15-.9 2.15-2.05-.95-2.05-2.15-2.05z" />
            <circle cx="8.85" cy="10.15" r="1.05" fill="currentColor" />
            <circle cx="10.8" cy="9" r="1.05" fill="currentColor" />
            <circle cx="13.2" cy="9" r="1.05" fill="currentColor" />
            <circle cx="15.15" cy="10.15" r="1.05" fill="currentColor" />
          </svg>
          <svg v-else-if="tab.icon === 'guard'" class="tabbar-guard-icon" viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true">
            <path d="M435.201146 398.813102c93.03376-53.713067 216.740427-28.187102 309.331696 14.357415 39.523643 18.16149 78.362748 39.950128 107.855795 71.95305 29.485657 32.007189 48.710049 75.732546 43.009706 118.851263-5.696076 43.126107-40.55129 83.124172-83.869483 86.58446-25.751155 2.057958-53.305409-7.898878-76.669101 3.107088-21.456131 10.111557-31.634675 34.226869-42.100968 55.522718-7.562773 15.402227-18.08503 31.498208-32.285035 39.824679-14.303548 8.130062-33.511595 9.198881-50.624311 8.043054-23.675893-1.583849-49.661294-4.82975-69.134568 8.699149-21.213292 14.730568-26.371813 43.56428-41.025368 64.843845-24.658917 35.796169-76.722741 45.970981-116.919084 29.340874-40.184686-16.626984-68.44715-55.134208-81.41597-96.677397-12.96882-41.543189-12.426171-86.068893-8.392662-129.378117 9.45725-101.481963 49.586753-221.569224 142.24362-275.06469z m82.154667 142.296057c-21.840385-8.200923-52.330001-8.71822-70.368434 4.957765-15.595297 11.831887-20.560358 34.907882-14.89872 54.646926 5.907819 20.59211 20.409141 35.247268 38.161442 45.975956 21.489118 12.985578 47.743019 20.195201 69.26738 25.169289a307.9424 307.9424 0 0 0 34.9976 6.004288l0.068798-0.000306a31.982933 31.982933 0 0 0 32.590268-18.816l0.027273-0.05516a307.797333 307.797333 0 0 0 12.298934-33.310955c6.454495-21.127687 13.337728-47.469043 12.836447-72.571956-0.407775-20.742554-5.856244-40.624379-20.728235-56.041022-14.271085-14.768378-36.745404-22.002239-54.782377-14.416527-20.862966 8.783749-35.659782 35.447179-39.470376 58.457702z m150.906506-444.17533c45.077662-6.949332 90.467024 53.013481 97.965832 108.583132 7.495685 55.581307-22.971267 106.269131-68.04893 113.218462-45.067149 6.933408-87.690357-32.485754-95.181775-88.059671-7.503075-55.577041 20.194601-126.796858 65.260606-133.749313z m-483.294051 373.278148c44.379592 34.286374 57.213373 90.90447 28.656244 126.468204-28.557129 35.563735-87.680158 36.600711-132.062873 2.325994-44.379592-34.286374-73.61423-103.57612-45.057101-139.139855 28.549739-35.559468 104.081015-23.92906 148.45634 10.349924zM366.080397 47.873253c44.081848-25.450667 117.662501 19.47743 149.735034 75.028687 32.0768 55.558647 22.342547 121.215759-21.739301 146.666426-44.074458 25.4464-105.809701 1.052222-137.882235-54.499036-32.0768-55.558647-34.192223-141.757068 9.882235-167.203468z m-225.282746 122.874039c44.081848-25.450667 117.666768 19.48482 149.743568 75.043467 32.068267 55.543867 22.33828 121.208369-21.743568 146.659036-44.074458 25.4464-105.813968 1.044831-137.882234-54.499036-32.0768-55.558647-34.192223-141.757068 9.882234-167.203467z" />
          </svg>
          <van-icon v-else :name="tab.icon" />
        </template>
        {{ t(tab.titleKey) }}
      </van-tabbar-item>
    </van-tabbar>
  </PhoneShell>


  <van-action-sheet
    v-model:show="showLangSheet"
    :title="t('common.language')"
    :cancel-text="t('common.cancel')"
    :actions="langOptions"
    @select="onLangSelect"
  />
</template>

<style scoped lang="scss">
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

/* 底部栏宠圈图标（宠物社交圈子：圆环+爪印）：尺寸与 Vant 图标一致，颜色继承选中态 */
.tabbar-circle-paw-icon {
  width: 22px;
  height: 22px;
  display: block;
}

/* 底部栏守护图标（src/asset/image/bg-pet.svg）：尺寸与 Vant 图标一致，颜色继承选中态 */
.tabbar-guard-icon {
  width: 22px;
  height: 22px;
  display: block;
}
</style>

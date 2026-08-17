<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showConfirmDialog } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { useI18nStore } from '@/stores/i18n'
import { APP_VERSION } from '@/utils/consts'

const router = useRouter()
const { t } = useI18n()
const auth = useAuthStore()
const i18nStore = useI18nStore()

/** 系统语言：开=English 关=中文 */
const langOn = computed(() => i18nStore.locale === 'en-US')

function toggleLang(v: boolean) {
  i18nStore.applyLocale(v ? 'en-US' : 'zh-CN')
}

function go(path: string) {
  router.push(path)
}

async function onLogout() {
  try {
    await showConfirmDialog({ message: t('doctor.settings.logoutConfirm') })
  } catch {
    return // 取消
  }
  auth.logout()
  router.replace('/')
}

const rows = computed(() => [
  {
    key: 'password',
    label: t('doctor.settings.changePassword'),
    icon: 'lock',
    onClick: () => go('/doctor/change-password'),
  },
  {
    key: 'language',
    label: t('doctor.settings.language'),
    icon: 'font-o',
    showArrow: false,
  },
  {
    key: 'feedback',
    label: t('doctor.settings.feedback'),
    icon: 'chat-o',
    onClick: () => go('/doctor/settings/feedback'),
  },
  {
    key: 'about',
    label: t('doctor.settings.about'),
    icon: 'info-o',
    onClick: () => go('/doctor/about'),
  },
  {
    key: 'version',
    label: t('doctor.settings.version'),
    icon: 'medal-o',
    right: `v${APP_VERSION}`,
    onClick: () => go('/doctor/version'),
  },
  {
    key: 'services',
    label: t('doctor.settings.services'),
    icon: 'shield-o',
    onClick: () => go('/doctor/settings/services'),
  },
  {
    key: 'cancel',
    label: t('doctor.settings.cancelAccount'),
    icon: 'warning-o',
    danger: true,
    onClick: () => go('/doctor/settings/cancel'),
  },
])
</script>

<template>
  <div class="settings-page">
    <SettingList theme="doctor" :items="rows">
      <template #right-language>
        <span class="lang-label">{{ langOn ? 'English' : '中文' }}</span>
        <van-switch
          :model-value="langOn"
          size="20px"
          active-color="#00b4a6"
          inactive-color="#cfe9e6"
          @update:model-value="toggleLang"
        />
      </template>
    </SettingList>

    <div class="settings-logout" @click="onLogout">{{ t('common.logout') }}</div>

    <div class="settings-foot">{{ t('brand.name') }} · {{ t('brand.platform') }} · v{{ APP_VERSION }}</div>
  </div>
</template>

<style scoped lang="scss">
.settings-page {
  min-height: 100%;
  box-sizing: border-box;
  padding-bottom: 48px;
  background: #eef7f6;

  .lang-label {
    margin-right: 6px;
    font-size: 13px;
    color: #5e8580;
  }
}

.settings-logout {
  margin: 18px 14px 0;
  padding: 14px;
  text-align: center;
  background: #fff;
  border-radius: 18px;
  color: #ff3b30;
  font-weight: 600;
  cursor: pointer;
}

.settings-foot {
  margin-top: 16px;
  text-align: center;
  font-size: 11px;
  color: #a0b8b4;
}
</style>

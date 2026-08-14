<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast, showConfirmDialog } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { useI18nStore } from '@/stores/i18n'
import { APP_VERSION } from '@/utils/consts'
import { ensureCacheSeed, measureCacheSizeMb, clearNonAuthCache } from '@/utils/settings'

const router = useRouter()
const { t } = useI18n()
const auth = useAuthStore()
const i18nStore = useI18nStore()

/** 验证码登录用户无需修改密码 */
const canChangePassword = computed(() => auth.loginMode !== 'code')

/** 系统语言：开=English 关=中文 */
const langOn = computed(() => i18nStore.locale === 'en-US')

/** 缓存大小（M） */
const cacheSize = ref(0)
function refreshCacheSize() {
  cacheSize.value = measureCacheSizeMb()
}
onMounted(() => {
  ensureCacheSeed()
  refreshCacheSize()
})

function toggleLang(v: boolean) {
  i18nStore.applyLocale(v ? 'en-US' : 'zh-CN')
}

async function onClearCache() {
  try {
    await showConfirmDialog({ message: t('user.settings.clearCacheConfirm') })
  } catch {
    return // 取消
  }
  clearNonAuthCache()
  refreshCacheSize()
  showToast(t('user.settings.cacheCleared'))
}

function go(path: string) {
  router.push(path)
}

/** 退出登录（从「我的」页迁移至设置页） */
async function onLogout() {
  try {
    await showConfirmDialog({ message: t('user.settings.logoutConfirm') })
  } catch {
    return // 取消
  }
  auth.logout()
  router.replace('/')
}

const rows = computed(() => {
  const items: Array<{
    key: string
    label: string
    icon: string
    right?: string
    showArrow?: boolean
    danger?: boolean
    onClick?: () => void
  }> = [
    {
      key: 'account',
      label: t('user.settings.accountInfo'),
      icon: 'contact',
      onClick: () => go('/user/settings/account'),
    },
  ]
  if (canChangePassword.value) {
    items.push({
      key: 'password',
      label: t('user.settings.changePassword'),
      icon: 'lock',
      onClick: () => go('/user/settings/password'),
    })
  }
  items.push(
    {
      key: 'language',
      label: t('user.settings.systemLanguage'),
      icon: 'font-o',
      showArrow: false,
    },
    {
      key: 'feedback',
      label: t('user.settings.feedback'),
      icon: 'chat-o',
      onClick: () => go('/user/settings/feedback'),
    },
    {
      key: 'about',
      label: t('user.settings.about'),
      icon: 'info-o',
      onClick: () => go('/user/settings/about'),
    },
    {
      key: 'version',
      label: t('user.settings.version'),
      icon: 'medal-o',
      right: `v${APP_VERSION}`,
      onClick: () => go('/user/settings/version'),
    },
    {
      key: 'services',
      label: t('user.settings.services'),
      icon: 'shield-o',
      onClick: () => go('/user/settings/services'),
    },
    {
      key: 'cache',
      label: t('user.settings.clearCache'),
      icon: 'delete-o',
      right: `${cacheSize.value.toFixed(2)}${t('user.settings.cacheUnit')}`,
      onClick: onClearCache,
    },
    {
      key: 'cancel',
      label: t('user.settings.cancelAccount'),
      icon: 'warning-o',
      danger: true,
      onClick: () => go('/user/settings/cancel'),
    },
  )
  return items
})
</script>

<template>
  <div class="settings-page">
    <SettingList :items="rows">
      <template #right-language>
        <span class="lang-label">{{ langOn ? 'English' : '中文' }}</span>
        <van-switch
          :model-value="langOn"
          size="20px"
          active-color="#ff6b00"
          inactive-color="#e3d8bd"
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
  background: #fbf3e3;

  .lang-label {
    margin-right: 6px;
    font-size: 13px;
    color: #8a7a5a;
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
  color: #c4b48c;
}
</style>

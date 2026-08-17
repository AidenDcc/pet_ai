<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showConfirmDialog } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { useI18nStore } from '@/stores/i18n'
import { getDoctorMeApi } from '@/api/modules/consultation'
import { APP_VERSION } from '@/utils/consts'
import type { VetInfo } from '@/types'
import type { AppLocale } from '@/locales'
import personalAvatar from '@/asset/image/个人头像.png'

const router = useRouter()
const auth = useAuthStore()
const { t } = useI18n()
const i18nStore = useI18nStore()

const vet = ref<VetInfo | null>(null)

async function load() {
  try {
    vet.value = await getDoctorMeApi()
  } catch {
    // 忽略档案加载失败，回退到登录态里的基本信息
  }
}
load()

/** 头像 / 姓名：优先医生档案，回退登录态用户 */
const displayName = () => vet.value?.name ?? auth.user?.name ?? t('role.doctor')
const displayAvatar = () => vet.value?.avatar ?? auth.user?.avatar ?? personalAvatar

const STATS = [
  { labelKey: 'doctor.me.consultCount', value: () => vet.value?.consultCount ?? 0 },
  { labelKey: 'doctor.me.rating', value: () => `${vet.value?.rating ?? 0}%` },
  { labelKey: 'doctor.me.monthlyAnswers', value: () => vet.value?.monthlyAnswers ?? 0 },
  { labelKey: 'doctor.me.monthlyPrescriptions', value: () => vet.value?.monthlyPrescriptions ?? 0 },
]

/* ---------- 语言切换 ---------- */
const showLangSheet = ref(false)
const langOptions = [
  { name: t('admin.i18n.zh'), value: 'zh-CN' as AppLocale },
  { name: t('admin.i18n.en'), value: 'en-US' as AppLocale },
]
const currentLangLabel = () => (i18nStore.locale === 'zh-CN' ? t('admin.i18n.zh') : t('admin.i18n.en'))

function onLangSelect(action: { value: AppLocale } | undefined) {
  if (action) i18nStore.applyLocale(action.value)
  showLangSheet.value = false
}

/* ---------- 退出登录 ---------- */
function onLogout() {
  showConfirmDialog({
    title: t('doctor.me.logout'),
    message: t('doctor.me.logoutConfirm'),
    confirmButtonColor: '#00b4a6',
  })
    .then(() => {
      auth.logout()
      router.push('/')
    })
    .catch(() => undefined)
}

function go(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="doctor-me">
    <!-- 顶部青色渐变头部 -->
    <header class="me-header">
      <div class="me-profile">
        <van-image round width="72" height="72" :src="displayAvatar()" class="me-avatar" />
        <div class="me-user">
          <div class="me-name">{{ displayName() }}</div>
          <div v-if="vet" class="me-hospital">{{ vet.hospital }} · {{ vet.title }}</div>
          <div v-if="vet?.specialty" class="me-specialty">{{ t('doctor.me.specialty') }}：{{ vet.specialty }}</div>
        </div>
      </div>
    </header>

    <!-- 数据统计白色圆角卡片 -->
    <section class="me-stats">
      <div v-for="s in STATS" :key="s.labelKey" class="stat">
        <div class="stat-num">{{ s.value() }}</div>
        <div class="stat-label">{{ t(s.labelKey) }}</div>
      </div>
    </section>

    <!-- 列表式功能菜单 -->
    <div class="me-menu">
      <div class="me-menu-item" @click="go('/doctor/change-password')">
        <van-icon name="shield-o" class="me-menu-icon" />
        <span class="me-menu-text">{{ t('doctor.me.changePassword') }}</span>
        <van-icon name="arrow" class="me-menu-arrow" />
      </div>
      <div class="me-menu-item" @click="showLangSheet = true">
        <van-icon name="friends-o" class="me-menu-icon" />
        <span class="me-menu-text">{{ t('doctor.me.language') }}</span>
        <span class="me-menu-value">{{ currentLangLabel() }}</span>
        <van-icon name="arrow" class="me-menu-arrow" />
      </div>
      <div class="me-menu-item" @click="go('/doctor/about')">
        <van-icon name="info-o" class="me-menu-icon" />
        <span class="me-menu-text">{{ t('doctor.me.about') }}</span>
        <van-icon name="arrow" class="me-menu-arrow" />
      </div>
      <div class="me-menu-item" @click="go('/doctor/version')">
        <van-icon name="replay" class="me-menu-icon" />
        <span class="me-menu-text">{{ t('doctor.me.version') }}</span>
        <span class="me-menu-value">v{{ APP_VERSION }}</span>
        <van-icon name="arrow" class="me-menu-arrow" />
      </div>
    </div>

    <div class="me-menu me-menu--foot">
      <div class="me-menu-item" @click="onLogout">
        <van-icon name="revoke" class="me-menu-icon" />
        <span class="me-menu-text me-menu-text--danger">{{ t('doctor.me.logout') }}</span>
        <van-icon name="arrow" class="me-menu-arrow" />
      </div>
    </div>

    <div class="me-version">{{ t('brand.name') }} · {{ t('brand.platform') }} · v{{ APP_VERSION }}</div>
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
/* 医生端「我的」：青色渐变头部 + 白色大圆角卡片 */
.doctor-me {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
  padding-bottom: 84px;
  background: #eef7f6;
}

.me-header {
  position: relative;
  background: linear-gradient(165deg, #d6f5f1 0%, #7fdcd4 55%, #3ec6bb 100%);
  border-radius: 0 0 28px 28px;
  padding: 30px 18px 56px;
}

.me-profile {
  display: flex;
  align-items: center;
  gap: 15px;

  .me-avatar {
    flex-shrink: 0;
    border: 3px solid #fff;
    background: #e8f5e9;
  }

  .me-user {
    flex: 1;
    min-width: 0;

    .me-name {
      font-size: 21px;
      font-weight: 800;
      color: #14403c;
    }

    .me-hospital {
      margin-top: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #1d6a63;
    }

    .me-specialty {
      margin-top: 3px;
      font-size: 12px;
      color: #2c7c75;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.me-stats {
  position: relative;
  z-index: 1;
  display: flex;
  margin: -32px 14px 0;
  background: #fff;
  border-radius: 20px;
  padding: 16px 0;

  .stat {
    flex: 1;
    text-align: center;

    & + .stat {
      border-left: 1px solid #e6f2f0;
    }
  }

  .stat-num {
    font-size: 20px;
    font-weight: 800;
    color: #14403c;
  }

  .stat-label {
    margin-top: 4px;
    font-size: 12px;
    color: #5e8580;
  }
}

.me-menu {
  background: #fff;
  border-radius: 20px;
  margin: 14px 14px 0;
  overflow: hidden;

  .me-menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px 16px;
    cursor: pointer;

    & + .me-menu-item {
      border-top: 1px solid #f0f6f5;
    }
  }

  .me-menu-icon {
    font-size: 20px;
    color: #00b4a6;
  }

  .me-menu-text {
    flex: 1;
    font-size: 15px;
    color: #1f2d3d;

    &--danger {
      color: #ff4d4f;
    }
  }

  .me-menu-value {
    font-size: 13px;
    color: #8a9aa8;
  }

  .me-menu-arrow {
    color: #c0c4cc;
    font-size: 14px;
  }
}

.me-menu--foot {
  .me-menu-icon {
    color: #ff4d4f;
  }
}

.me-version {
  margin-top: 16px;
  text-align: center;
  font-size: 11px;
  color: #a0b8b4;
}
</style>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useI18nStore } from '@/stores/i18n'
import { LOGIN_PATH } from '@/utils/consts'
import type { AppLocale } from '@/locales'
import type { Role } from '@/types'
import logoUrl from '@/asset/image/logo-rectangle.png'

const router = useRouter()
const auth = useAuthStore()
const { t } = useI18n()
const i18nStore = useI18nStore()

/** 中英文切换按钮选项（标签始终显示「中 / EN」，不随当前语言变化） */
const langOptions: { label: string; value: AppLocale }[] = [
  { label: '中', value: 'zh-CN' },
  { label: 'EN', value: 'en-US' },
]

/** 三端入口卡片配置（标题/描述文案来自 portal.cards.<role> 词条） */
const cards: {
  role: Role
  icon: 'phone' | 'mini' | 'grid'
}[] = [
  { role: 'user', icon: 'phone' },
  { role: 'doctor', icon: 'mini' },
  { role: 'admin', icon: 'grid' },
]

const currentYear = new Date().getFullYear()

/** 进入对应端：跳转该端登录页；切换身份时先清理旧会话 */
function enter(role: Role) {
  if (auth.token && auth.role && auth.role !== role) {
    auth.logout()
  }
  router.push(LOGIN_PATH[role])
}
</script>

<template>
  <div class="portal">
    <!-- 顶部导航栏 -->
    <header class="portal-nav">
      <div class="nav-inner">
        <div class="nav-logo">
          <img class="logo-img" :src="logoUrl" :alt="t('portal.logoText')" />
          <span class="logo-text">{{ t('portal.logoText') }}</span>
        </div>
        <div class="nav-right">
          <div class="nav-title">{{ t('portal.navTitle') }}</div>
          <div class="lang-switch" role="group" aria-label="Language">
            <button
              v-for="opt in langOptions"
              :key="opt.value"
              class="lang-item"
              :class="{ active: i18nStore.locale === opt.value }"
              @click="i18nStore.applyLocale(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- 页面中部 -->
    <main class="portal-main">
      <div class="portal-hero">
        <h1 class="main-title">{{ t('portal.mainTitle') }}</h1>
        <p class="sub-title">{{ t('portal.subTitle') }}</p>
      </div>

      <div class="portal-cards">
        <div
          v-for="card in cards"
          :key="card.role"
          class="portal-card"
          role="button"
          tabindex="0"
          @click="enter(card.role)"
          @keyup.enter="enter(card.role)"
        >
          <div class="card-icon">
            <!-- 手机简约线条图标 -->
            <svg
              v-if="card.icon === 'phone'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
              <path d="M10.5 18.5h3" />
              <path d="M10 5.5h4" />
            </svg>
            <!-- 微信小程序方形图标 -->
            <svg
              v-else-if="card.icon === 'mini'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <circle cx="9.2" cy="9.2" r="1.7" fill="currentColor" stroke="none" />
              <circle cx="14.8" cy="14.8" r="1.7" fill="currentColor" stroke="none" />
            </svg>
            <!-- 后台管理九宫格图标 -->
            <svg
              v-else
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="none"
              stroke-width="1.7"
              stroke-linecap="round"
            >
              <circle cx="5" cy="5" r="1.5" />
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="19" cy="5" r="1.5" />
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
              <circle cx="5" cy="19" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
              <circle cx="19" cy="19" r="1.5" />
            </svg>
          </div>
          <h2 class="card-title">{{ t(`portal.cards.${card.role}.title`) }}</h2>
          <p class="card-desc">{{ t(`portal.cards.${card.role}.desc`) }}</p>
          <span class="card-link">{{ t('portal.enter') }} →</span>
        </div>
      </div>
    </main>

    <!-- 页脚版权 -->
    <footer class="portal-footer">{{ t('portal.footer', { year: currentYear }) }}</footer>
  </div>
</template>

<style scoped lang="scss">
.portal {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fcf7ef;
  color: #1f2d3d;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue',
    'Microsoft YaHei', sans-serif;
}

/* ---------- 顶部导航栏 ---------- */
.portal-nav {
  flex-shrink: 0;
  background: #fff;
  box-shadow: 0 1px 8px rgba(31, 45, 61, 0.05);
}
.nav-inner {
  max-width: 1200px;
  height: 68px;
  margin: 0 auto;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nav-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  .logo-img {
    height: 34px;
    width: auto;
    display: block;
  }
  .logo-text {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
}
.nav-title {
  font-size: 13px;
  color: #8a94a3;
}
.nav-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

/* 中英文切换按钮：胶囊分段控件，选中项为活力橙 */
.lang-switch {
  display: flex;
  align-items: center;
  padding: 2px;
  background: #f3ede2;
  border-radius: 999px;
  .lang-item {
    padding: 4px 13px;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.5;
    color: #8a94a3;
    border-radius: 999px;
    cursor: pointer;
    transition: color 0.2s ease, background 0.2s ease;
    &:hover {
      color: #ff7d29;
    }
    &.active {
      color: #fff;
      background: #ff7d29;
      &:hover {
        color: #fff;
      }
    }
  }
}

/* ---------- 页面中部 ---------- */
.portal-main {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 72px 32px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.portal-hero {
  margin-bottom: 60px;
  text-align: center;
  .main-title {
    font-size: 40px;
    font-weight: 800;
    letter-spacing: 2px;
    color: #1f2d3d;
  }
  .sub-title {
    margin-top: 14px;
    font-size: 15px;
    letter-spacing: 1px;
    color: #9aa3b2;
  }
}

/* ---------- 三端功能卡片 ---------- */
.portal-cards {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}
.portal-card {
  background: #fff;
  border-radius: 18px;
  padding: 36px 30px 30px;
  box-shadow: 0 12px 32px rgba(31, 45, 61, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 18px 42px rgba(255, 125, 41, 0.18);
  }

  .card-icon {
    width: 72px;
    height: 72px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 125, 41, 0.1);
    color: #ff7d29;
    svg {
      width: 38px;
      height: 38px;
    }
  }
  .card-title {
    margin-top: 20px;
    font-size: 22px;
    font-weight: 700;
    color: #1f2d3d;
  }
  .card-desc {
    flex: 1;
    margin-top: 12px;
    font-size: 14px;
    line-height: 1.8;
    color: #7a8599;
  }
  .card-link {
    margin-top: 24px;
    font-size: 15px;
    font-weight: 600;
    color: #ff7d29;
    cursor: pointer;
    transition: letter-spacing 0.2s ease;
    &:hover {
      letter-spacing: 1px;
    }
  }
}

/* ---------- 页脚版权 ---------- */
.portal-footer {
  flex-shrink: 0;
  padding: 24px 0 28px;
  text-align: center;
  font-size: 12px;
  color: #a6aebd;
}

/* ---------- 响应式 ---------- */
@media (max-width: 900px) {
  .portal-cards {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .portal-main {
    padding: 44px 20px 32px;
  }
  .portal-hero {
    margin-bottom: 40px;
    .main-title {
      font-size: 28px;
      letter-spacing: 1px;
    }
  }
  .nav-inner {
    padding: 0 20px;
  }
  .nav-title {
    display: none;
  }
}
</style>

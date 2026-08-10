<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useI18nStore } from '@/stores/i18n'
import { ROLE_LABEL } from '@/utils/consts'
import type { AppLocale } from '@/locales'
import type { Role } from '@/types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { t } = useI18n()
const i18nStore = useI18nStore()

const MENUS: Record<string, { path: string; titleKey: string; icon: string }[]> = {
  admin: [
    { path: '/admin/dashboard', titleKey: 'nav.admin.dashboard', icon: 'TrendCharts' },
    { path: '/admin/bi', titleKey: 'nav.admin.bi', icon: 'DataAnalysis' },
    { path: '/admin/i18n', titleKey: 'nav.admin.i18n', icon: 'Connection' },
    { path: '/admin/devices', titleKey: 'nav.admin.devices', icon: 'Monitor' },
    { path: '/admin/users', titleKey: 'nav.admin.users', icon: 'User' },
    { path: '/admin/pets', titleKey: 'nav.admin.pets', icon: 'Coin' },
    { path: '/admin/vets', titleKey: 'nav.admin.vets', icon: 'FirstAidKit' },
    { path: '/admin/orders', titleKey: 'nav.admin.orders', icon: 'List' },
    { path: '/admin/subscriptions', titleKey: 'nav.admin.subscriptions', icon: 'CreditCard' },
  ],
  user: [],
}

const menus = computed(() => MENUS[auth.role] ?? [])
const roleLabel = computed(() => (auth.role ? t(ROLE_LABEL[auth.role as Role]) : ''))
const pageTitle = computed(() => (route.meta.titleKey ? t(route.meta.titleKey as string) : ''))

function onCommand(command: string) {
  if (command === 'switch') {
    auth.logout()
    router.push('/login')
  } else if (command === 'logout') {
    auth.logout()
    router.push('/login')
  }
}
</script>

<template>
  <el-config-provider :locale="i18nStore.elLocale">
    <el-container class="admin-layout">
      <el-aside width="224px" class="admin-aside">
        <div class="admin-logo">
          <span class="logo-dot">🐾</span>
          <div>
            <div class="logo-title">{{ t('brand.name') }}</div>
            <div class="logo-sub">{{ t('brand.platform') }}</div>
          </div>
        </div>
        <el-menu class="admin-menu" :default-active="route.path" router>
          <el-menu-item v-for="m in menus" :key="m.path" :index="m.path">
            <el-icon><component :is="m.icon" /></el-icon>
            <span>{{ t(m.titleKey) }}</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-container class="admin-body">
        <el-header class="admin-header">
          <div class="header-title">{{ pageTitle }}</div>
          <div class="header-right">
            <el-dropdown @command="(cmd: string) => i18nStore.applyLocale(cmd as AppLocale)">
              <span class="lang-chip">
                <el-icon><Earth /></el-icon>
                <span>{{ i18nStore.locale === 'zh-CN' ? t('admin.i18n.zh') : t('admin.i18n.en') }}</span>
                <el-icon><arrow-down /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="zh-CN">{{ t('admin.i18n.zh') }}</el-dropdown-item>
                  <el-dropdown-item command="en-US">{{ t('admin.i18n.en') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-tag size="small" type="primary" effect="light">{{ roleLabel }}</el-tag>
            <el-dropdown @command="onCommand">
              <span class="user-chip">
                <el-avatar :size="30" :src="auth.user?.avatar">
                  {{ auth.user?.name?.slice(0, 1) }}
                </el-avatar>
                <span class="user-name">{{ auth.user?.name }}</span>
                <el-icon><arrow-down /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="switch">{{ t('common.switchRole') }}</el-dropdown-item>
                  <el-dropdown-item command="logout" divided>{{ t('common.logout') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>
        <el-main class="admin-main">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </el-config-provider>
</template>

<style scoped lang="scss">
.admin-layout {
  height: 100vh;
}

.admin-aside {
  background: #0f1b2d;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.admin-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px;
  color: #fff;
  .logo-dot {
    font-size: 26px;
  }
  .logo-title {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  .logo-sub {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 2px;
  }
}

.admin-menu {
  flex: 1;
  border-right: none;
  background: transparent;
  --el-menu-bg-color: transparent;
  --el-menu-text-color: rgba(255, 255, 255, 0.65);
  --el-menu-hover-bg-color: rgba(0, 180, 166, 0.14);
  --el-menu-active-color: #00b4a6;
  --el-menu-item-height: 48px;
  .el-menu-item {
    margin: 2px 10px;
    border-radius: 8px;
    &.is-active {
      background: rgba(0, 180, 166, 0.18);
    }
  }
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid var(--sp-border);
  height: 60px;
  .header-title {
    font-size: 17px;
    font-weight: 600;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.lang-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  outline: none;
  font-size: 13px;
  color: var(--sp-text);
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  outline: none;
  .user-name {
    font-size: 14px;
    color: var(--sp-text);
  }
}

.admin-main {
  background: var(--sp-bg);
  padding: 20px;
  overflow-y: auto;
}
</style>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { getMySubscriptionApi } from '@/api/modules/order'
import { ROLE_LABEL } from '@/utils/consts'
import { formatDate } from '@/utils/format'

const router = useRouter()
const auth = useAuthStore()
const { t } = useI18n()

const subscription = ref<{ plan: { name: string; color: string } | null; expireAt: string | null } | null>(null)

async function load() {
  try {
    subscription.value = await getMySubscriptionApi()
  } catch {
    // 忽略订阅加载失败
  }
}

function switchRole() {
  auth.logout()
  router.push('/login')
}

load()
</script>

<template>
  <div class="me">
    <!-- 用户信息 -->
    <div class="user-card sp-card">
      <img class="user-avatar" :src="auth.user?.avatar" :alt="auth.user?.name" />
      <div class="user-info">
        <div class="user-name">{{ auth.user?.name }}</div>
        <div class="user-phone">{{ auth.user?.phone }}</div>
        <van-tag round type="primary" class="mt-8">{{ t(ROLE_LABEL.user) }}</van-tag>
      </div>
    </div>

    <!-- 当前订阅 -->
    <div v-if="subscription" class="plan-card sp-card mt-16" :style="{ borderColor: subscription.plan?.color }">
      <div class="plan-badge" :style="{ background: subscription.plan?.color }">
        {{ subscription.plan?.name }}
      </div>
      <div class="plan-info">
        <div class="plan-title">{{ t('user.me.currentPlan') }} · {{ subscription.plan?.name ?? t('user.me.noPlan') }}</div>
        <div class="plan-sub">{{ t('user.me.expiresAt') }} {{ subscription.expireAt ? formatDate(subscription.expireAt) : '-' }}</div>
      </div>
      <van-button size="small" round type="primary" @click="router.push('/user/subscription')">{{ t('common.manage') }}</van-button>
    </div>

    <!-- 功能菜单 -->
    <div class="menu sp-card mt-16">
      <van-cell :title="`🐾 ${t('user.me.myPets')}`" is-link @click="router.push('/user/pets')" />
      <van-cell :title="`⚡ ${t('user.me.dataSync')}`" is-link @click="router.push('/user/sync')" />
      <van-cell :title="`🎙️ ${t('user.me.voiceAssistant')}`" is-link @click="router.push('/user/assistant')" />
      <van-cell :title="`📟 ${t('user.me.devices')}`" is-link @click="router.push('/user/devices')" />
      <van-cell :title="`📋 ${t('user.me.reports')}`" is-link @click="router.push('/user/reports')" />
      <van-cell :title="`💳 ${t('user.me.subscription')}`" is-link @click="router.push('/user/subscription')" />
    </div>

    <div class="menu sp-card mt-16">
      <van-cell :title="`🔄 ${t('user.me.switchRole')}`" is-link @click="switchRole" />
      <van-cell :title="`ℹ️ ${t('user.me.about')} · ShuxinPet`" value="v0.1.0" />
    </div>

    <div class="logout-btn sp-card mt-16" @click="switchRole">{{ t('user.me.logout') }}</div>

    <div class="footer">{{ t('brand.name') }} · {{ t('brand.platform') }}</div>
  </div>
</template>

<style scoped lang="scss">
.me {
  padding: 16px 14px;
}
.user-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 16px;
  .user-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 2px solid var(--sp-primary-light);
  }
  .user-name {
    font-size: 18px;
    font-weight: 700;
  }
  .user-phone {
    margin-top: 4px;
    font-size: 13px;
    color: var(--sp-text-secondary);
  }
}
.plan-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 2px solid var(--sp-border);
  .plan-badge {
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    padding: 8px 12px;
    border-radius: 10px;
  }
  .plan-info {
    flex: 1;
    .plan-title {
      font-size: 14px;
      font-weight: 600;
    }
    .plan-sub {
      margin-top: 4px;
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
  }
}
.menu {
  overflow: hidden;
}
.logout-btn {
  text-align: center;
  padding: 14px;
  color: var(--sp-danger);
  font-weight: 600;
}
.footer {
  margin-top: 24px;
  text-align: center;
  font-size: 12px;
  color: var(--sp-text-placeholder);
}
</style>

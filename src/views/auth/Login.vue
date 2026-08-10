<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { DEMO_ACCOUNTS } from '@/utils/consts'
import PhoneShell from '@/components/PhoneShell.vue'
import type { Role } from '@/types'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { t } = useI18n()

const account = ref('user')
const password = ref('123456')
const activeRole = ref<Role>('user')
const loading = ref(false)
const showPwd = ref(false)
const pwdType = computed(() => (showPwd.value ? 'text' : 'password'))

function fillDemo(demo: (typeof DEMO_ACCOUNTS)[number]) {
  activeRole.value = demo.role
  account.value = demo.account
  password.value = demo.password
}

async function onSubmit() {
  if (!account.value || !password.value) {
    showToast(t('login.required'))
    return
  }
  loading.value = true
  try {
    await auth.login(account.value.trim(), password.value)
    showToast(t('login.success'))
    const redirect = (route.query.redirect as string) || auth.homePath()
    router.push(redirect)
  } catch (e) {
    showToast((e as Error).message || t('login.failed'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <PhoneShell>
    <div class="login-app">
      <!-- 顶部品牌区 -->
      <div class="login-hero">
        <div class="hero-circle hero-circle-a"></div>
        <div class="hero-circle hero-circle-b"></div>
        <div class="hero-logo">🐾</div>
        <div class="hero-name">{{ t('brand.name') }}</div>
        <div class="hero-slogan">{{ t('brand.platform') }}</div>
        <div class="hero-tagline">{{ t('brand.slogan') }}</div>
      </div>

      <!-- 表单区 -->
      <div class="login-panel">
        <div class="panel-form">
          <van-field
            v-model="account"
            class="login-field"
            left-icon="contact-o"
            :placeholder="t('login.accountPlaceholder')"
            clearable
          />
          <van-field
            v-model="password"
            class="login-field"
            :type="pwdType"
            left-icon="lock"
            :placeholder="t('login.passwordPlaceholder')"
            :right-icon="showPwd ? 'eye-o' : 'closed-eye'"
            @click-right-icon="showPwd = !showPwd"
            @keyup.enter="onSubmit"
          />
          <van-button
            block
            round
            type="primary"
            size="large"
            class="login-btn"
            :loading="loading"
            @click="onSubmit"
          >
            {{ t('login.loginBtn') }}
          </van-button>
          <div class="login-tip">{{ t('login.tip') }}</div>
        </div>

        <div class="panel-demo">
          <div
            v-for="demo in DEMO_ACCOUNTS"
            :key="demo.role"
            class="demo-item"
            :class="{ active: activeRole === demo.role }"
            @click="fillDemo(demo)"
          >
            <span class="demo-emoji">{{ demo.emoji }}</span>
            <div class="demo-info">
              <div class="demo-label">{{ t(demo.labelKey) }}</div>
              <div class="demo-desc">{{ t(demo.descKey) }}</div>
            </div>
            <van-tag round plain type="primary">{{ t('login.oneClick') }}</van-tag>
          </div>
        </div>
      </div>
    </div>
  </PhoneShell>
</template>

<style scoped lang="scss">
.login-app {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* ---------- 顶部品牌区 ---------- */
.login-hero {
  position: relative;
  flex-shrink: 0;
  padding: 40px 24px 64px;
  text-align: center;
  color: #fff;
  background: linear-gradient(165deg, #ff6b00 0%, #ff9440 55%, #ffb380 100%);
  overflow: hidden;
  .hero-circle {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    &.hero-circle-a {
      width: 180px;
      height: 180px;
      top: -60px;
      right: -50px;
    }
    &.hero-circle-b {
      width: 120px;
      height: 120px;
      bottom: -40px;
      left: -30px;
    }
  }
  .hero-logo {
    position: relative;
    width: 76px;
    height: 76px;
    margin: 0 auto 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    background: rgba(255, 255, 255, 0.22);
    border: 2px solid rgba(255, 255, 255, 0.55);
    border-radius: 22px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  }
  .hero-name {
    position: relative;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: 1px;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }
  .hero-slogan {
    position: relative;
    margin-top: 6px;
    font-size: 14px;
    opacity: 0.95;
  }
  .hero-tagline {
    position: relative;
    margin-top: 4px;
    font-size: 12px;
    opacity: 0.8;
  }
}

/* ---------- 表单区 ---------- */
.login-panel {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  margin-top: -20px;
  padding: 22px 20px 20px;
  background: #fff;
  border-radius: 26px 26px 0 0;
  display: flex;
  flex-direction: column;
}

.panel-form {
  .login-field {
    padding: 14px 12px;
    border-radius: 14px;
    background: #f5f7fa;
    margin-bottom: 12px;
    :deep(.van-field__left-icon .van-icon) {
      color: var(--sp-primary);
    }
  }
  .login-btn {
    margin-top: 6px;
    font-weight: 700;
    letter-spacing: 6px;
  }
  .login-tip {
    margin-top: 12px;
    text-align: center;
    font-size: 11px;
    color: var(--sp-text-placeholder);
  }
}

.panel-demo {
  margin-top: 18px;
  .demo-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    margin-bottom: 10px;
    border: 1.5px solid var(--sp-border);
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s;
    &.active {
      border-color: var(--sp-primary);
      background: rgba(255, 107, 0, 0.06);
    }
    .demo-emoji {
      font-size: 22px;
    }
    .demo-info {
      flex: 1;
      min-width: 0;
      .demo-label {
        font-size: 14px;
        font-weight: 600;
      }
      .demo-desc {
        margin-top: 2px;
        font-size: 12px;
        color: var(--sp-text-secondary);
      }
    }
  }
}
</style>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useLoginForm } from '@/composables/useLoginForm'
import PhoneShell from '@/components/PhoneShell.vue'

const { t } = useI18n()

const form = useLoginForm({
  role: 'doctor',
  modes: ['pwd'],
  defaultContactType: 'email',
  showAgreement: false,
})

const { account, password, showPwd, pwdType, loading, demoAccounts, submitPwd, fillDemo } = form
</script>

<template>
  <PhoneShell>
  <div class="doctor-login">
    <div class="card">
      <!-- 品牌区 -->
      <div class="brand">
        <div class="brand-badge">🩺</div>
        <div class="brand-name">{{ t('brand.name') }}</div>
        <h1 class="title">{{ t('login.doctor.welcome') }}</h1>
        <p class="subtitle">{{ t('login.doctor.subtitle') }}</p>
      </div>

      <!-- 表单 -->
      <van-field
        v-model="account"
        class="field"
        label-position="top"
        label-align="left"
        :label="t('login.account')"
        :placeholder="t('login.doctor.accountPlaceholder')"
        left-icon="contact"
        clearable
        @keyup.enter="submitPwd"
      />
      <van-field
        v-model="password"
        class="field"
        label-position="top"
        label-align="left"
        :label="t('login.password')"
        :type="pwdType"
        :placeholder="t('login.passwordPlaceholder')"
        left-icon="lock"
        :right-icon="showPwd ? 'eye-o' : 'closed-eye'"
        @click-right-icon="showPwd = !showPwd"
        @keyup.enter="submitPwd"
      />

      <p class="license-hint">{{ t('login.doctor.licenseHint') }}</p>

      <van-button block round type="primary" class="cta" :loading="loading" @click="submitPwd">
        {{ t('login.loginBtn') }}
      </van-button>

      <!-- 辅助提示 -->
      <p class="admin-hint">{{ t('login.doctor.adminContact') }}</p>

      <!-- 演示账号（仅医生） -->
      <template v-if="demoAccounts.length">
        <div class="demo-divider"><span>{{ t('login.demoSection') }}</span></div>
        <div
          v-for="demo in demoAccounts"
          :key="demo.role"
          class="demo-item"
          @click="fillDemo(demo)"
        >
          <span class="demo-emoji">{{ demo.emoji }}</span>
          <div class="demo-info">
            <div class="demo-label">{{ t(demo.labelKey) }}</div>
            <div class="demo-desc">{{ t(demo.descKey) }}</div>
          </div>
          <van-tag round plain type="primary">{{ t('login.oneClick') }}</van-tag>
        </div>
      </template>
    </div>
  </div>
  </PhoneShell>
</template>

<style scoped lang="scss">
.doctor-login {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 24px 16px;
  background: var(--sp-bg);
}

.card {
  margin: auto;
  width: 100%;
  max-width: 400px;
  padding: 32px 28px;
  background: var(--sp-card);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(31, 45, 61, 0.1);
}

.brand {
  text-align: center;
  margin-bottom: 24px;
  .brand-badge {
    width: 60px;
    height: 60px;
    margin: 0 auto 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    background: rgba(0, 180, 166, 0.1);
    border-radius: 50%;
  }
  .brand-name {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: var(--sp-primary);
  }
  .title {
    margin-top: 14px;
    font-size: 24px;
    font-weight: 700;
    color: var(--sp-text);
  }
  .subtitle {
    margin-top: 6px;
    font-size: 14px;
    color: var(--sp-text-secondary);
  }
}

.field {
  margin-bottom: 14px;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid var(--sp-border);
  border-radius: 12px;
  :deep(.van-field__label) {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: var(--sp-text-secondary);
  }
  :deep(.van-field__left-icon .van-icon) {
    color: var(--sp-primary);
  }
  :deep(.van-field__control) {
    font-size: 16px;
    color: var(--sp-text);
  }
  :deep(.van-field__control::placeholder) {
    color: var(--sp-text-placeholder);
  }
}

.license-hint {
  margin: -2px 2px 16px;
  font-size: 12px;
  color: var(--sp-text-placeholder);
}

.cta {
  font-weight: 700;
  letter-spacing: 2px;
}

.admin-hint {
  margin-top: 18px;
  text-align: center;
  font-size: 13px;
  color: var(--sp-text-secondary);
}

.demo-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 22px 0 14px;
  font-size: 12px;
  color: var(--sp-text-placeholder);
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--sp-border);
  }
}

.demo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1.5px solid var(--sp-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  &:active {
    border-color: var(--sp-primary);
    background: rgba(0, 180, 166, 0.06);
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
</style>

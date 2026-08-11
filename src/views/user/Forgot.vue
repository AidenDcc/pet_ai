<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAuthAccountForm } from '@/composables/useAuthAccountForm'
import PhoneShell from '@/components/PhoneShell.vue'

const { t } = useI18n()

const form = useAuthAccountForm({ role: 'user', scene: 'reset' })

const {
  contactType,
  areaCode,
  phone,
  email,
  code,
  password,
  confirmPwd,
  showPwd,
  showConfirmPwd,
  pwdType,
  confirmPwdType,
  submitting,
  codeSending,
  showArea,
  codeSeconds,
  areaActions,
  onAreaSelect,
  sendCode,
  onSubmit,
  titleKey,
  subtitleKey,
  toLogin,
} = form
</script>

<template>
  <PhoneShell>
    <div class="auth-page">
      <!-- 品牌区 -->
      <header class="auth-header">
        <div class="brand-logo">🔑</div>
        <div class="brand-name">{{ t('brand.name') }}</div>
        <h1 class="title">{{ t(titleKey) }}</h1>
        <p class="subtitle">{{ t(subtitleKey) }}</p>
      </header>

      <!-- 表单卡片 -->
      <main class="auth-card">
        <!-- 联系方式切换 -->
        <div class="mode-switch">
          <button type="button" class="mode-item" :class="{ active: contactType === 'phone' }" @click="contactType = 'phone'">
            {{ t('forgot.tabPhone') }}
          </button>
          <button type="button" class="mode-item" :class="{ active: contactType === 'email' }" @click="contactType = 'email'">
            {{ t('forgot.tabEmail') }}
          </button>
        </div>

        <!-- 手机号 / 邮箱 -->
        <van-field
          v-if="contactType === 'phone'"
          v-model="phone"
          class="field"
          :placeholder="t('forgot.phonePlaceholder')"
          clearable
        >
          <template #label>
            <div class="area-code" @click="showArea = true">
              <span>{{ areaCode }}</span>
              <van-icon name="arrow-down" />
            </div>
          </template>
        </van-field>
        <van-field
          v-else
          v-model="email"
          class="field"
          :placeholder="t('forgot.emailPlaceholder')"
          clearable
        />

        <!-- 验证码 -->
        <van-field
          v-model="code"
          class="field"
          :placeholder="t('forgot.codePlaceholder')"
          maxlength="6"
          clearable
        >
          <template #button>
            <van-button size="small" class="code-btn" :disabled="codeSeconds > 0 || codeSending" @click="sendCode">
              {{ codeSeconds > 0 ? t('forgot.resendAfter', { n: codeSeconds }) : t('forgot.getCode') }}
            </van-button>
          </template>
        </van-field>

        <!-- 新密码 + 确认新密码 -->
        <van-field
          v-model="password"
          class="field"
          :type="pwdType"
          :placeholder="t('forgot.newPasswordPlaceholder')"
          :right-icon="showPwd ? 'eye-o' : 'closed-eye'"
          @click-right-icon="showPwd = !showPwd"
        />
        <van-field
          v-model="confirmPwd"
          class="field"
          :type="confirmPwdType"
          :placeholder="t('forgot.confirmPlaceholder')"
          :right-icon="showConfirmPwd ? 'eye-o' : 'closed-eye'"
          @click-right-icon="showConfirmPwd = !showConfirmPwd"
          @keyup.enter="onSubmit"
        />

        <van-button block round type="primary" size="large" class="cta" :loading="submitting" @click="onSubmit">
          {{ t('forgot.submit') }}
        </van-button>

        <router-link :to="toLogin" class="to-login">{{ t('forgot.toLogin') }}</router-link>
      </main>

      <!-- 国际区号选择 -->
      <van-action-sheet
        v-model:show="showArea"
        :actions="areaActions"
        :cancel-text="t('common.cancel')"
        close-on-click-action
        @select="onAreaSelect"
      />
    </div>
  </PhoneShell>
</template>

<style scoped lang="scss">
.auth-page {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: #f7f8fa;
  padding: 28px 20px 40px;
}

.auth-header {
  flex-shrink: 0;
  text-align: center;
  padding: 8px 0 24px;
  .brand-logo {
    width: 56px;
    height: 56px;
    margin: 0 auto 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 6px 20px rgba(31, 45, 61, 0.08);
  }
  .brand-name {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: var(--sp-text-secondary);
  }
  .title {
    margin-top: 16px;
    font-size: 26px;
    font-weight: 700;
    color: var(--sp-text);
    letter-spacing: -0.3px;
  }
  .subtitle {
    margin-top: 6px;
    font-size: 14px;
    color: var(--sp-text-secondary);
  }
}

.auth-card {
  flex-shrink: 0;
  background: #fff;
  border: 1px solid var(--sp-border);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 16px rgba(31, 45, 61, 0.04);
}

.mode-switch {
  display: flex;
  align-items: center;
  padding: 3px;
  margin-bottom: 16px;
  background: #f5f7fa;
  border-radius: 10px;
  .mode-item {
    flex: 1;
    padding: 8px 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--sp-text-secondary);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    &.active {
      color: #fff;
      background: var(--sp-primary);
      box-shadow: 0 2px 8px rgba(255, 107, 0, 0.24);
    }
  }
}

.field {
  padding: 12px 14px;
  background: #fff;
  border: 1px solid var(--sp-border);
  border-radius: 12px;
  margin-bottom: 12px;
  :deep(.van-field__control) {
    font-size: 16px;
    color: var(--sp-text);
  }
  :deep(.van-field__control::placeholder) {
    color: var(--sp-text-placeholder);
  }
  .area-code {
    display: flex;
    align-items: center;
    gap: 3px;
    padding-right: 8px;
    margin-right: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--sp-text);
    border-right: 1px solid var(--sp-border);
    cursor: pointer;
    .van-icon {
      font-size: 10px;
      color: var(--sp-text-placeholder);
    }
  }
}

.code-btn {
  min-width: 84px;
  border-radius: 999px;
  background: #fff;
  color: var(--sp-primary);
  border: 1px solid var(--sp-primary);
  font-weight: 600;
  &.van-button--disabled {
    border-color: var(--sp-border);
    color: var(--sp-text-placeholder);
  }
}

.cta {
  margin-top: 2px;
  font-weight: 700;
  letter-spacing: 2px;
}

.to-login {
  display: block;
  margin-top: 18px;
  text-align: center;
  font-size: 13px;
  color: var(--sp-primary);
}
</style>

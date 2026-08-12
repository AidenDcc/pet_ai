<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAuthAccountForm } from '@/composables/useAuthAccountForm'
import PhoneShell from '@/components/PhoneShell.vue'

const { t } = useI18n()

const form = useAuthAccountForm({ role: 'doctor', scene: 'reset' })

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
  <div class="doctor-auth">
    <div class="card">
      <div class="brand">
        <div class="brand-badge">🔑</div>
        <div class="brand-name">{{ t('brand.name') }}</div>
        <h1 class="title">{{ t(titleKey) }}</h1>
        <p class="subtitle">{{ t(subtitleKey) }}</p>
      </div>

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

      <van-button block round type="primary" class="cta" :loading="submitting" @click="onSubmit">
        {{ t('forgot.submit') }}
      </van-button>

      <router-link :to="toLogin" class="to-login">{{ t('forgot.toLogin') }}</router-link>

      <!-- 国际区号选择 -->
      <van-action-sheet
        v-model:show="showArea"
        :actions="areaActions"
        :cancel-text="t('common.cancel')"
        close-on-click-action
        @select="onAreaSelect"
      />
    </div>
  </div>
  </PhoneShell>
</template>

<style scoped lang="scss">
.doctor-auth {
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

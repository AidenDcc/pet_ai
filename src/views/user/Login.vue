<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { useLoginForm } from '@/composables/useLoginForm'
import PhoneShell from '@/components/PhoneShell.vue'

const router = useRouter()
const { t } = useI18n()

const form = useLoginForm({
  role: 'user',
  defaultContactType: 'email',
  defaultAreaCode: '+1',
})

const {
  mode,
  modes,
  account,
  password,
  showPwd,
  pwdType,
  contactType,
  areaCode,
  phone,
  email,
  code,
  codeSending,
  showArea,
  codeSeconds,
  agree,
  remember,
  loading,
  demoAccounts,
  areaActions,
  onAreaSelect,
  sendCode,
  submitPwd,
  submitCode,
  fillDemo,
} = form

function onSocial() {
  showToast(t('login.socialComingSoon'))
}
</script>

<template>
  <PhoneShell>
    <div class="login-page">
      <!-- 品牌区：清爽浅色，无大色块 -->
      <header class="login-header">
        <div class="brand-logo">🐾</div>
        <div class="brand-name">{{ t('brand.name') }}</div>
        <h1 class="welcome">{{ t('login.owner.welcome') }}</h1>
        <p class="subtitle">{{ t('login.owner.subtitle') }}</p>
      </header>

      <!-- 表单卡片 -->
      <main class="login-card">
        <!-- 登录方式切换 -->
        <div v-if="modes.length > 1" class="mode-switch" role="tablist">
          <button type="button" class="mode-item" :class="{ active: mode === 'pwd' }" @click="mode = 'pwd'">
            {{ t('login.tabPwd') }}
          </button>
          <button type="button" class="mode-item" :class="{ active: mode === 'code' }" @click="mode = 'code'">
            {{ t('login.tabCode') }}
          </button>
        </div>

        <!-- 密码登录 -->
        <div v-show="mode === 'pwd'" class="pane">
          <van-field
            v-model="account"
            class="field"
            label-align="top"
            :label="t('login.account')"
            :placeholder="t('login.accountPlaceholder')"
            clearable
            @keyup.enter="submitPwd"
          />
          <van-field
            v-model="password"
            class="field"
            label-align="top"
            :label="t('login.password')"
            :type="pwdType"
            :placeholder="t('login.passwordPlaceholder')"
            :right-icon="showPwd ? 'eye-o' : 'closed-eye'"
            @click-right-icon="showPwd = !showPwd"
            @keyup.enter="submitPwd"
          />
        </div>

        <!-- 验证码登录 -->
        <div v-show="mode === 'code'" class="pane">
          <div class="contact-type">
            <button type="button" class="contact-item" :class="{ active: contactType === 'phone' }" @click="contactType = 'phone'">
              {{ t('login.contactPhone') }}
            </button>
            <button type="button" class="contact-item" :class="{ active: contactType === 'email' }" @click="contactType = 'email'">
              {{ t('login.contactEmail') }}
            </button>
          </div>
          <van-field
            v-if="contactType === 'phone'"
            v-model="phone"
            class="field"
            label-align="top"
            :label="t('login.contactPhone')"
            :placeholder="t('register.phonePlaceholder')"
            clearable
          >
            <template #label>
              <div class="field-label-top">
                <span>{{ t('login.contactPhone') }}</span>
                <span class="area-code" @click="showArea = true">
                  {{ areaCode }} <van-icon name="arrow-down" />
                </span>
              </div>
            </template>
          </van-field>
          <van-field
            v-else
            v-model="email"
            class="field"
            label-align="top"
            :label="t('login.contactEmail')"
            :placeholder="t('register.emailPlaceholder')"
            clearable
          />
          <van-field
            v-model="code"
            class="field"
            label-align="top"
            :label="t('login.codePlaceholder')"
            :placeholder="t('login.codePlaceholder')"
            maxlength="6"
            clearable
            @keyup.enter="submitCode"
          >
            <template #button>
              <van-button
                size="small"
                class="code-btn"
                :disabled="codeSeconds > 0 || codeSending"
                @click="sendCode('login')"
              >
                {{ codeSeconds > 0 ? t('login.resendAfter', { n: codeSeconds }) : t('login.getCode') }}
              </van-button>
            </template>
          </van-field>
        </div>

        <!-- 记住我 + 忘记密码 -->
        <div class="row-options">
          <van-checkbox v-model="remember" shape="square" icon-size="15px" class="remember">
            {{ t('login.remember') }}
          </van-checkbox>
          <router-link to="/user/forgot" class="forgot">{{ t('login.forgotPwd') }}</router-link>
        </div>

        <!-- 用户服务协议与隐私政策（默认勾选） -->
        <div class="agree-line">
          <van-checkbox v-model="agree" shape="square" icon-size="15px" class="agree-check">
            <span class="agree-text">
              {{ t('login.agreeText') }}
              <span class="agree-link" @click.stop="router.push('/agreement/service')">{{ t('login.agreeTerms') }}</span>
              {{ t('login.and') }}
              <span class="agree-link" @click.stop="router.push('/agreement/privacy')">{{ t('login.agreePrivacy') }}</span>
            </span>
          </van-checkbox>
        </div>

        <van-button block round type="primary" size="large" class="cta" :loading="loading" @click="mode === 'pwd' ? submitPwd() : submitCode()">
          {{ t('login.loginBtn') }}
        </van-button>

        <!-- 社交登录占位 -->
        <div class="divider"><span>{{ t('login.or') }}</span></div>
        <div class="social">
          <button type="button" class="social-btn" @click="onSocial">
            <svg viewBox="0 0 24 24" class="social-icon" aria-hidden="true">
              <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z" />
              <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.1z" />
              <path fill="#EA4335" d="M12 4.76c1.76 0 3.34.6 4.58 1.79l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.87 8.87 4.76 12 4.76z" />
            </svg>
            {{ t('login.continueGoogle') }}
          </button>
          <button type="button" class="social-btn" @click="onSocial">
            <svg viewBox="0 0 24 24" class="social-icon" aria-hidden="true">
              <path fill="#000000" d="M17.05 12.54c-.03-2.53 2.07-3.74 2.16-3.8-1.18-1.72-3-1.96-3.66-1.99-1.56-.16-3.04.92-3.83.92-.79 0-2.01-.9-3.3-.87-1.7.02-3.26.99-4.14 2.51-1.76 3.06-.45 7.6 1.27 10.09.84 1.22 1.84 2.58 3.15 2.53 1.26-.05 1.74-.82 3.27-.82s1.96.82 3.3.79c1.36-.02 2.22-1.24 3.05-2.46.96-1.41 1.36-2.78 1.38-2.85-.03-.01-2.64-1.01-2.65-4.05zM14.25 4.16c.7-.85 1.17-2.03 1.04-3.2-1.01.04-2.22.67-2.95 1.51-.65.75-1.22 1.95-1.07 3.1 1.13.09 2.28-.57 2.98-1.41z" />
            </svg>
            {{ t('login.continueApple') }}
          </button>
        </div>

        <!-- 注册入口 -->
        <p class="signup">
          {{ t('login.owner.noAccount') }}
          <router-link to="/user/register" class="signup-link">{{ t('login.owner.signUp') }}</router-link>
        </p>

        <!-- 演示账号（仅宠物主） -->
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
.login-page {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: #f7f8fa;
  padding: 28px 20px 40px;
}

/* ---------- 品牌区 ---------- */
.login-header {
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
  .welcome {
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

/* ---------- 表单卡片 ---------- */
.login-card {
  flex-shrink: 0;
  background: #fff;
  border: 1px solid var(--sp-border);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 16px rgba(31, 45, 61, 0.04);
}

/* 登录方式切换 */
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

.pane {
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
    :deep(.van-field__control) {
      font-size: 16px;
      color: var(--sp-text);
    }
    :deep(.van-field__control::placeholder) {
      color: var(--sp-text-placeholder);
    }
  }
  .field-label-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: var(--sp-text-secondary);
    .area-code {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 13px;
      font-weight: 600;
      color: var(--sp-text);
      cursor: pointer;
      .van-icon {
        font-size: 10px;
        color: var(--sp-text-placeholder);
      }
    }
  }
}

/* 联系方式：手机号 / 邮箱 */
.contact-type {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  .contact-item {
    padding: 4px 12px;
    font-size: 12px;
    color: var(--sp-text-secondary);
    border: 1px solid var(--sp-border);
    border-radius: 999px;
    cursor: pointer;
    &.active {
      color: var(--sp-primary);
      border-color: var(--sp-primary);
      background: rgba(255, 107, 0, 0.06);
      font-weight: 600;
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

/* 记住我 + 忘记密码 */
.row-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 2px 0 12px;
  :deep(.van-checkbox__label) {
    font-size: 13px;
    color: var(--sp-text-secondary);
  }
  .forgot {
    font-size: 13px;
    color: var(--sp-primary);
    font-weight: 500;
  }
}

/* 协议勾选 */
.agree-line {
  display: flex;
  align-items: center;
  margin: 0 2px 14px;
  .agree-text {
    font-size: 12px;
    color: var(--sp-text-secondary);
    .agree-link {
      color: var(--sp-primary);
    }
  }
}

.cta {
  font-weight: 700;
  letter-spacing: 2px;
}

/* 社交登录 */
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 22px 0 16px;
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

.social {
  display: flex;
  flex-direction: column;
  gap: 10px;
  .social-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 11px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--sp-text);
    background: #fff;
    border: 1px solid var(--sp-border);
    border-radius: 12px;
    transition: all 0.2s ease;
    &:active {
      background: #f5f7fa;
    }
    .social-icon {
      width: 18px;
      height: 18px;
    }
  }
}

/* 注册入口 */
.signup {
  margin-top: 18px;
  text-align: center;
  font-size: 13px;
  color: var(--sp-text-secondary);
  .signup-link {
    margin-left: 4px;
    color: var(--sp-primary);
    font-weight: 600;
  }
}

/* 演示账号 */
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
  margin-bottom: 10px;
  border: 1.5px solid var(--sp-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  &:active {
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
</style>

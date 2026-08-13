<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { useLoginForm } from '@/composables/useLoginForm'

const router = useRouter()
const { t } = useI18n()

const form = useLoginForm({
  role: 'admin',
  modes: ['pwd'],
  defaultContactType: 'email',
  showAgreement: false,
  notify: (msg) => ElMessage.info(msg),
})

const { account, password, remember, loading, demoAccounts, submitPwd, fillDemo } = form
</script>

<template>
  <div class="admin-login">
    <el-card class="card" shadow="always">
      <!-- 品牌区 -->
      <div class="brand">
        <div class="brand-badge">🐾</div>
        <div class="brand-name">{{ t('brand.name') }}</div>
        <h1 class="title">{{ t('login.admin.welcome') }}</h1>
        <p class="subtitle">{{ t('login.admin.subtitle') }}</p>
      </div>

      <!-- 表单 -->
      <el-form label-position="top" size="large" @submit.prevent>
        <el-form-item :label="t('login.email')">
          <el-input v-model="account" :placeholder="t('login.emailPlaceholder')" clearable />
        </el-form-item>
        <el-form-item :label="t('login.password')">
          <el-input
            v-model="password"
            type="password"
            :placeholder="t('login.passwordPlaceholder')"
            show-password
            @keyup.enter="submitPwd"
          />
        </el-form-item>
      </el-form>

      <!-- 记住我 + 忘记密码 -->
      <div class="row-options">
        <el-checkbox v-model="remember">{{ t('login.remember') }}</el-checkbox>
        <router-link to="/admin/forgot" class="forgot">{{ t('login.admin.forgot') }}</router-link>
      </div>

      <el-button type="primary" size="large" class="cta" :loading="loading" @click="submitPwd">
        {{ t('login.loginBtn') }}
      </el-button>

      <!-- 辅助链接 -->
      <p class="links">
        {{ t('login.admin.needAccount') }}
        <span class="link-strong" @click="router.push('/admin/register')">{{ t('login.admin.contactUs') }}</span>
      </p>

      <!-- 演示账号（仅平台） -->
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
          <el-tag size="small" effect="plain" type="primary">{{ t('login.oneClick') }}</el-tag>
        </div>
      </template>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.admin-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f9fcf7;
}

.card {
  width: 100%;
  max-width: 420px;
  border-radius: 12px;
  border: none;
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
    background: rgba(114, 209, 168, 0.14);
    border-radius: 16px;
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
    color: #222222;
  }
  .subtitle {
    margin-top: 6px;
    font-size: 14px;
    color: var(--sp-text-secondary);
  }
}

.row-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -4px 0 18px;
  :deep(.el-checkbox__label) {
    font-size: 13px;
    color: var(--sp-text-secondary);
  }
  .forgot {
    font-size: 13px;
    color: var(--sp-primary);
    font-weight: 500;
  }
}

.cta {
  width: 100%;
  font-weight: 700;
  letter-spacing: 2px;
}

.links {
  margin-top: 18px;
  text-align: center;
  font-size: 13px;
  color: var(--sp-text-secondary);
  .link-strong {
    margin-left: 4px;
    color: var(--sp-primary);
    font-weight: 600;
    cursor: pointer;
  }
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
  border: 1px dashed var(--sp-border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    border-color: var(--sp-primary);
    background: rgba(114, 209, 168, 0.08);
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

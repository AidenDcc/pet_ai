<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { useAuthAccountForm } from '@/composables/useAuthAccountForm'

const { t } = useI18n()

const form = useAuthAccountForm({
  role: 'admin',
  scene: 'reset',
  notify: (msg) => ElMessage.info(msg),
})

const {
  contactType,
  areaCode,
  phone,
  email,
  code,
  password,
  confirmPwd,
  submitting,
  codeSending,
  codeSeconds,
  areaActions,
  sendCode,
  onSubmit,
  titleKey,
  subtitleKey,
  toLogin,
} = form
</script>

<template>
  <div class="admin-auth">
    <el-card class="card" shadow="always">
      <div class="brand">
        <div class="brand-badge">🔑</div>
        <div class="brand-name">{{ t('brand.name') }}</div>
        <h1 class="title">{{ t(titleKey) }}</h1>
        <p class="subtitle">{{ t(subtitleKey) }}</p>
      </div>

      <el-form label-position="top" size="large" @submit.prevent>
        <!-- 联系方式 -->
        <el-form-item :label="t('forgot.contact')">
          <el-radio-group v-model="contactType">
            <el-radio-button value="phone">{{ t('forgot.tabPhone') }}</el-radio-button>
            <el-radio-button value="email">{{ t('forgot.tabEmail') }}</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <!-- 手机号 / 邮箱 -->
        <el-form-item v-if="contactType === 'phone'" :label="t('forgot.phonePlaceholder')">
          <el-input v-model="phone" :placeholder="t('forgot.phonePlaceholder')" clearable>
            <template #prepend>
              <el-select v-model="areaCode" style="width: 110px">
                <el-option v-for="a in areaActions" :key="a.code" :label="a.name" :value="a.code" />
              </el-select>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item v-else :label="t('forgot.emailPlaceholder')">
          <el-input v-model="email" :placeholder="t('forgot.emailPlaceholder')" clearable />
        </el-form-item>

        <!-- 验证码 -->
        <el-form-item :label="t('forgot.codePlaceholder')">
          <div class="code-row">
            <el-input v-model="code" :placeholder="t('forgot.codePlaceholder')" maxlength="6" clearable />
            <el-button :disabled="codeSeconds > 0 || codeSending" @click="sendCode">
              {{ codeSeconds > 0 ? t('forgot.resendAfter', { n: codeSeconds }) : t('forgot.getCode') }}
            </el-button>
          </div>
        </el-form-item>

        <!-- 新密码 + 确认新密码 -->
        <el-form-item :label="t('forgot.newPasswordPlaceholder')">
          <el-input v-model="password" type="password" :placeholder="t('forgot.newPasswordPlaceholder')" show-password />
        </el-form-item>
        <el-form-item :label="t('forgot.confirmPlaceholder')">
          <el-input v-model="confirmPwd" type="password" :placeholder="t('forgot.confirmPlaceholder')" show-password @keyup.enter="onSubmit" />
        </el-form-item>
      </el-form>

      <el-button type="primary" size="large" class="cta" :loading="submitting" @click="onSubmit">
        {{ t('forgot.submit') }}
      </el-button>

      <router-link :to="toLogin" class="to-login">{{ t('forgot.toLogin') }}</router-link>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.admin-auth {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f0f2f5;
}

.card {
  width: 100%;
  max-width: 440px;
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
    background: rgba(0, 180, 166, 0.1);
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
    color: #1f2d3d;
  }
  .subtitle {
    margin-top: 6px;
    font-size: 14px;
    color: var(--sp-text-secondary);
  }
}

.code-row {
  display: flex;
  gap: 10px;
  width: 100%;
  .el-input {
    flex: 1;
  }
}

.cta {
  width: 100%;
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

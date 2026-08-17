<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { changePasswordApi } from '@/api/modules/auth'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const { t } = useI18n()
const auth = useAuthStore()

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showOld = ref(false)
const showNew = ref(false)
const saving = ref(false)

const PWD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[\S]{6,20}$/

async function doSubmit() {
  if (!oldPassword.value) {
    showToast(t('user.password.oldRequired'))
    return
  }
  if (!newPassword.value) {
    showToast(t('user.password.newRequired'))
    return
  }
  if (!PWD_REGEX.test(newPassword.value)) {
    showToast(t('user.password.formatRule'))
    return
  }
  if (!confirmPassword.value) {
    showToast(t('user.password.confirmRequired'))
    return
  }
  if (confirmPassword.value !== newPassword.value) {
    showToast(t('user.password.mismatch'))
    return
  }

  saving.value = true
  try {
    await changePasswordApi({ oldPassword: oldPassword.value, newPassword: newPassword.value })
    showToast(t('user.password.success'))
    // 修改成功后要求重新登录
    setTimeout(() => {
      auth.logout()
      router.replace('/doctor/login')
    }, 800)
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="pwd-page">
    <div class="sp-card pwd-card">
      <div class="pwd-hint">{{ t('user.password.formatRule') }}</div>
      <van-field
        v-model="oldPassword"
        :type="showOld ? 'text' : 'password'"
        :label="t('user.password.oldPassword')"
        :placeholder="t('user.password.oldPasswordPlaceholder')"
        maxlength="20"
        :right-icon="showOld ? 'eye-o' : 'closed-eye'"
        @click-right-icon="showOld = !showOld"
      />
      <van-field
        v-model="newPassword"
        :type="showNew ? 'text' : 'password'"
        :label="t('user.password.newPassword')"
        :placeholder="t('user.password.newPasswordPlaceholder')"
        maxlength="20"
        :right-icon="showNew ? 'eye-o' : 'closed-eye'"
        @click-right-icon="showNew = !showNew"
      />
      <van-field
        v-model="confirmPassword"
        :type="showNew ? 'text' : 'password'"
        :label="t('user.password.confirmPassword')"
        :placeholder="t('user.password.confirmPasswordPlaceholder')"
        maxlength="20"
        :right-icon="showNew ? 'eye-o' : 'closed-eye'"
        @click-right-icon="showNew = !showNew"
      />
    </div>

    <div class="pwd-save">
      <van-button block round type="primary" color="#00b4a6" size="large" :loading="saving" @click="doSubmit">
        {{ t('common.submit') }}
      </van-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pwd-page {
  min-height: 100%;
  box-sizing: border-box;
  padding: 16px 14px;
  background: #eef7f6;
}

.pwd-card {
  padding: 6px 0;

  .pwd-hint {
    padding: 14px 16px 8px;
    font-size: 12px;
    color: #5e8580;
    line-height: 1.5;
  }
}

.pwd-save {
  padding: 24px 14px;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast, showConfirmDialog } from 'vant'
import { cancelAccountApi } from '@/api/modules/settings'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const { t } = useI18n()
const auth = useAuthStore()

/** 是否已勾选同意注销协议（未勾选时按钮禁用） */
const agreed = ref(false)
const cancelling = ref(false)

/** 注销后果列表（双语，语言切换时同步） */
const CONSEQUENCES = computed(() => [
  t('user.cancelAccount.consequence1'),
  t('user.cancelAccount.consequence2'),
  t('user.cancelAccount.consequence3'),
  t('user.cancelAccount.consequence4'),
])

function goAgreement() {
  router.push('/doctor/settings/services/accountCancel')
}

async function doCancel() {
  if (!agreed.value) {
    showToast(t('user.cancelAccount.agreeRequired'))
    return
  }
  try {
    await showConfirmDialog({
      title: t('user.cancelAccount.confirmTitle'),
      message: t('user.cancelAccount.confirmMsg'),
      confirmButtonColor: '#ff3b30',
    })
  } catch {
    return // 取消
  }
  cancelling.value = true
  try {
    await cancelAccountApi()
    showToast(t('user.cancelAccount.cancelSuccess'))
    // 注销成功后退出登录并回到登录页
    setTimeout(() => {
      auth.logout()
      router.replace('/doctor/login')
    }, 800)
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  } finally {
    cancelling.value = false
  }
}
</script>

<template>
  <div class="cancel-page">
    <!-- 注销须知：删除用户信息，法律要求保留的数据 180 天后彻底删除 -->
    <div class="cancel-warn">
      <van-icon name="warning-o" class="cancel-warn__icon" />
      <div class="cancel-warn__title">{{ t('user.cancelAccount.warnTitle') }}</div>
      <div class="cancel-warn__text">{{ t('user.cancelAccount.warnText') }}</div>
    </div>

    <!-- 注销后果列表 -->
    <div class="sp-card cancel-consequences">
      <div class="cancel-consequences__title">{{ t('user.cancelAccount.consequencesTitle') }}</div>
      <div v-for="(c, i) in CONSEQUENCES" :key="i" class="cancel-consequences__item">
        <van-icon name="cross" class="cancel-consequences__cross" />
        <span>{{ c }}</span>
      </div>
    </div>

    <!-- 勾选同意注销协议 -->
    <div class="cancel-agree">
      <van-checkbox v-model="agreed" icon-size="18px" checked-color="#ff3b30" shape="square">
        <span class="cancel-agree__text">
          {{ t('user.cancelAccount.agreePrefix') }}
          <a class="cancel-agree__link" @click.stop="goAgreement">{{ t('user.cancelAccount.agreeAgreement') }}</a>
        </span>
      </van-checkbox>
    </div>

    <!-- 注销按钮：需先勾选协议 -->
    <div class="cancel-submit">
      <van-button
        block
        round
        size="large"
        color="linear-gradient(135deg, #00b4a6, #ff3b30)"
        :disabled="!agreed"
        :loading="cancelling"
        @click="doCancel"
      >
        {{ t('user.cancelAccount.cancelBtn') }}
      </van-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.cancel-page {
  min-height: 100%;
  box-sizing: border-box;
  padding: 16px 14px 40px;
  background: #eef7f6;
}

/* ---- 注销须知 ---- */
.cancel-warn {
  padding: 20px 18px;
  border-radius: 20px;
  background: linear-gradient(160deg, #e0f5f2 0%, #d6efec 100%);
  border: 1px solid #bfe6e1;
  text-align: center;

  &__icon {
    font-size: 34px;
    color: #00b4a6;
  }

  &__title {
    margin-top: 8px;
    font-size: 16px;
    font-weight: 800;
    color: #14403c;
  }

  &__text {
    margin-top: 10px;
    font-size: 13px;
    line-height: 1.8;
    color: #3a5c58;
    text-align: justify;
  }
}

/* ---- 注销后果 ---- */
.cancel-consequences {
  margin-top: 14px;
  padding: 16px 18px;

  &__title {
    font-size: 14px;
    font-weight: 700;
    color: #1f2d3d;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    font-size: 13px;
    color: #3a4d4b;
    line-height: 1.5;

    &:first-of-type {
      margin-top: 10px;
    }
  }

  &__cross {
    flex-shrink: 0;
    font-size: 14px;
    color: #ff3b30;
  }
}

/* ---- 勾选同意 ---- */
.cancel-agree {
  margin-top: 18px;
  padding: 4px 6px;

  &__text {
    font-size: 13px;
    color: #3a4d4b;
  }

  &__link {
    color: #00b4a6;
    font-weight: 600;
  }
}

/* ---- 注销按钮 ---- */
.cancel-submit {
  margin-top: 24px;
}
</style>

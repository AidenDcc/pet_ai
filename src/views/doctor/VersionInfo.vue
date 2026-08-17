<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { checkVersionApi } from '@/api/modules/settings'
import { APP_VERSION } from '@/utils/consts'

const { t } = useI18n()

const current = `v${APP_VERSION}`
const checking = ref(false)
const updating = ref(false)
const progress = ref(0)
const latest = ref('')
const changeLog = ref('')
const state = ref<'idle' | 'found' | 'uptodate'>('idle')
let timer: number | null = null

async function doCheck() {
  if (checking.value) return
  checking.value = true
  try {
    const res = await checkVersionApi()
    latest.value = res.latest
    changeLog.value = res.changeLog
    state.value = res.latest !== current ? 'found' : 'uptodate'
    if (state.value === 'uptodate') showToast(t('user.version.upToDate'))
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    checking.value = false
  }
}

function doUpdate() {
  if (updating.value) return
  updating.value = true
  progress.value = 0
  timer = window.setInterval(() => {
    progress.value += Math.round(Math.random() * 18 + 8)
    if (progress.value >= 100) {
      progress.value = 100
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      updating.value = false
      state.value = 'uptodate'
      latest.value = current
      showToast(t('user.version.updateDone'))
    }
  }, 200)
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="version-page">
    <div class="sp-card version-card">
      <div class="version-card__app">
        <div class="version-card__name">{{ t('brand.name') }} · {{ t('brand.platform') }}</div>
        <div class="version-card__current">{{ t('user.version.current') }}：{{ current }}</div>
      </div>
      <div v-if="state === 'found'" class="version-card__latest">
        <van-icon name="checked" class="version-card__latest-icon" />
        <span>{{ t('user.version.foundUpdate', { v: latest }) }}</span>
      </div>
      <div v-if="state === 'uptodate'" class="version-card__latest version-card__latest--ok">
        <van-icon name="success" />
        <span>{{ t('user.version.upToDate') }}</span>
      </div>

      <div v-if="updating" class="update-progress">
        <van-progress :percentage="Math.round(progress)" color="#00b4a6" :stroke-width="8" track-color="#e6f2f0" />
      </div>
    </div>

    <div v-if="state === 'found'" class="sp-card changelog-card">
      <div class="changelog-card__title">{{ t('user.version.changeLog') }} · {{ latest }}</div>
      <div class="changelog-card__body">{{ changeLog }}</div>
    </div>

    <div class="version-actions">
      <van-button
        v-if="state !== 'found'"
        block
        round
        type="primary"
        size="large"
        color="#00b4a6"
        :loading="checking"
        :disabled="state === 'uptodate'"
        @click="doCheck"
      >
        {{ state === 'uptodate' ? t('user.version.upToDate') : t('user.version.checkUpdate') }}
      </van-button>
      <template v-else>
        <van-button
          block
          round
          type="primary"
          size="large"
          color="#00b4a6"
          :loading="updating"
          :loading-text="t('user.version.updating')"
          @click="doUpdate"
        >
          {{ t('user.version.updateNow') }}
        </van-button>
        <van-button block round plain size="large" class="recheck-btn" @click="doCheck">
          {{ t('user.version.checkUpdate') }}
        </van-button>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.version-page {
  min-height: 100%;
  box-sizing: border-box;
  padding: 20px 14px;
  background: #eef7f6;
}

.version-card {
  padding: 24px 18px;
  text-align: center;

  &__app {
    .version-card__name {
      font-size: 17px;
      font-weight: 700;
      color: #14403c;
    }

    .version-card__current {
      margin-top: 8px;
      font-size: 13px;
      color: #5e8580;
    }
  }

  &__latest {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 14px;
    padding: 5px 12px;
    border-radius: 999px;
    background: #e0f5f2;
    color: #00b4a6;
    font-size: 13px;
    font-weight: 600;

    &--ok {
      background: #e9f7f1;
      color: #00a878;
    }
  }
}

.update-progress {
  margin-top: 16px;
}

.changelog-card {
  margin-top: 14px;
  padding: 16px 18px;

  &__title {
    font-size: 14px;
    font-weight: 700;
    color: #1f2d3d;
  }

  &__body {
    margin-top: 8px;
    font-size: 13px;
    line-height: 1.7;
    color: #3a4d4b;
  }
}

.version-actions {
  padding: 24px 2px 0;

  .recheck-btn {
    margin-top: 12px;
    color: #5e8580;
  }
}
</style>

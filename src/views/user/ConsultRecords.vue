<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getMyConsultationsApi, type ConsultationMine } from '@/api/modules/consultation'
import { formatDateTime } from '@/utils/format'
import { petAvatarSrc } from '@/utils/petAvatar'

const router = useRouter()
const { t } = useI18n()

const list = ref<ConsultationMine[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    list.value = await getMyConsultationsApi()
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}
load()
</script>

<template>
  <div class="records-page">
    <van-skeleton v-if="loading" title :row="5" class="mt-16" />

    <template v-else-if="list.length">
      <div v-for="c in list" :key="c.id" class="record-card" @click="router.push(`/user/consult/records/${c.id}`)">
        <div class="card-head">
          <van-image round width="40" height="40" :src="petAvatarSrc(c.pet?.name) || c.pet?.avatar || ''" />
          <div class="head-main">
            <div class="pet-name">{{ c.pet?.name ?? '-' }}</div>
            <div class="meta">
              {{ c.vetName ?? '-' }} · {{ formatDateTime(c.pushedAt) }}
            </div>
          </div>
          <van-tag round :type="c.status === 'active' ? 'primary' : 'default'">
            {{ c.status === 'active' ? t('user.consult.statusActive') : t('user.consult.statusClosed') }}
          </van-tag>
        </div>

        <div v-if="c.note" class="card-note">{{ c.note }}</div>

        <!-- 医生回复预览 -->
        <div v-if="c.lastReply" class="reply-box">
          <span class="reply-label">{{ t('user.consult.lastReply') }}</span>
          <span class="reply-text">{{ c.lastReply.content }}</span>
          <van-icon name="arrow" class="reply-arrow" color="#b6ad98" />
        </div>
        <div v-else class="pending-box">
          <span class="pending-dot"></span>
          {{ t('user.consult.noReply') }}
        </div>
      </div>
    </template>

    <van-empty v-else :description="t('user.consult.empty')" />

    <!-- 右下角悬浮「问诊」按钮：进入选医生界面 -->
    <div class="fab-bar">
      <button class="fab" type="button" @click="router.push('/user/consult/doctors')">
        <van-icon name="service-o" size="18" />
        <span>{{ t('user.consult.consultButton') }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.records-page {
  display: flex;
  flex-direction: column;
  padding: 14px 14px 24px;
  background: #fff;
  min-height: 100%;
  box-sizing: border-box;
}

.record-card {
  padding: 14px;
  border-radius: 18px;
  border: 1px solid #f0ead9;
  background: #fff;
  margin-bottom: 12px;
  cursor: pointer;

  .card-head {
    display: flex;
    align-items: center;
    gap: 12px;

    .head-main {
      flex: 1;
      min-width: 0;
    }

    .pet-name {
      font-size: 16px;
      font-weight: 800;
      color: #2b2b2b;
    }

    .meta {
      margin-top: 2px;
      font-size: 12px;
      color: #8a7a5a;
    }
  }

  .card-note {
    margin-top: 12px;
    font-size: 13px;
    line-height: 1.6;
    color: #4a4230;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.reply-box {
  margin-top: 12px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff8e1;

  .reply-label {
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 700;
    color: #b08a4a;
    background: #fff3c4;
    border-radius: 8px;
    padding: 2px 8px;
  }

  .reply-text {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    line-height: 1.5;
    color: #6b5d3e;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .reply-arrow {
    flex-shrink: 0;
    margin-top: 4px;
  }
}

.pending-box {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f7f7f5;
  font-size: 12px;
  color: #b6ad98;

  .pending-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #ffb300;
    animation: blink 1.2s infinite;
  }
}

@keyframes blink {
  50% {
    opacity: 0.3;
  }
}

.mt-16 {
  margin-top: 16px;
}

/* ---- 右下角悬浮「问诊」按钮 ---- */
.fab-bar {
  position: sticky;
  bottom: 12px;
  margin-top: auto;
  padding-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.fab {
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 999px;
  background: #ffd54a;
  color: #2b2b2b;
  font-size: 15px;
  font-weight: 800;
  padding: 12px 20px;
  box-shadow: 0 6px 18px rgba(255, 179, 0, 0.45);
  cursor: pointer;
}
</style>

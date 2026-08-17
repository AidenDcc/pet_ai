<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showImagePreview, showToast } from 'vant'
import { getMessageDetailApi } from '@/api/modules/notification'
import { formatDateTime } from '@/utils/format'
import type { MessageItem } from '@/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const id = String(route.params.id)
const detail = ref<MessageItem | null>(null)
const loading = ref(false)

const VITALS = computed(() => {
  const v = detail.value?.petVitals
  if (!v) return []
  return [
    { label: t('user.health.temperature'), value: `${v.temperature.toFixed(1)}`, unit: t('user.health.degreeC'), color: '#ff9f43' },
    { label: t('user.health.heartRate'), value: `${v.heartRate}`, unit: t('user.health.bpm'), color: '#ff6b6b' },
    { label: t('user.health.spo2'), value: `${v.spo2}`, unit: t('user.health.percent'), color: '#00b4a6' },
    { label: t('user.health.respiratory'), value: `${v.respiratoryRate}`, unit: t('user.health.bpm'), color: '#5b8ff9' },
  ]
})

function previewImage(url: string) {
  showImagePreview({ images: detail.value?.images ?? [], startPosition: detail.value?.images.indexOf(url) ?? 0 })
}

async function load() {
  loading.value = true
  try {
    detail.value = await getMessageDetailApi(id)
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
    router.replace('/doctor/messages')
  } finally {
    loading.value = false
  }
}
load()
</script>

<template>
  <div class="msg-detail">
    <van-skeleton v-if="loading" title :row="8" />

    <template v-else-if="detail">
      <!-- 主题 + 发送人 / 发送时间 -->
      <header class="detail-head">
        <h1 class="detail-title">{{ detail.title }}</h1>
        <div class="detail-meta">
          <span class="meta-sender">{{ t('user.message.sender') }}：{{ detail.sender }}</span>
          <span class="meta-time">{{ t('user.message.sendTime') }}：{{ formatDateTime(detail.createdAt) }}</span>
        </div>
      </header>

      <!-- 宠物体征信息 -->
      <section v-if="detail.petVitals" class="sec">
        <div class="sec-title">{{ t('user.message.petVitals') }}</div>
        <div class="vitals-card">
          <div class="vitals-pet">
            <van-image round width="48" height="48" :src="detail.petVitals.petAvatar" />
            <div class="vitals-pet-info">
              <div class="vitals-pet-name">{{ detail.petVitals.petName }}</div>
              <div class="vitals-pet-breed">{{ detail.petVitals.breed }}</div>
            </div>
          </div>
          <div class="metric-grid">
            <div v-for="m in VITALS" :key="m.label" class="metric-item">
              <div class="metric-value" :style="{ color: m.color }">
                {{ m.value }}<span class="metric-unit">{{ m.unit }}</span>
              </div>
              <div class="metric-label">{{ m.label }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 正文 -->
      <section class="sec">
        <div class="sec-title">{{ t('user.message.content') }}</div>
        <div class="content-box">{{ detail.content }}</div>
      </section>

      <!-- 配图 -->
      <section v-if="detail.images.length" class="sec">
        <div class="img-grid">
          <img
            v-for="(url, i) in detail.images"
            :key="i"
            :src="url"
            class="img-item"
            @click="previewImage(url)"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.msg-detail {
  padding: 16px 14px 32px;
  background: #eef7f6;
  min-height: 100%;
  box-sizing: border-box;
}

/* ---- 顶部主题 ---- */
.detail-head {
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(165deg, #d6f5f1 0%, #7fdcd4 100%);

  .detail-title {
    margin: 0;
    font-size: 19px;
    font-weight: 800;
    color: #14403c;
    line-height: 1.4;
  }

  .detail-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    margin-top: 12px;

    .meta-sender,
    .meta-time {
      font-size: 12px;
      color: #1d6a63;
    }
  }
}

.sec {
  margin-top: 16px;

  .sec-title {
    font-size: 14px;
    font-weight: 800;
    color: #1f2d3d;
    margin-bottom: 10px;
  }
}

/* ---- 宠物体征卡片 ---- */
.vitals-card {
  padding: 14px;
  border-radius: 18px;
  background: #fff;

  .vitals-pet {
    display: flex;
    align-items: center;
    gap: 12px;

    .vitals-pet-info {
      .vitals-pet-name {
        font-size: 16px;
        font-weight: 800;
        color: #1f2d3d;
      }

      .vitals-pet-breed {
        margin-top: 2px;
        font-size: 12px;
        color: #5e8580;
      }
    }
  }
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 14px;

  .metric-item {
    padding: 12px 4px;
    border-radius: 12px;
    background: #eef7f6;
    text-align: center;

    .metric-value {
      font-size: 16px;
      font-weight: 800;
      color: #1f2d3d;
      white-space: nowrap;

      .metric-unit {
        margin-left: 1px;
        font-size: 10px;
        font-weight: 400;
        color: #a0b8b4;
      }
    }

    .metric-label {
      margin-top: 4px;
      font-size: 11px;
      color: #5e8580;
    }
  }
}

/* ---- 正文 ---- */
.content-box {
  padding: 14px;
  border-radius: 18px;
  background: #fff;
  font-size: 14px;
  line-height: 1.8;
  color: #2b3a39;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ---- 配图 ---- */
.img-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;

  .img-item {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 12px;
    object-fit: cover;
    background: #eef7f6;
    cursor: pointer;
  }
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showImagePreview, showToast } from 'vant'
import { getConsultationApi, type ConsultationDetail } from '@/api/modules/consultation'
import { formatDateTime } from '@/utils/format'
import { petAvatarSrc } from '@/utils/petAvatar'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const id = String(route.params.id)
const detail = ref<ConsultationDetail | null>(null)
const loading = ref(false)

const VITALS = computed(() => {
  const h = detail.value?.healthSnapshot
  if (!h) return []
  return [
    { label: t('user.health.temperature'), value: `${h.temperature.toFixed(1)}°C`, color: '#ff9f43' },
    { label: t('user.health.heartRate'), value: `${h.heartRate}`, unit: t('user.health.bpm'), color: '#ff6b6b' },
    { label: t('user.health.spo2'), value: `${h.spo2}%`, color: '#00b4a6' },
    { label: t('user.health.respiratory'), value: `${h.respiratoryRate}`, unit: t('user.health.bpm'), color: '#5b8ff9' },
    // 卡路里为新增指标，历史快照可能缺失该字段，缺失时展示占位符
    { label: t('user.health.calorie'), value: h.calorie != null ? `${h.calorie}` : '--', unit: t('user.health.calorieUnit'), color: '#34c759' },
    { label: t('user.consult.activity'), value: `${Math.round(h.activityPercent)}%`, color: '#ffb300' },
    { label: t('user.consult.sleep'), value: `${h.sleepHours.toFixed(1)}h`, color: '#9b59b6' },
  ]
})

const EXERCISE_ITEMS = computed(() => {
  const e = detail.value?.exerciseSnapshot
  if (!e) return []
  return [
    { label: t('user.health.stepFreq'), value: `${e.stepFreq}`, unit: t('user.health.stepFreqUnit'), icon: '👟' },
    { label: t('user.health.stride'), value: `${e.stride}`, unit: t('user.health.strideUnit'), icon: '📏' },
    { label: t('user.health.gait'), value: t(`user.health.gaitTypes.${e.gait}`), unit: '', icon: '🚶' },
    { label: t('user.health.speed'), value: `${e.speed}`, unit: t('user.health.speedUnit'), icon: '⚡' },
  ]
})

function previewImage(url: string) {
  showImagePreview({ images: detail.value?.images ?? [], startPosition: detail.value?.images.indexOf(url) ?? 0 })
}

async function load() {
  loading.value = true
  try {
    detail.value = await getConsultationApi(id)
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
    router.replace('/user/consult/records')
  } finally {
    loading.value = false
  }
}
load()
</script>

<template>
  <div class="detail-page">
    <van-skeleton v-if="loading" title :row="8" class="mt-16" />

    <template v-else-if="detail">
      <!-- 顶部：状态 + 时间 -->
      <div class="head-row">
        <van-tag round :type="detail.status === 'active' ? 'primary' : 'default'">
          {{ detail.status === 'active' ? t('user.consult.statusActive') : t('user.consult.statusClosed') }}
        </van-tag>
        <span class="pushed-at">{{ formatDateTime(detail.pushedAt) }}</span>
      </div>

      <!-- 医生信息 -->
      <section class="sec" v-if="detail.vet">
        <div class="sec-title">{{ t('user.consult.composeDoctor') }}</div>
        <div class="info-card">
          <div class="doc-avatar">
            <img :src="detail.vet.avatar" :alt="detail.vet.name" />
            <span class="doc-badge">🩺</span>
          </div>
          <div class="info-main">
            <div class="info-name">
              {{ detail.vet.name }} <span class="doc-title">{{ detail.vet.title }}</span>
            </div>
            <div class="info-sub">{{ detail.vet.hospital }} · {{ detail.vet.specialty }}</div>
            <div class="info-price">¥{{ detail.vet.consultPrice }}<span class="info-price-unit">/次</span></div>
          </div>
        </div>
      </section>

      <!-- 宠物信息 -->
      <section class="sec" v-if="detail.pet">
        <div class="sec-title">{{ t('user.consult.composePet') }}</div>
        <div class="info-card">
          <van-image round width="52" height="52" :src="petAvatarSrc(detail.pet.name) || detail.pet.avatar" />
          <div class="info-main">
            <div class="info-name">{{ detail.pet.name }}</div>
            <div class="info-sub">{{ detail.pet.breed }} · {{ detail.pet.weight }}kg</div>
          </div>
        </div>
      </section>

      <!-- 咨询内容 -->
      <section class="sec">
        <div class="sec-title">{{ t('user.consult.contentLabel') }}</div>
        <div class="text-box">{{ detail.note || '-' }}</div>
      </section>

      <!-- 上传图片 -->
      <section v-if="detail.images.length" class="sec">
        <div class="sec-title">{{ t('user.consult.imageLabel') }}</div>
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

      <!-- 近期体征数据 -->
      <section class="sec">
        <div class="sec-title">{{ t('user.consult.healthSnapshot') }}</div>
        <div v-if="VITALS.length" class="metric-grid">
          <div v-for="m in VITALS" :key="m.label" class="metric-item">
            <div class="metric-value" :style="{ color: m.color }">
              {{ m.value }}<span v-if="m.unit" class="metric-unit">{{ m.unit }}</span>
            </div>
            <div class="metric-label">{{ m.label }}</div>
          </div>
        </div>
        <div v-else class="no-data">{{ t('user.consult.snapshotNoData') }}</div>
      </section>

      <!-- 近期运动数据 -->
      <section class="sec">
        <div class="sec-title">{{ t('user.consult.exerciseSnapshot') }}</div>
        <div v-if="EXERCISE_ITEMS.length" class="metric-grid">
          <div v-for="m in EXERCISE_ITEMS" :key="m.label" class="metric-item">
            <div class="metric-value">
              <span class="metric-icon">{{ m.icon }}</span>
              {{ m.value }}<span v-if="m.unit" class="metric-unit">{{ m.unit }}</span>
            </div>
            <div class="metric-label">{{ m.label }}</div>
          </div>
        </div>
        <div v-else class="no-data">{{ t('user.consult.snapshotNoData') }}</div>
      </section>

      <!-- 医生回复 -->
      <section class="sec">
        <div class="sec-title">{{ t('user.consult.lastReply') }}</div>

        <template v-if="detail.replies.length">
          <div v-for="r in detail.replies" :key="r.id" class="reply-card">
            <div class="reply-head">
              <span class="reply-vet">{{ detail.vet?.name ?? t('role.doctor') }}</span>
              <span class="reply-time">{{ t('user.consult.replyAt', { time: formatDateTime(r.repliedAt) }) }}</span>
            </div>
            <div class="reply-content">{{ r.content }}</div>

            <div v-if="r.medicines.length" class="med-box">
              <div class="med-title">💊 {{ t('user.consult.medicines') }}</div>
              <div v-for="(m, i) in r.medicines" :key="i" class="med-item">
                <div class="med-name">{{ m.name }}</div>
                <div class="med-usage">{{ t('user.consult.medicineUsage') }}：{{ m.usage }}</div>
              </div>
            </div>
            <div v-else class="med-none">{{ t('user.consult.medicineNoData') }}</div>
          </div>
        </template>

        <div v-else class="pending-box">
          <span class="pending-dot"></span>
          {{ t('user.consult.noReply') }}
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.detail-page {
  padding: 14px 14px 32px;
  background: #fff;
  min-height: 100%;
  box-sizing: border-box;
}

.head-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;

  .pushed-at {
    font-size: 12px;
    color: #8a7a5a;
  }
}

.sec {
  margin-bottom: 22px;

  .sec-title {
    font-size: 15px;
    font-weight: 800;
    color: #2b2b2b;
    margin-bottom: 10px;
  }
}

.info-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid #f0ead9;
  background: #fffdf2;

  .info-main {
    flex: 1;
    min-width: 0;
  }

  .info-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 17px;
    font-weight: 800;
    color: #2b2b2b;
  }

  .info-sub {
    margin-top: 4px;
    font-size: 12px;
    color: #8a7a5a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .info-price {
    margin-top: 6px;
    font-size: 18px;
    font-weight: 800;
    color: #ff4d4f;

    .info-price-unit {
      font-size: 12px;
      font-weight: 400;
      color: #b6ad98;
    }
  }
}

.doc-avatar {
  position: relative;
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: #fff3c4;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .doc-badge {
    position: absolute;
    right: 2px;
    bottom: 2px;
    font-size: 12px;
  }
}

.doc-title {
  font-size: 11px;
  color: #b08a4a;
  background: #fff6df;
  border-radius: 8px;
  padding: 2px 8px;
}

.text-box {
  padding: 12px 14px;
  border-radius: 14px;
  background: #fffdf2;
  border: 1px solid #f0ead9;
  font-size: 14px;
  line-height: 1.7;
  color: #3a3322;
  white-space: pre-wrap;
  word-break: break-word;
}

.img-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;

  .img-item {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 12px;
    object-fit: cover;
    background: #f7f5ee;
    cursor: pointer;
  }
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;

  .metric-item {
    padding: 12px 6px;
    border-radius: 14px;
    border: 1px solid #f0ead9;
    background: #fff;
    text-align: center;

    .metric-value {
      font-size: 17px;
      font-weight: 800;
      color: #2b2b2b;
      white-space: nowrap;

      .metric-unit {
        margin-left: 2px;
        font-size: 11px;
        font-weight: 400;
        color: #b6ad98;
      }

      .metric-icon {
        margin-right: 2px;
        font-size: 14px;
      }
    }

    .metric-label {
      margin-top: 4px;
      font-size: 11px;
      color: #8a7a5a;
    }
  }
}

.no-data {
  padding: 18px;
  text-align: center;
  font-size: 12px;
  color: #b6ad98;
  background: #f7f7f5;
  border-radius: 14px;
}

.reply-card {
  padding: 14px;
  border-radius: 18px;
  border: 1px solid #f0ead9;
  background: #fff8e1;
  margin-bottom: 12px;

  .reply-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    .reply-vet {
      font-size: 14px;
      font-weight: 800;
      color: #b08a4a;
    }

    .reply-time {
      font-size: 11px;
      color: #b6ad98;
    }
  }

  .reply-content {
    margin-top: 10px;
    font-size: 14px;
    line-height: 1.7;
    color: #3a3322;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .med-box {
    margin-top: 12px;
    padding: 12px;
    border-radius: 14px;
    background: #fff;

    .med-title {
      font-size: 13px;
      font-weight: 800;
      color: #2b2b2b;
      margin-bottom: 8px;
    }

    .med-item {
      padding: 8px 0;
      border-top: 1px solid #f5f0e3;

      &:first-of-type {
        border-top: none;
      }

      .med-name {
        font-size: 14px;
        font-weight: 700;
        color: #2b2b2b;
      }

      .med-usage {
        margin-top: 3px;
        font-size: 12px;
        color: #8a7a5a;
      }
    }
  }

  .med-none {
    margin-top: 12px;
    padding: 10px;
    border-radius: 12px;
    background: #fff;
    font-size: 12px;
    color: #b6ad98;
    text-align: center;
  }
}

.pending-box {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 18px;
  border-radius: 14px;
  background: #f7f7f5;
  font-size: 13px;
  color: #8a7a5a;
  justify-content: center;

  .pending-dot {
    width: 8px;
    height: 8px;
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
</style>

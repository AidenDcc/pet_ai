<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import type { UploaderFileListItem } from 'vant'
import { getMyPetsApi, type PetJoined } from '@/api/modules/pet'
import { getDoctorsApi, pushConsultationApi } from '@/api/modules/consultation'
import { getHealthSummaryApi, type HealthSummary } from '@/api/modules/health'
import { getExerciseSummaryApi, type ExerciseState } from '@/api/modules/exercise'
import { petAvatarSrc } from '@/utils/petAvatar'
import type { DoctorBrief } from '@/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const doctorId = String(route.query.doctorId ?? '')
const petId = String(route.query.petId ?? '')

/* ---------- 医生 / 宠物信息 ---------- */
const doctor = ref<DoctorBrief | null>(null)
const pet = ref<PetJoined | null>(null)
const loading = ref(false)

async function loadContext() {
  if (!doctorId || !petId) {
    showToast('参数错误')
    router.replace('/user/consult')
    return
  }
  loading.value = true
  try {
    const [docs, pets] = await Promise.all([getDoctorsApi(), getMyPetsApi()])
    doctor.value = docs.find((d) => d.id === doctorId) ?? null
    pet.value = pets.find((p) => p.id === petId) ?? null
    if (!doctor.value || !pet.value) {
      showToast('医生或宠物不存在')
      router.replace('/user/consult')
      return
    }
    await loadSnapshots()
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

/* ---------- 近期体征 / 运动数据（提交时一并快照） ---------- */
const summary = ref<HealthSummary | null>(null)
const exercise = ref<ExerciseState | null>(null)

async function loadSnapshots() {
  const [s, e] = await Promise.all([
    getHealthSummaryApi(petId),
    getExerciseSummaryApi(petId),
  ])
  summary.value = s
  exercise.value = e
}

/* ---------- 表单 ---------- */
const note = ref('')
const images = ref<string[]>([])
const fileList = ref<UploaderFileListItem[]>([])
const MAX_IMAGES = 6
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

function afterRead(item: UploaderFileListItem | UploaderFileListItem[]) {
  const files = Array.isArray(item) ? item : [item]
  for (const f of files) {
    const file = f.file
    if (!file) continue
    if (file.size > MAX_IMAGE_SIZE) {
      showToast(t('user.consult.imageTooLarge'))
      continue
    }
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result as string
      images.value.push(url)
      fileList.value.push({ url, isImage: true })
    }
    reader.readAsDataURL(file)
  }
}

function onDelete(file: UploaderFileListItem) {
  const idx = fileList.value.findIndex((f) => f === file)
  if (idx >= 0) images.value.splice(idx, 1)
}

/* ---------- 体征/运动展示 ---------- */
const VITALS = computed(() => {
  if (!summary.value) return []
  const s = summary.value
  return [
    { label: t('user.health.temperature'), value: `${s.temperature.latest.toFixed(1)}°C`, color: '#ff9f43' },
    { label: t('user.health.heartRate'), value: `${s.heartRate.latest}`, unit: t('user.health.bpm'), color: '#ff6b6b' },
    { label: t('user.health.spo2'), value: `${s.spo2.latest}%`, color: '#00b4a6' },
    { label: t('user.health.respiratory'), value: `${s.respiratoryRate.latest}`, unit: t('user.health.bpm'), color: '#5b8ff9' },
    { label: t('user.health.calorie'), value: `${s.calorie.latest}`, unit: t('user.health.calorieUnit'), color: '#34c759' },
    { label: t('user.consult.activity'), value: `${Math.round(s.activity.percent)}%`, color: '#ffb300' },
    { label: t('user.consult.sleep'), value: `${s.sleep.hours.toFixed(1)}h`, color: '#9b59b6' },
  ]
})

const EXERCISE_ITEMS = computed(() => {
  if (!exercise.value) return []
  const e = exercise.value
  return [
    { label: t('user.health.stepFreq'), value: `${e.stepFreq}`, unit: t('user.health.stepFreqUnit'), icon: '👟' },
    { label: t('user.health.stride'), value: `${e.stride}`, unit: t('user.health.strideUnit'), icon: '📏' },
    { label: t('user.health.gait'), value: t(`user.health.gaitTypes.${e.gait}`), unit: '', icon: '🚶' },
    { label: t('user.health.speed'), value: `${e.speed}`, unit: t('user.health.speedUnit'), icon: '⚡' },
  ]
})

/* ---------- 提交 ---------- */
const submitting = ref(false)

async function onSubmit() {
  if (!note.value.trim()) {
    showToast(t('user.consult.contentRequired'))
    return
  }
  if (!doctor.value || !pet.value) return
  submitting.value = true
  try {
    await pushConsultationApi({
      petId: pet.value.id,
      doctorId: doctor.value.id,
      note: note.value.trim(),
      images: images.value,
      healthSnapshot: summary.value
        ? {
            temperature: summary.value.temperature.latest,
            heartRate: summary.value.heartRate.latest,
            spo2: summary.value.spo2.latest,
            respiratoryRate: summary.value.respiratoryRate.latest,
            calorie: summary.value.calorie.latest,
            activityPercent: summary.value.activity.percent,
            sleepHours: summary.value.sleep.hours,
            updatedAt: summary.value.updatedAt,
          }
        : null,
      exerciseSnapshot: exercise.value
        ? {
            stepFreq: exercise.value.stepFreq,
            stride: exercise.value.stride,
            gait: exercise.value.gait,
            speed: exercise.value.speed,
            updatedAt: exercise.value.updatedAt,
          }
        : null,
    })
    showToast(t('user.consult.submitSuccess'))
    router.replace('/user/consult/records')
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  } finally {
    submitting.value = false
  }
}

loadContext()
</script>

<template>
  <div class="compose-page">
    <van-skeleton v-if="loading" title :row="8" class="mt-16" />

    <template v-else-if="doctor && pet">
      <!-- 医生信息 -->
      <section class="sec">
        <div class="sec-title">{{ t('user.consult.composeDoctor') }}</div>
        <div class="info-card">
          <div class="doc-avatar">
            <img :src="doctor.avatar" :alt="doctor.name" />
            <span class="doc-badge">🩺</span>
          </div>
          <div class="info-main">
            <div class="info-name">
              {{ doctor.name }} <span class="doc-title">{{ doctor.title }}</span>
            </div>
            <div class="info-sub">{{ doctor.hospital }} · {{ doctor.specialty }}</div>
            <div class="info-price">¥{{ doctor.consultPrice }}<span class="info-price-unit">/次</span></div>
          </div>
        </div>
      </section>

      <!-- 宠物信息 -->
      <section class="sec">
        <div class="sec-title">{{ t('user.consult.composePet') }}</div>
        <div class="info-card">
          <van-image round width="52" height="52" :src="petAvatarSrc(pet.name) || pet.avatar" />
          <div class="info-main">
            <div class="info-name">{{ pet.name }}</div>
            <div class="info-sub">{{ pet.breed }} · {{ pet.weight }}kg</div>
          </div>
        </div>
      </section>

      <!-- 咨询内容 -->
      <section class="sec">
        <div class="sec-title">{{ t('user.consult.contentLabel') }} <span class="required">*</span></div>
        <van-field
          v-model="note"
          type="textarea"
          rows="4"
          autosize
          maxlength="500"
          show-word-limit
          class="content-field"
          :placeholder="t('user.consult.contentPlaceholder')"
        />
      </section>

      <!-- 上传图片 -->
      <section class="sec">
        <div class="sec-title">{{ t('user.consult.imageLabel') }}</div>
        <van-uploader
          v-model="fileList"
          :max-count="MAX_IMAGES"
          :after-read="afterRead"
          accept="image/*"
          @delete="onDelete"
        />
        <div class="sec-hint">{{ t('user.consult.imageHint') }}</div>
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
        <van-empty v-else image-size="48" :description="t('user.consult.snapshotNoData')" />
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
        <van-empty v-else image-size="48" :description="t('user.consult.snapshotNoData')" />
      </section>

      <!-- 提交 -->
      <van-button
        round
        block
        color="#ffd54a"
        class="submit-btn"
        :loading="submitting"
        :loading-text="t('user.consult.submitting')"
        @click="onSubmit"
      >
        <span class="btn-text">{{ t('user.consult.submit') }}</span>
      </van-button>
    </template>
  </div>
</template>

<style scoped lang="scss">
.compose-page {
  padding: 14px 14px 32px;
  background: #fff;
  min-height: 100%;
  box-sizing: border-box;
}

.sec {
  margin-bottom: 20px;

  .sec-title {
    font-size: 15px;
    font-weight: 800;
    color: #2b2b2b;
    margin-bottom: 10px;

    .required {
      color: #ff4d4f;
    }
  }

  .sec-hint {
    margin-top: 8px;
    font-size: 12px;
    color: #b6ad98;
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

.content-field {
  padding: 12px 14px;
  background: #fffdf2;
  border: 2px solid #ffd54a;
  border-radius: 14px;
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

.submit-btn {
  margin-top: 6px;

  .btn-text {
    color: #2b2b2b;
    font-weight: 700;
  }
}

.mt-16 {
  margin-top: 16px;
}
</style>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getMyPetsApi, type PetJoined } from '@/api/modules/pet'
import { getAlbumApi } from '@/api/modules/album'
import { getReportListApi, type ReportJoined } from '@/api/modules/report'
import { getHealthSummaryApi, type HealthSummary } from '@/api/modules/health'
import { getExerciseSummaryApi, type ExerciseState } from '@/api/modules/exercise'
import { getDeviceTrackApi } from '@/api/modules/device'
import {
  createCommunityPostApi,
  updateCommunityPostApi,
  getCommunityPostApi,
  type CommunityPostPayload,
} from '@/api/modules/community'
import type { AlbumMedia, PostAttachment, PostAttachmentType, PostVideo } from '@/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const MAX_IMAGES = 9

const editingId = (route.query.id as string) || ''

const pets = ref<PetJoined[]>([])
const caption = ref('')
const petId = ref('')
const images = ref<string[]>([])
const video = ref<PostVideo | null>(null)
const attachments = ref<PostAttachment[]>([])

const submitting = ref(false)
const loading = ref(false)

const selectedPet = computed(() => pets.value.find((p) => p.id === petId.value))

/* ---------- 关联数据（按所选宠物加载） ---------- */
const reports = ref<ReportJoined[]>([])
const healthSummary = ref<HealthSummary | null>(null)
const exerciseSummary = ref<ExerciseState | null>(null)
const trackPoints = ref<number | null>(null)

function round1(n?: number): string {
  return n == null ? '--' : String(Math.round(n * 10) / 10)
}

const reportSummary = computed(() => {
  const r = reports.value[0]
  return r ? `${r.reportNo} · 评分 ${r.score}` : ''
})
const vitalsSummary = computed(() => {
  const s = healthSummary.value
  return s
    ? `心率 ${round1(s.heartRate.avg)} · 体温 ${round1(s.temperature.avg)}℃ · 血氧 ${round1(s.spo2.avg)}%`
    : ''
})
const exerciseSummaryText = computed(() => {
  const s = exerciseSummary.value
  return s ? `步频 ${round1(s.stepFreq)} 步/分 · 步幅 ${round1(s.stride)}cm · 速度 ${round1(s.speed)}m/s` : ''
})
const trackSummary = computed(() => {
  return trackPoints.value != null ? `已记录 ${trackPoints.value} 个定位点` : t('user.community.trackNoData')
})

interface AttachOption {
  type: PostAttachmentType
  icon: string
  labelKey: string
  summary: string
  disabled: boolean
}

const attachOptions = computed<AttachOption[]>(() => [
  { type: 'report', icon: 'notes-o', labelKey: 'user.community.attachReport', summary: reportSummary.value, disabled: !reports.value.length },
  { type: 'track', icon: 'location-o', labelKey: 'user.community.attachTrack', summary: trackSummary.value, disabled: trackPoints.value == null },
  { type: 'vitals', icon: 'chart-trending-o', labelKey: 'user.community.attachVitals', summary: vitalsSummary.value, disabled: !healthSummary.value },
  { type: 'exercise', icon: 'logistics', labelKey: 'user.community.attachExercise', summary: exerciseSummaryText.value, disabled: !exerciseSummary.value },
])

function isAttached(type: PostAttachmentType): boolean {
  return attachments.value.some((a) => a.type === type)
}

function buildAttachment(type: PostAttachmentType): PostAttachment | null {
  const pet = selectedPet.value
  if (!pet) return null
  const base = { type, petId: pet.id, petName: pet.name }
  if (type === 'report') {
    const r = reports.value[0]
    if (!r) return null
    return { ...base, title: r.reportNo, summary: `综合评分 ${r.score} · ${r.summary}`, refId: r.id }
  }
  if (type === 'vitals' && healthSummary.value) {
    return { ...base, title: t('user.community.attachVitals'), summary: vitalsSummary.value }
  }
  if (type === 'exercise' && exerciseSummary.value) {
    return { ...base, title: t('user.community.attachExercise'), summary: exerciseSummaryText.value }
  }
  if (type === 'track' && trackPoints.value != null) {
    return { ...base, title: t('user.community.attachTrack'), summary: trackSummary.value }
  }
  return null
}

function toggleAttach(type: PostAttachmentType) {
  if (isAttached(type)) {
    attachments.value = attachments.value.filter((a) => a.type !== type)
    return
  }
  const a = buildAttachment(type)
  if (a) attachments.value.push(a)
}

/* ---------- 宠物选择 ---------- */
const showPetSheet = ref(false)
const petActions = computed(() => [
  ...pets.value.map((p) => ({ name: p.name, key: p.id })),
  { name: t('user.community.noPet'), key: '', color: '#8a7a5a' },
])

function onPetSelect(action: { key?: string }) {
  showPetSheet.value = false
  const id = action.key ?? ''
  if (id === petId.value) return
  petId.value = id
  attachments.value = []
  resetAttachData()
  if (id) loadPetResources()
}

/* ---------- 媒体来源 ---------- */
const showMediaSheet = ref(false)
const mediaActions = computed(() => [
  { name: t('user.community.fromAlbum'), key: 'album', disabled: !petId.value },
  { name: t('user.community.fromGallery'), key: 'gallery' },
  { name: t('user.community.takePhoto'), key: 'camera' },
  { name: t('user.community.recordVideo'), key: 'record' },
])

const galleryInput = ref<HTMLInputElement>()
const cameraInput = ref<HTMLInputElement>()
const videoInput = ref<HTMLInputElement>()

function onMediaSelect(action: { key?: string }) {
  showMediaSheet.value = false
  if (action.key === 'album') openAlbumPicker()
  else if (action.key === 'gallery') galleryInput.value?.click()
  else if (action.key === 'camera') cameraInput.value?.click()
  else if (action.key === 'record') videoInput.value?.click()
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function handleFile(file: File) {
  if (file.type.startsWith('video/')) {
    const url = await readFileAsDataURL(file)
    video.value = { url, poster: '' }
    return
  }
  if (images.value.length >= MAX_IMAGES) {
    showToast(t('user.community.maxImages'))
    return
  }
  const url = await readFileAsDataURL(file)
  images.value.push(url)
}

function onGalleryChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  files.forEach((f) => handleFile(f))
}

function onCameraChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) handleFile(file)
}

function onVideoChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) handleFile(file)
}

function removeImage(index: number) {
  images.value.splice(index, 1)
}

function removeVideo() {
  video.value = null
}

/* ---------- 宠物相册选择 ---------- */
const albumVisible = ref(false)
const album = ref<AlbumMedia[]>([])
const albumLoading = ref(false)

function openAlbumPicker() {
  if (!petId.value) return
  albumVisible.value = true
  loadAlbum()
}

async function loadAlbum() {
  if (!petId.value) return
  albumLoading.value = true
  try {
    album.value = await getAlbumApi(petId.value)
  } catch {
    album.value = []
  } finally {
    albumLoading.value = false
  }
}

function pickAlbumMedia(m: AlbumMedia) {
  if (m.type === 'image') {
    if (images.value.includes(m.url)) return
    if (images.value.length >= MAX_IMAGES) {
      showToast(t('user.community.maxImages'))
      return
    }
    images.value.push(m.url)
  } else {
    video.value = { url: m.url || '', poster: m.poster, duration: m.duration }
  }
}

/* ---------- 数据加载 ---------- */
async function loadPetResources() {
  resetAttachData()
  if (!petId.value) return
  const pet = selectedPet.value
  if (!pet) return
  // 健康报告
  getReportListApi({ petId: pet.id })
    .then((list) => {
      reports.value = [...list].sort((a, b) => b.createdAt - a.createdAt)
    })
    .catch(() => (reports.value = []))
  // 体征数据
  getHealthSummaryApi(pet.id)
    .then((s) => (healthSummary.value = s))
    .catch(() => (healthSummary.value = null))
  // 运动数据
  getExerciseSummaryApi(pet.id)
    .then((s) => (exerciseSummary.value = s))
    .catch(() => (exerciseSummary.value = null))
  // 运动轨迹（依赖已绑定设备）
  if (pet.device) {
    getDeviceTrackApi(pet.device.id)
      .then((tr) => (trackPoints.value = tr.points.length))
      .catch(() => (trackPoints.value = null))
  } else {
    trackPoints.value = null
  }
}

function resetAttachData() {
  reports.value = []
  healthSummary.value = null
  exerciseSummary.value = null
  trackPoints.value = null
}

/* ---------- 提交（发布 / 存草稿） ---------- */
function payload(status: 'draft' | 'published'): CommunityPostPayload {
  return {
    petId: petId.value || undefined,
    caption: caption.value,
    images: images.value,
    video: video.value ?? undefined,
    attachments: attachments.value.length ? attachments.value : undefined,
    status,
  }
}

async function submit(status: 'draft' | 'published') {
  if (submitting.value) return
  const text = caption.value.trim()
  if (status === 'published' && !text) {
    showToast(t('user.community.captionRequired'))
    return
  }
  if (status === 'draft' && !text && !images.value.length && !video.value && !attachments.value.length) {
    showToast(t('user.community.emptyContent'))
    return
  }
  submitting.value = true
  try {
    if (editingId) await updateCommunityPostApi(editingId, payload(status))
    else await createCommunityPostApi(payload(status))
    showToast(status === 'published' ? t('user.community.publishSuccess') : t('user.community.draftSaved'))
    router.back()
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  } finally {
    submitting.value = false
  }
}

function publish() {
  submit('published')
}

function saveDraft() {
  submit('draft')
}

/* ---------- 初始化 ---------- */
async function init() {
  loading.value = true
  try {
    pets.value = await getMyPetsApi()
    if (editingId) {
      const post = await getCommunityPostApi(editingId)
      caption.value = post.caption
      petId.value = post.petId ?? ''
      images.value = post.images ?? []
      video.value = post.video ?? null
      attachments.value = post.attachments ?? []
    }
    if (petId.value) await loadPetResources()
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

init()
</script>

<template>
  <div class="compose">
    <van-skeleton v-if="loading" title :row="8" class="compose-skeleton" />

    <template v-else>
      <!-- 分享文案 -->
      <div class="compose-card">
        <van-field
          v-model="caption"
          type="textarea"
          :autosize="{ minHeight: 96, maxHeight: 200 }"
          maxlength="1000"
          show-word-limit
          :placeholder="t('user.community.captionPlaceholder')"
        />
      </div>

      <!-- 关联宠物 -->
      <div class="compose-card">
        <div class="card-title">{{ t('user.community.associatePet') }}</div>
        <div class="pet-row" @click="showPetSheet = true">
          <img v-if="selectedPet" :src="selectedPet.avatar" class="pet-avatar" alt="" />
          <van-icon v-else name="paw-o" class="pet-avatar pet-avatar--empty" />
          <span class="pet-name">{{ selectedPet?.name || t('user.community.noPet') }}</span>
          <van-icon name="arrow" class="pet-arrow" />
        </div>
      </div>

      <!-- 照片 / 视频 -->
      <div class="compose-card">
        <div class="card-title">{{ t('user.community.addMedia') }}</div>
        <div class="media-grid">
          <!-- 视频 -->
          <div v-if="video" class="media-item">
            <img v-if="video.poster" :src="video.poster" class="media-thumb" alt="" />
            <div v-else class="media-thumb media-thumb--video"></div>
            <van-icon name="play" class="media-play" color="#fff" />
            <van-icon name="cross" class="media-remove" @click="removeVideo" />
          </div>
          <!-- 图片 -->
          <div v-for="(img, i) in images" :key="i" class="media-item">
            <img :src="img" class="media-thumb" alt="" />
            <van-icon name="cross" class="media-remove" @click="removeImage(i)" />
          </div>
          <!-- 添加 -->
          <div
            v-if="images.length + (video ? 1 : 0) < MAX_IMAGES"
            class="media-item media-item--add"
            @click="showMediaSheet = true"
          >
            <van-icon name="plus" size="28" color="#c9b98f" />
          </div>
        </div>
      </div>

      <!-- 关联数据 -->
      <div class="compose-card">
        <div class="card-title">{{ t('user.community.associateData') }}</div>
        <template v-if="selectedPet">
          <div v-for="opt in attachOptions" :key="opt.type" class="attach-row">
            <van-icon :name="opt.icon" class="attach-icon" />
            <div class="attach-info">
              <div class="attach-label">{{ t(opt.labelKey) }}</div>
              <div class="attach-summary">{{ opt.disabled ? t('user.community.noDataAttach') : opt.summary }}</div>
            </div>
            <van-switch
              :model-value="isAttached(opt.type)"
              :disabled="opt.disabled"
              active-color="#ff6b00"
              size="20"
              @update:model-value="toggleAttach(opt.type)"
            />
          </div>
        </template>
        <div v-else class="attach-hint">{{ t('user.community.attachHint') }}</div>
      </div>
    </template>

    <!-- 底部操作栏 -->
    <div class="compose-bar">
      <van-button round plain class="draft-btn" :loading="submitting" @click="saveDraft">
        {{ t('user.community.saveDraft') }}
      </van-button>
      <van-button round type="primary" class="publish-btn" :loading="submitting" @click="publish">
        {{ t('user.community.publish') }}
      </van-button>
    </div>

    <!-- 宠物选择 -->
    <van-action-sheet
      v-model:show="showPetSheet"
      :actions="petActions"
      :cancel-text="t('common.cancel')"
      :description="t('user.community.choosePet')"
      @select="onPetSelect"
    />

    <!-- 媒体来源 -->
    <van-action-sheet
      v-model:show="showMediaSheet"
      :actions="mediaActions"
      :cancel-text="t('common.cancel')"
      @select="onMediaSelect"
    />

    <!-- 宠物相册选择 -->
    <van-popup v-model:show="albumVisible" position="bottom" round class="album-popup">
      <div class="album-head">
        <span class="album-title">{{ t('user.community.albumPickTitle') }}</span>
        <van-icon name="cross" class="album-close" @click="albumVisible = false" />
      </div>
      <div class="album-body">
        <van-loading v-if="albumLoading" class="album-loading" />
        <van-empty v-else-if="!album.length" :description="t('user.album.empty')" image-size="60" />
        <div v-else class="album-grid">
          <div v-for="m in album" :key="m.id" class="album-item" @click="pickAlbumMedia(m)">
            <img v-if="m.type === 'image'" :src="m.url" class="album-thumb" alt="" />
            <template v-else>
              <img :src="m.poster" class="album-thumb" alt="" />
              <van-icon name="play" class="album-play" color="#fff" />
            </template>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 隐藏文件输入 -->
    <input
      ref="galleryInput"
      type="file"
      accept="image/*,video/*"
      multiple
      class="hidden-input"
      @change="onGalleryChange"
    />
    <input
      ref="cameraInput"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden-input"
      @change="onCameraChange"
    />
    <input
      ref="videoInput"
      type="file"
      accept="video/*"
      capture="environment"
      class="hidden-input"
      @change="onVideoChange"
    />
  </div>
</template>

<style scoped lang="scss">
.compose {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--sp-bg);
  box-sizing: border-box;
}

.compose-skeleton {
  margin: 16px;
}

.compose-card {
  margin: 12px 14px 0;
  padding: 14px;
  background: #fff;
  border-radius: 16px;
}

.card-title {
  font-size: 14px;
  font-weight: 700;
  color: #2b2b2b;
  margin-bottom: 12px;
}

/* 关联宠物 */
.pet-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  cursor: pointer;

  .pet-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    object-fit: cover;
    background: #f6f0e3;

    &--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      color: #c9b98f;
    }
  }

  .pet-name {
    flex: 1;
    font-size: 15px;
    color: #2b2b2b;
  }

  .pet-arrow {
    color: #c9b98f;
  }
}

/* 媒体九宫格 */
.media-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;

  .media-item {
    position: relative;
    aspect-ratio: 1;
    border-radius: 10px;
    overflow: hidden;
    background: var(--sp-bg);

    .media-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;

      &--video {
        background: #333;
      }
    }

    .media-play {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 26px;
    }

    .media-remove {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.5);
      color: #fff;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    &--add {
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px dashed #e6d9bc;
      background: #fff;
      cursor: pointer;
    }
  }
}

/* 关联数据 */
.attach-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;

  & + .attach-row {
    border-top: 1px solid #f5efdf;
  }

  .attach-icon {
    font-size: 20px;
    color: #ff6b00;
    flex-shrink: 0;
  }

  .attach-info {
    flex: 1;
    min-width: 0;
  }

  .attach-label {
    font-size: 14px;
    color: #2b2b2b;
  }

  .attach-summary {
    margin-top: 2px;
    font-size: 12px;
    color: #8a7a5a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.attach-hint {
  font-size: 13px;
  color: #c4b48c;
  padding: 6px 0;
}

/* 底部操作栏：sticky 固定在可视区域底部，随内容滚动时始终可见 */
.compose-bar {
  position: sticky;
  bottom: 0;
  margin-top: auto;
  z-index: 20;
  display: flex;
  gap: 12px;
  padding: 10px 14px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid var(--sp-border);

  .draft-btn {
    flex: 1;
  }

  .publish-btn {
    flex: 1;
    background: linear-gradient(135deg, #ff8c42 0%, #ff6b00 100%);
    border: none;
  }
}

.hidden-input {
  display: none;
}

/* 宠物相册弹层 */
.album-popup {
  .album-head {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    height: 50px;
    border-bottom: 1px solid var(--sp-border);

    .album-title {
      font-size: 16px;
      font-weight: 700;
    }

    .album-close {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 18px;
      color: #8a7a5a;
      cursor: pointer;
    }
  }

  .album-body {
    max-height: 46vh;
    overflow-y: auto;
    padding: 12px 14px;
  }

  .album-loading {
    padding: 24px 0;
    text-align: center;
  }

  .album-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;

    .album-item {
      position: relative;
      aspect-ratio: 1;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;

      .album-thumb {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .album-play {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  }
}
</style>

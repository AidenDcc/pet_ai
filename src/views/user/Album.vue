<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { showToast, showDialog } from 'vant'
import { getMyPetsApi, type PetJoined } from '@/api/modules/pet'
import {
  getAlbumApi,
  addAlbumMediaApi,
  getAlbumTrashApi,
  trashAlbumMediaApi,
  restoreAlbumMediaApi,
  deleteAlbumMediaApi,
} from '@/api/modules/album'
import { relativeTime } from '@/utils/format'
import type { AlbumMedia } from '@/types'

const { t } = useI18n()

const MAX_SIZE = 5 * 1024 * 1024

const pets = ref<PetJoined[]>([])
const activePetId = ref('')
const media = ref<AlbumMedia[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    if (!pets.value.length) {
      pets.value = await getMyPetsApi()
      if (!activePetId.value && pets.value.length) activePetId.value = pets.value[0].id
    }
    media.value = activePetId.value ? await getAlbumApi(activePetId.value) : []
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

function onTabChange() {
  load()
}

/* ---------- 全屏预览（图片 / 视频左右滑动切换） ---------- */
const viewerVisible = ref(false)
const viewerIndex = ref(0)
const swipeIndex = ref(0)

function openViewer(index: number) {
  viewerIndex.value = index
  swipeIndex.value = index
  viewerVisible.value = true
}

function closeViewer() {
  viewerVisible.value = false
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/* ---------- 「记录」新增照片（本地上传 / 相机拍照） ---------- */
const showRecordSheet = ref(false)
const recordActions = [
  { name: t('user.album.takePhoto'), key: 'camera' },
  { name: t('user.album.upload'), key: 'gallery' },
]
const cameraInput = ref<HTMLInputElement>()
const galleryInput = ref<HTMLInputElement>()

function onRecordSelect(action: { key?: string }) {
  showRecordSheet.value = false
  if (action.key === 'camera') cameraInput.value?.click()
  else galleryInput.value?.click()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // 重置，便于再次选择同一文件
  if (!file) return
  if (file.size > MAX_SIZE) {
    showToast(t('user.album.tooLarge'))
    return
  }
  const reader = new FileReader()
  reader.onload = () => addMedia(reader.result as string)
  reader.readAsDataURL(file)
}

async function addMedia(url: string) {
  if (!activePetId.value) return
  try {
    const item = await addAlbumMediaApi({ petId: activePetId.value, url })
    media.value.unshift(item)
    showToast(t('user.album.addSuccess'))
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  }
}

/* ---------- 删除 / 回收站 ---------- */
const trashVisible = ref(false)
const trashList = ref<AlbumMedia[]>([])
const trashLoading = ref(false)

async function loadTrash() {
  trashLoading.value = true
  try {
    trashList.value = await getAlbumTrashApi()
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    trashLoading.value = false
  }
}

async function openTrash() {
  trashVisible.value = true
  await loadTrash()
}

function closeTrash() {
  trashVisible.value = false
}

function petNameOf(petId: string): string {
  return pets.value.find((p) => p.id === petId)?.name ?? ''
}

function trashThumb(m: AlbumMedia): string {
  return m.type === 'image' ? m.url : m.poster || m.url
}

async function doTrashCurrent() {
  const m = media.value[swipeIndex.value]
  if (!m) return
  try {
    await showDialog({
      title: t('common.confirmDelete'),
      message: t('user.album.deleteConfirm'),
      confirmButtonText: t('common.delete'),
      cancelButtonText: t('common.cancel'),
      confirmButtonColor: '#ff6b6b',
    })
  } catch {
    return
  }
  try {
    await trashAlbumMediaApi(m.id)
    media.value = media.value.filter((x) => x.id !== m.id)
    closeViewer()
    showToast(t('user.album.deletedToTrash'))
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  }
}

async function restoreMedia(m: AlbumMedia) {
  try {
    await restoreAlbumMediaApi(m.id)
    trashList.value = trashList.value.filter((x) => x.id !== m.id)
    if (m.petId === activePetId.value) await load()
    showToast(t('user.album.restoreSuccess'))
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  }
}

async function permanentDelete(m: AlbumMedia) {
  try {
    await showDialog({
      title: t('common.confirmDelete'),
      message: t('user.album.permanentDeleteConfirm'),
      confirmButtonText: t('common.delete'),
      cancelButtonText: t('common.cancel'),
      confirmButtonColor: '#ff6b6b',
    })
  } catch {
    return
  }
  try {
    await deleteAlbumMediaApi(m.id)
    trashList.value = trashList.value.filter((x) => x.id !== m.id)
    showToast(t('user.album.permanentDeleteSuccess'))
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  }
}

load()
</script>

<template>
  <div class="album-page">
    <!-- 顶部：回收站入口 -->
    <div class="album-topbar">
      <button class="trash-entry" type="button" @click="openTrash">
        <van-icon name="delete-o" size="16" />
        <span>{{ t('user.album.trash') }}</span>
      </button>
    </div>

    <!-- 宠物切换 -->
    <van-tabs
      v-if="pets.length"
      v-model:active="activePetId"
      sticky
      :offset-top="0"
      @change="onTabChange"
    >
      <van-tab v-for="p in pets" :key="p.id" :name="p.id" :title="p.name" />
    </van-tabs>

    <van-skeleton v-if="loading" title :row="6" class="mt-16" />

    <template v-else-if="media.length">
      <div class="media-grid">
        <div v-for="(m, i) in media" :key="m.id" class="media-item" @click="openViewer(i)">
          <img v-if="m.type === 'image'" :src="m.url" class="media-thumb" alt="" />
          <div v-else class="media-thumb media-thumb--video">
            <img :src="m.poster" class="media-thumb-img" alt="" />
            <span class="media-play"><van-icon name="play" color="#fff" /></span>
            <span v-if="m.duration" class="media-duration">{{ fmtDuration(m.duration) }}</span>
          </div>
        </div>
      </div>
    </template>

    <van-empty v-else :description="t('user.album.empty')" />

    <!-- 右下角「记录」悬浮按钮 -->
    <div class="fab-bar">
      <button class="fab" type="button" @click="showRecordSheet = true">
        <van-icon name="photograph" size="18" />
        <span>{{ t('user.album.record') }}</span>
      </button>
    </div>

    <!-- 新增照片方式选择 -->
    <van-action-sheet
      v-model:show="showRecordSheet"
      :actions="recordActions"
      :cancel-text="t('common.cancel')"
      @select="onRecordSelect"
    />

    <!-- 隐藏文件输入：相机 / 相册 -->
    <input
      ref="cameraInput"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden-input"
      @change="onFileChange"
    />
    <input
      ref="galleryInput"
      type="file"
      accept="image/*"
      class="hidden-input"
      @change="onFileChange"
    />

    <!-- 全屏预览：左右滑动切换图片 / 视频 -->
    <div v-if="viewerVisible" class="viewer">
      <div class="viewer-bar">
        <span class="viewer-count">{{ swipeIndex + 1 }} / {{ media.length }}</span>
      </div>
      <van-swipe
        :initial-swipe="viewerIndex"
        :show-indicators="false"
        class="viewer-swipe"
        @change="(idx) => (swipeIndex = idx)"
      >
        <van-swipe-item v-for="m in media" :key="m.id">
          <div class="viewer-slide">
            <img v-if="m.type === 'image'" :src="m.url" class="viewer-img" @click="closeViewer" />
            <video
              v-else-if="m.url"
              :src="m.url"
              :poster="m.poster"
              controls
              playsinline
              webkit-playsinline
              class="viewer-video"
            ></video>
            <div v-else class="viewer-video-fallback" :style="{ backgroundImage: `url(${m.poster})` }">
              <van-icon name="play-circle-o" size="64" color="rgba(255,255,255,0.9)" />
            </div>
          </div>
        </van-swipe-item>
      </van-swipe>

      <div class="viewer-bottom">
        <van-icon name="delete-o" size="24" color="#fff" class="viewer-delete" @click="doTrashCurrent" />
        <van-icon name="cross" size="26" color="#fff" class="viewer-close" @click="closeViewer" />
      </div>
    </div>

    <!-- 回收站 -->
    <div v-if="trashVisible" class="trash-overlay">
      <div class="trash-bar">
        <van-icon name="arrow-left" size="20" class="trash-back" @click="closeTrash" />
        <span class="trash-title">{{ t('user.album.trashTitle') }}</span>
      </div>
      <div class="trash-body">
        <van-skeleton v-if="trashLoading" title :row="4" class="trash-skeleton" />
        <template v-else-if="trashList.length">
          <div v-for="m in trashList" :key="m.id" class="trash-item">
            <img class="trash-thumb" :src="trashThumb(m)" alt="" />
            <div class="trash-info">
              <div class="trash-pet">{{ petNameOf(m.petId) }}</div>
              <div class="trash-time">{{ relativeTime(m.deletedAt ?? m.createdAt) }}</div>
            </div>
            <div class="trash-actions">
              <van-button size="small" round plain type="primary" @click="restoreMedia(m)">
                {{ t('user.album.restore') }}
              </van-button>
              <van-button size="small" round plain type="danger" @click="permanentDelete(m)">
                {{ t('user.album.permanentDelete') }}
              </van-button>
            </div>
          </div>
          <div class="trash-hint">{{ t('user.album.trashExpireHint') }}</div>
        </template>
        <van-empty v-else :description="t('user.album.trashEmpty')" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.album-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  box-sizing: border-box;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 10px 10px 0;

  .media-item {
    aspect-ratio: 1;
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    background: var(--sp-bg);
  }

  .media-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;

    &--video {
      position: relative;
    }

    &-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  .media-play {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .media-duration {
    position: absolute;
    right: 4px;
    bottom: 4px;
    padding: 1px 6px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    font-size: 11px;
    line-height: 1.4;
  }
}

.mt-16 {
  margin-top: 16px;
}

/* ---- 右下角悬浮「记录」按钮 ---- */
.fab-bar {
  position: sticky;
  bottom: 12px;
  margin-top: auto;
  padding: 16px 10px 4px;
  display: flex;
  justify-content: flex-end;
  pointer-events: none;
}

.fab {
  pointer-events: auto;
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

.hidden-input {
  display: none;
}

/* ---- 全屏预览 ---- */
.viewer {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: #000;
  display: flex;
  flex-direction: column;
}

.viewer-bar {
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  color: #fff;

  .viewer-count {
    font-size: 15px;
    letter-spacing: 1px;
  }
}

.viewer-swipe {
  flex: 1;
  min-height: 0;

  :deep(.van-swipe__track) {
    height: 100%;
  }
}

.viewer-slide {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.viewer-video {
  max-width: 100%;
  max-height: 100%;
  outline: none;
}

.viewer-video-fallback {
  width: 100%;
  height: 100%;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 底部操作：删除 + 关闭，居中、距底部 28px */
.viewer-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 56px;
  z-index: 1;

  .viewer-delete,
  .viewer-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.45);
    cursor: pointer;
  }
}

/* ---- 顶部回收站入口 ---- */
.album-topbar {
  display: flex;
  justify-content: flex-end;
  padding: 8px 10px 0;
}

.trash-entry {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: #8a7a5a;
  font-size: 13px;
  padding: 6px 10px;
  cursor: pointer;
}

/* ---- 回收站覆盖层 ---- */
.trash-overlay {
  position: fixed;
  inset: 0;
  z-index: 290;
  background: #fbf3e3;
  display: flex;
  flex-direction: column;
}

.trash-bar {
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  background: #fff;
  border-bottom: 1px solid var(--sp-border);

  .trash-back {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
  }

  .trash-title {
    font-size: 16px;
    font-weight: 700;
  }
}

.trash-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 12px 14px;
}

.trash-skeleton {
  margin-top: 8px;
}

.trash-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 12px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);

  .trash-thumb {
    width: 56px;
    height: 56px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
    background: var(--sp-bg);
  }

  .trash-info {
    flex: 1;
    min-width: 0;

    .trash-pet {
      font-size: 14px;
      font-weight: 600;
      color: #2b2b2b;
    }

    .trash-time {
      margin-top: 3px;
      font-size: 12px;
      color: var(--sp-text-placeholder);
    }
  }

  .trash-actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
  }
}

.trash-hint {
  margin-top: 6px;
  text-align: center;
  font-size: 12px;
  color: var(--sp-text-placeholder);
}
</style>

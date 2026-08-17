<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import type { UploaderFileListItem } from 'vant'
import {
  getFaqApi,
  submitFeedbackApi,
  getFeedbackHistoryApi,
  type FaqItemDto,
} from '@/api/modules/settings'
import type { FeedbackItem } from '@/types'
import { formatTime } from '@/utils/format'

const { t, locale } = useI18n()

const activeTab = ref(0)

/** 按当前语言取双语文本 */
function pickText(bi: { zh: string; en: string }): string {
  return locale.value === 'zh-CN' ? bi.zh : bi.en
}

/* ---------- 常见问题 ---------- */
const faqs = ref<FaqItemDto[]>([])
const faqActive = ref<string>('')

async function loadFaqs() {
  try {
    faqs.value = await getFaqApi()
  } catch {
    // 保持空态
  }
}

/* ---------- 意见反馈表单 ---------- */
const subject = ref('')
const content = ref('')
const images = ref<string[]>([])
const fileList = ref<UploaderFileListItem[]>([])
const MAX_IMAGES = 6
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const submitting = ref(false)

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

/* ---------- 历史记录 ---------- */
const history = ref<FeedbackItem[]>([])

async function loadHistory() {
  try {
    history.value = await getFeedbackHistoryApi()
  } catch {
    history.value = []
  }
}

async function onTabChange(name: number | string) {
  activeTab.value = Number(name)
  if (activeTab.value === 2) await loadHistory()
}

async function doSubmit() {
  if (!subject.value.trim()) {
    showToast(t('user.feedback.subjectRequired'))
    return
  }
  if (!content.value.trim()) {
    showToast(t('user.feedback.contentPlaceholder'))
    return
  }
  submitting.value = true
  try {
    await submitFeedbackApi({
      subject: subject.value.trim(),
      content: content.value.trim(),
      images: images.value,
    })
    showToast(t('user.feedback.submitSuccess'))
    subject.value = ''
    content.value = ''
    images.value = []
    fileList.value = []
    activeTab.value = 2
    await loadHistory()
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadFaqs()
  loadHistory()
})
</script>

<template>
  <div class="feedback-page">
    <van-tabs v-model:active="activeTab" color="#00b4a6" @change="onTabChange">
      <!-- 常见问题 -->
      <van-tab :title="t('user.feedback.tabFaq')">
        <div v-if="faqs.length" class="faq-wrap">
          <van-collapse v-model="faqActive" accordion :border="false">
            <van-collapse-item
              v-for="q in faqs"
              :key="q.id"
              :name="q.id"
              :title="pickText(q.question)"
            >
              <div class="faq-answer">{{ pickText(q.answer) }}</div>
            </van-collapse-item>
          </van-collapse>
        </div>
        <van-empty v-else :description="t('common.empty')" />
      </van-tab>

      <!-- 意见反馈 -->
      <van-tab :title="t('user.feedback.tabSubmit')">
        <div class="sp-card form-card">
          <van-field
            v-model="subject"
            :label="t('user.feedback.subject')"
            :placeholder="t('user.feedback.subjectPlaceholder')"
            maxlength="30"
            clearable
          />
          <van-field
            v-model="content"
            type="textarea"
            rows="4"
            autosize
            maxlength="500"
            show-word-limit
            :label="t('user.feedback.content')"
            :placeholder="t('user.feedback.contentPlaceholder')"
          />
          <div class="uploader-block">
            <div class="uploader-block__label">{{ t('user.feedback.imageLabel') }}</div>
            <div class="uploader-block__hint">{{ t('user.feedback.imageHint') }}</div>
            <van-uploader
              v-model="fileList"
              :max-count="MAX_IMAGES"
              :after-read="afterRead"
              @delete="onDelete"
              :preview-full-image="false"
            />
          </div>
        </div>
        <div class="submit-bar">
          <van-button block round type="primary" size="large" color="#00b4a6" :loading="submitting" @click="doSubmit">
            {{ t('user.feedback.submit') }}
          </van-button>
        </div>
      </van-tab>

      <!-- 历史记录 -->
      <van-tab :title="t('user.feedback.tabHistory')">
        <div v-if="history.length" class="history-list">
          <div v-for="h in history" :key="h.id" class="sp-card history-item">
            <div class="history-item__head">
              <span class="history-item__subject">{{ h.subject }}</span>
              <van-tag
                round
                :type="h.status === 'processed' ? 'success' : 'warning'"
                :plain="h.status !== 'processed'"
              >
                {{ t(h.status === 'processed' ? 'user.feedback.statusProcessed' : 'user.feedback.statusPending') }}
              </van-tag>
            </div>
            <div class="history-item__content">{{ h.content }}</div>
            <div v-if="h.images?.length" class="history-item__imgs">
              <img v-for="(img, i) in h.images" :key="i" :src="img" alt="" />
            </div>
            <div class="history-item__time">{{ t('user.feedback.at', { time: formatTime(h.createdAt, 'YYYY-MM-DD HH:mm') }) }}</div>
          </div>
        </div>
        <van-empty v-else :description="t('user.feedback.emptyHistory')" />
      </van-tab>
    </van-tabs>
  </div>
</template>

<style scoped lang="scss">
.feedback-page {
  min-height: 100%;
  box-sizing: border-box;
  background: #eef7f6;

  :deep(.van-tabs__nav) {
    background: #eef7f6;
  }
  :deep(.van-tabs__line) {
    background-color: #00b4a6;
  }
  :deep(.van-tab) {
    color: #5e8580;
    &.van-tab--active {
      color: #14403c;
      font-weight: 600;
    }
  }
}

/* ---- 常见问题 ---- */
.faq-wrap {
  padding: 12px 14px 20px;

  :deep(.van-collapse-item__content) {
    color: #3a4d4b;
    font-size: 13px;
    line-height: 1.7;
    background: #f2faf9;
  }
  :deep(.van-collapse-item__title) {
    font-size: 14px;
    color: #1f2d3d;
    background: #fff;
  }
}

/* ---- 意见反馈表单 ---- */
.form-card {
  margin: 14px;
  padding: 6px 0;
  overflow: hidden;

  .uploader-block {
    padding: 14px 16px;
    border-top: 1px solid #e6f2f0;

    &__label {
      font-size: 14px;
      color: #1f2d3d;
    }

    &__hint {
      margin: 4px 0 12px;
      font-size: 12px;
      color: #8aa8a4;
    }
  }
}

.submit-bar {
  padding: 8px 14px 30px;
}

/* ---- 历史记录 ---- */
.history-list {
  padding: 12px 14px 24px;

  .history-item {
    padding: 14px;
    margin-top: 12px;

    &:first-child {
      margin-top: 0;
    }

    &__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    &__subject {
      font-size: 15px;
      font-weight: 700;
      color: #1f2d3d;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__content {
      margin-top: 8px;
      font-size: 13px;
      color: #3a4d4b;
      line-height: 1.6;
    }

    &__imgs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;

      img {
        width: 64px;
        height: 64px;
        border-radius: 8px;
        object-fit: cover;
      }
    }

    &__time {
      margin-top: 10px;
      font-size: 12px;
      color: #8aa8a4;
    }
  }
}
</style>

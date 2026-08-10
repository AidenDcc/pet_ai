<script setup lang="ts">
import { ref, watch } from 'vue'
import { showToast } from 'vant'
import type { UploaderFileListItem } from 'vant'
import { useI18n } from 'vue-i18n'

/** 宠物头像上传：modelValue 为图片 dataURL，空串表示未设置（mock 端自动生成默认头像） */
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t } = useI18n()
const MAX_SIZE = 2 * 1024 * 1024

const fileList = ref<UploaderFileListItem[]>([])

// 外部回填（编辑场景）：modelValue → 预览列表
watch(
  () => props.modelValue,
  (v) => {
    if (!v) {
      fileList.value = []
      return
    }
    if (!fileList.value.some((f) => f.url === v)) {
      fileList.value = [{ url: v, isImage: true, reupload: true }]
    }
  },
  { immediate: true },
)

function afterRead(item: UploaderFileListItem | UploaderFileListItem[]) {
  const file = Array.isArray(item) ? item[0]?.file : item.file
  if (!file) return
  if (file.size > MAX_SIZE) {
    showToast(t('user.petCare.avatarTooLarge'))
    fileList.value = []
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const url = reader.result as string
    fileList.value = [{ url, isImage: true, reupload: true }]
    emit('update:modelValue', url)
  }
  reader.readAsDataURL(file)
}

function onDelete() {
  fileList.value = []
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="pet-avatar-uploader">
    <van-uploader
      v-model="fileList"
      :max-count="1"
      :after-read="afterRead"
      accept="image/*"
      @delete="onDelete"
    />
    <span class="avatar-hint">{{ t('user.petCare.avatarHint') }}</span>
  </div>
</template>

<style scoped lang="scss">
.pet-avatar-uploader {
  display: flex;
  align-items: center;
  gap: 12px;

  .avatar-hint {
    font-size: 12px;
    color: var(--sp-text-placeholder);
  }
}
</style>

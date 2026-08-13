<script setup lang="ts">
import { ref } from 'vue'
import { showToast } from 'vant'
import { useI18n } from 'vue-i18n'
import type { VaccineRecord, DewormRecord } from '@/types'

/** 疫苗 / 驱虫 / 性格标签 维护区：新增/删除通过 update 事件通知父组件，行内字段直接响应式修改 */
const props = defineProps<{
  vaccines: VaccineRecord[]
  dewormings: DewormRecord[]
  personalityTags: string[]
}>()
const emit = defineEmits<{
  'update:vaccines': [value: VaccineRecord[]]
  'update:dewormings': [value: DewormRecord[]]
  'update:personalityTags': [value: string[]]
}>()

const { t } = useI18n()
const MAX_TAGS = 10

const rid = () => `r_${Math.random().toString(36).slice(2, 8)}`
const today = () => new Date().toISOString().slice(0, 10)

/* ---- 疫苗 ---- */
function addVaccine() {
  emit('update:vaccines', [...props.vaccines, { id: rid(), name: '', date: today() }])
}
function removeVaccine(i: number) {
  const next = [...props.vaccines]
  next.splice(i, 1)
  emit('update:vaccines', next)
}

/* ---- 驱虫 ---- */
function addDeworm() {
  emit('update:dewormings', [...props.dewormings, { id: rid(), name: '', date: today() }])
}
function removeDeworm(i: number) {
  const next = [...props.dewormings]
  next.splice(i, 1)
  emit('update:dewormings', next)
}

/* ---- 性格标签（最多 10 个） ---- */
const tagInput = ref('')
function addTag() {
  const tag = tagInput.value.trim()
  if (!tag) {
    showToast(t('user.petCare.tagEmpty'))
    return
  }
  if (props.personalityTags.length >= MAX_TAGS) {
    showToast(t('user.petCare.tagMaxToast'))
    return
  }
  if (props.personalityTags.includes(tag)) {
    showToast(t('user.petCare.tagDuplicate'))
    return
  }
  emit('update:personalityTags', [...props.personalityTags, tag])
  tagInput.value = ''
}
function removeTag(i: number) {
  const next = [...props.personalityTags]
  next.splice(i, 1)
  emit('update:personalityTags', next)
}
</script>

<template>
  <div class="pet-care-sections">
    <!-- 疫苗 -->
    <section class="care-card">
      <div class="care-head">
        <span class="care-title">
          <van-icon name="checked" class="care-icon" />
          {{ t('user.petCare.vaccines') }}
        </span>
        <span class="care-count">{{ vaccines.length }}</span>
        <van-button
          size="mini"
          round
          plain
          type="primary"
          icon="plus"
          class="care-add"
          @click="addVaccine"
        >
          {{ t('user.petCare.addVaccine') }}
        </van-button>
      </div>
      <div v-if="!vaccines.length" class="care-empty">{{ t('user.petCare.emptyVaccines') }}</div>
      <!-- 记录行左滑显示删除按钮 -->
      <van-swipe-cell v-for="(rec, i) in vaccines" :key="rec.id">
        <div class="record-row">
          <van-field
            v-model="rec.name"
            class="rec-name"
            :placeholder="t('user.petCare.recordNamePlaceholder')"
            :maxlength="30"
          />
          <van-field v-model="rec.date" type="date" class="rec-date" />
        </div>
        <template #right>
          <div class="rec-del">
            <van-button square type="danger" class="rec-del-btn" @click="removeVaccine(i)">
              {{ t('common.delete') }}
            </van-button>
          </div>
        </template>
      </van-swipe-cell>
    </section>

    <!-- 驱虫 -->
    <section class="care-card">
      <div class="care-head">
        <span class="care-title">
          <van-icon name="shield-o" class="care-icon" />
          {{ t('user.petCare.dewormings') }}
        </span>
        <span class="care-count">{{ dewormings.length }}</span>
        <van-button
          size="mini"
          round
          plain
          type="primary"
          icon="plus"
          class="care-add"
          @click="addDeworm"
        >
          {{ t('user.petCare.addDeworm') }}
        </van-button>
      </div>
      <div v-if="!dewormings.length" class="care-empty">{{ t('user.petCare.emptyDewormings') }}</div>
      <!-- 记录行左滑显示删除按钮 -->
      <van-swipe-cell v-for="(rec, i) in dewormings" :key="rec.id">
        <div class="record-row">
          <van-field
            v-model="rec.name"
            class="rec-name"
            :placeholder="t('user.petCare.recordNamePlaceholder')"
            :maxlength="30"
          />
          <van-field v-model="rec.date" type="date" class="rec-date" />
        </div>
        <template #right>
          <div class="rec-del">
            <van-button square type="danger" class="rec-del-btn" @click="removeDeworm(i)">
              {{ t('common.delete') }}
            </van-button>
          </div>
        </template>
      </van-swipe-cell>
    </section>

    <!-- 性格标签 -->
    <section class="care-card">
      <div class="care-head">
        <span class="care-title">
          <van-icon name="friends-o" class="care-icon" />
          {{ t('user.petCare.personalityTags') }}
        </span>
        <span class="care-count">{{ personalityTags.length }}/{{ MAX_TAGS }}</span>
      </div>
      <div v-if="!personalityTags.length" class="care-empty">{{ t('user.petCare.emptyTags') }}</div>
      <div class="tag-list">
        <van-tag
          v-for="(tag, i) in personalityTags"
          :key="tag"
          round
          closeable
          size="medium"
          color="#fff3d4"
          text-color="#7a4e12"
          @close="removeTag(i)"
        >
          {{ tag }}
        </van-tag>
      </div>
      <div class="tag-add">
        <van-field
          v-model="tagInput"
          class="tag-input"
          :placeholder="t('user.petCare.tagPlaceholder')"
          :maxlength="8"
          @keyup.enter="addTag"
        />
        <van-button
          size="small"
          round
          type="primary"
          :disabled="personalityTags.length >= MAX_TAGS"
          @click="addTag"
        >
          {{ t('common.add') }}
        </van-button>
      </div>
      <div v-if="personalityTags.length >= MAX_TAGS" class="tag-max">
        {{ t('user.petCare.tagMaxHint') }}
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.pet-care-sections {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.care-card {
  background: var(--sp-card-bg, #fff);
  border-radius: 12px;
  padding: 12px 14px;

  .care-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    .care-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--sp-text);
      display: flex;
      align-items: center;
      gap: 6px;

      .care-icon {
        color: var(--sp-primary);
      }
    }

    .care-count {
      font-size: 12px;
      color: var(--sp-text-placeholder);
    }
  }

  .care-empty {
    padding: 10px 0;
    font-size: 12px;
    color: var(--sp-text-placeholder);
  }

  .care-add {
    margin-left: auto;
    flex-shrink: 0;
  }
}

.record-row {
  display: flex;
  align-items: center;
  gap: 6px;

  :deep(.van-field) {
    background: var(--sp-bg);
    border-radius: 8px;
    padding: 6px 10px;

    .van-field__control {
      font-size: 13px;
    }
  }

  .rec-name {
    flex: 1.5;
    min-width: 0;
  }

  .rec-date {
    flex: 1;
    min-width: 0;
  }

  .rec-del {
    display: flex;
    height: 100%;

    .rec-del-btn {
      width: 68px;
      height: 100%;
      border: none;
      border-radius: 0;
      font-size: 13px;
    }
  }
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 0 10px;
}

.tag-add {
  display: flex;
  align-items: center;
  gap: 8px;

  :deep(.van-field) {
    flex: 1;
    background: var(--sp-bg);
    border-radius: 8px;
    padding: 6px 10px;

    .van-field__control {
      font-size: 13px;
    }
  }
}

.tag-max {
  margin-top: 6px;
  font-size: 12px;
  color: var(--sp-primary);
}
</style>

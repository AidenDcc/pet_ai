<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getAgreementApi } from '@/api/modules/settings'

const route = useRoute()
const { t, locale } = useI18n()

const type = String(route.params.type ?? '')
const loading = ref(false)
const title = ref('')
const updatedAt = ref('')
const paragraphs = ref<string[]>([])

function isHeading(p: string): boolean {
  return (
    /^[一二三四五六七八九十]+、/.test(p) ||
    /^\d+\.\s/.test(p) ||
    /^[IVX]+\.\s/.test(p)
  )
}

async function load() {
  if (!type) return
  loading.value = true
  try {
    const detail = await getAgreementApi(type)
    title.value = locale.value === 'zh-CN' ? detail.title.zh : detail.title.en
    updatedAt.value = detail.updatedAt
    paragraphs.value = detail.paragraphs[locale.value === 'zh-CN' ? 'zh' : 'en']
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <div class="service-detail">
    <van-skeleton v-if="loading" :title="false" :row="10" />
    <div v-else class="service-detail__body">
      <h2 class="service-detail__title">{{ title }}</h2>
      <div class="service-detail__date">{{ t('user.services.updated', { date: updatedAt }) }}</div>
      <div class="service-detail__content">
        <p
          v-for="(p, i) in paragraphs"
          :key="i"
          class="service-detail__p"
          :class="{ 'service-detail__p--heading': isHeading(p) }"
        >
          {{ p }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.service-detail {
  min-height: 100%;
  box-sizing: border-box;
  padding: 16px 14px 40px;
  background: #eef7f6;

  &__body {
    background: #fff;
    border-radius: 20px;
    padding: 22px 20px 30px;
  }

  &__title {
    font-size: 20px;
    font-weight: 800;
    color: #14403c;
    text-align: center;
    margin: 0;
  }

  &__date {
    margin-top: 8px;
    text-align: center;
    font-size: 12px;
    color: #8aa8a4;
  }

  &__content {
    margin-top: 18px;

    .service-detail__p {
      font-size: 14px;
      line-height: 1.9;
      color: #3a4d4b;
      margin-bottom: 12px;
      text-align: justify;

      &--heading {
        font-weight: 700;
        color: #1f2d3d;
        margin-top: 6px;
      }
    }
  }
}
</style>

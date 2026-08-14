<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getAgreementsApi, type AgreementMetaDto } from '@/api/modules/settings'

const router = useRouter()
const { t, locale } = useI18n()

const agreements = ref<AgreementMetaDto[]>([])
const loading = ref(false)

function pickText(bi: { zh: string; en: string }): string {
  return locale.value === 'zh-CN' ? bi.zh : bi.en
}

async function load() {
  loading.value = true
  try {
    agreements.value = await getAgreementsApi()
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <div class="services-page">
    <van-skeleton v-if="loading" :title="false" :row="6" />
    <template v-else>
      <SettingList
        :items="
          agreements.map((a) => ({
            key: a.type,
            label: pickText(a.title),
            icon: 'description-o',
            onClick: () => router.push(`/user/settings/services/${a.type}`),
          }))
        "
      />
      <div class="services-hint">{{ t('user.services.serviceDetail') }}</div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.services-page {
  min-height: 100%;
  box-sizing: border-box;
  padding-bottom: 40px;
  background: #fbf3e3;
}

.services-hint {
  margin-top: 18px;
  text-align: center;
  font-size: 11px;
  color: #c4b48c;
}
</style>

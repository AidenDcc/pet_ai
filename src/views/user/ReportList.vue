<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getMyPetsApi, type PetJoined } from '@/api/modules/pet'
import { getReportListApi, type ReportJoined } from '@/api/modules/report'
import { SPECIES_ICON } from '@/utils/consts'

const router = useRouter()
const { t } = useI18n()
const pets = ref<PetJoined[]>([])
const activeIndex = ref(0)
const reports = ref<ReportJoined[]>([])
const loading = ref(false)

async function loadPets() {
  try {
    pets.value = await getMyPetsApi()
    await loadReports()
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  }
}

async function loadReports() {
  loading.value = true
  try {
    const pet = pets.value[activeIndex.value]
    reports.value = pet ? await getReportListApi({ petId: pet.id }) : []
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

function onPetChange(index: number) {
  activeIndex.value = index
  loadReports().catch(() => undefined)
}

function reviewLabel(r: ReportJoined) {
  if (r.doctorReview === 'pending') return { labelKey: 'user.reports.pendingReview', type: 'warning' as const }
  if (r.doctorReview === 'approved') return { labelKey: 'user.reports.approved', type: 'success' as const }
  if (r.doctorReview === 'rejected') return { labelKey: 'user.reports.rejected', type: 'danger' as const }
  return { labelKey: 'user.reports.ai', type: 'primary' as const }
}

loadPets()
</script>

<template>
  <div class="reports">
    <van-tabs v-if="pets.length > 1" v-model:active="activeIndex" color="#ff6b00" class="pet-tabs" @change="onPetChange">
      <van-tab v-for="p in pets" :key="p.id" :title="p.name" />
    </van-tabs>

    <van-skeleton :loading="loading" :row="4" />

    <div
      v-for="r in reports"
      :key="r.id"
      class="report-card sp-card"
      @click="router.push(`/user/reports/${r.id}`)"
    >
      <div class="report-top">
        <div class="report-icon">{{ SPECIES_ICON[r.species] }}</div>
        <div class="report-main">
          <div class="report-period">{{ r.period }}</div>
          <div class="report-summary ellipsis">{{ r.summary }}</div>
        </div>
        <div class="report-score">
          <div class="score-num" :class="{ warn: r.score < 85 }">{{ r.score }}</div>
          <div class="score-label">{{ t('user.reports.score') }}</div>
        </div>
      </div>
      <div class="report-bottom">
        <van-tag v-if="r.abnormal.length" round type="warning">{{ t('user.reports.abnormalCount', { n: r.abnormal.length }) }}</van-tag>
        <van-tag v-else round type="success">{{ t('user.reports.normal') }}</van-tag>
        <van-tag round :type="reviewLabel(r).type">{{ t(reviewLabel(r).labelKey) }}</van-tag>
      </div>
    </div>

    <van-empty v-if="!loading && !reports.length" :description="t('user.reports.empty')" />
  </div>
</template>

<style scoped lang="scss">
.reports {
  padding: 16px 14px;
  padding-top: 0;
}
.pet-tabs {
  margin-bottom: 12px;
  :deep(.van-tabs__wrap) {
    background: #fff;
    border-radius: 12px;
  }
}
.report-card {
  padding: 14px;
  margin-bottom: 12px;
  cursor: pointer;
}
.report-top {
  display: flex;
  align-items: center;
  gap: 10px;
  .report-icon {
    font-size: 26px;
  }
  .report-main {
    flex: 1;
    .report-period {
      font-size: 14px;
      font-weight: 600;
    }
    .report-summary {
      margin-top: 4px;
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
  }
  .report-score {
    text-align: center;
    .score-num {
      font-size: 24px;
      font-weight: 800;
      color: var(--sp-success);
      &.warn {
        color: var(--sp-warning);
      }
    }
    .score-label {
      font-size: 11px;
      color: var(--sp-text-placeholder);
    }
  }
}
.report-bottom {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--sp-border);
}
</style>

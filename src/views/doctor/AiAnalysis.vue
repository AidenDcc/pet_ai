<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getReviewListApi, getAllReportsApi, generateReportApi, type ReportJoined } from '@/api/modules/report'
import { getDoctorPatientsApi, type PatientRow } from '@/api/modules/pet'
import { SPECIES_ICON, toVantTagType } from '@/utils/consts'

const { t } = useI18n()

const analyses = ref<ReportJoined[]>([])
const patients = ref<PatientRow[]>([])
const selected = ref('')
const keyword = ref('')
const loading = ref(false)
const generating = ref(false)
const pickerVisible = ref(false)

const selectedPatient = computed(() => patients.value.find((p) => p.id === selected.value))

const filtered = computed(() => {
  if (!keyword.value) return analyses.value
  return analyses.value.filter(
    (a) => a.petName.includes(keyword.value) || a.summary.includes(keyword.value),
  )
})

async function load() {
  loading.value = true
  try {
    const [reviewed, pending] = await Promise.all([getAllReportsApi(), getReviewListApi()])
    analyses.value = [...reviewed, ...pending].sort((a, b) => b.endAt - a.endAt)
  } finally {
    loading.value = false
  }
}

async function loadPatients() {
  const page = await getDoctorPatientsApi({ page: 1, pageSize: 100 })
  patients.value = page.list
  selected.value = page.list[0]?.id ?? ''
}

function pickPatient(id: string) {
  pickerVisible.value = false
  selected.value = id
}

async function generate() {
  if (!selected.value) {
    showToast(t('doctor.ai.needPatient'))
    return
  }
  generating.value = true
  try {
    const report = await generateReportApi(selected.value)
    showToast(t('doctor.ai.generatedFor', { name: report.petName }))
    await load()
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  load().catch(() => undefined)
  loadPatients().catch(() => undefined)
})
</script>

<template>
  <div class="ai-analysis">
    <van-search v-model="keyword" :placeholder="t('doctor.ai.searchPatient')" />

    <div class="toolbar">
      <div class="selector sp-card" @click="pickerVisible = true">
        <span class="selector-text">{{ selectedPatient ? `${selectedPatient.name} · ${selectedPatient.breed}` : t('doctor.ai.selectPatient') }}</span>
        <van-icon name="arrow" color="#c0c4cc" />
      </div>
      <van-button block round type="primary" icon="plus" :loading="generating" @click="generate">{{ t('doctor.ai.generate') }}</van-button>
    </div>

    <van-skeleton :loading="loading" :row="5" class="mt-8" />

    <div v-for="a in filtered" :key="a.id" class="analysis-card sp-card">
      <div class="analysis-head">
        <van-image round width="42" height="42" :src="a.petAvatar" />
        <div class="analysis-title">
          <div class="fw-600">{{ SPECIES_ICON[a.species] }} {{ a.petName }}</div>
          <div class="text-secondary fs-12">{{ a.period }}</div>
        </div>
        <div class="analysis-score" :class="a.score < 85 ? 'warn' : 'good'">{{ a.score }}</div>
      </div>
      <div class="analysis-conclusion">{{ a.aiConclusion }}</div>
      <div class="analysis-tags">
        <van-tag v-for="ab in a.abnormal" :key="ab.key" round :type="ab.level === 'danger' ? 'danger' : 'warning'">
          {{ ab.label }}
        </van-tag>
        <van-tag v-if="!a.abnormal.length" round type="success">{{ t('doctor.ai.metricNormal') }}</van-tag>
      </div>
      <van-tag
        round
        :type="toVantTagType(a.doctorReview === 'pending' ? 'warning' : a.doctorReview === 'approved' ? 'success' : 'info')"
      >
        {{ a.doctorReview === 'pending' ? t('doctor.ai.statusPending') : a.doctorReview === 'approved' ? t('doctor.ai.statusReviewed', { name: a.doctorName ?? t('role.doctor') }) : t('doctor.ai.statusAuto') }}
      </van-tag>
    </div>

    <van-empty v-if="!loading && !filtered.length" :description="t('doctor.ai.empty')" />

    <!-- 患者选择弹层 -->
    <van-popup v-model:show="pickerVisible" position="bottom" round safe-area-inset-bottom class="picker-popup">
      <div class="picker-title">{{ t('doctor.ai.selectPatient') }}</div>
      <div class="picker-list">
        <div
          v-for="p in patients"
          :key="p.id"
          class="picker-item"
          :class="{ active: selected === p.id }"
          @click="pickPatient(p.id)"
        >
          <span>{{ p.name }} · {{ p.breed }}</span>
          <van-icon v-if="selected === p.id" name="success" color="#00b4a6" />
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped lang="scss">
.ai-analysis {
  padding: 0 14px 16px;
}
.toolbar {
  padding: 4px 0 12px;
}
.selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  margin-bottom: 10px;
  .selector-text {
    font-size: 14px;
  }
}
.analysis-card {
  padding: 14px;
  margin-bottom: 12px;
  .analysis-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }
  .analysis-title {
    flex: 1;
    min-width: 0;
  }
  .analysis-score {
    font-size: 24px;
    font-weight: 800;
    &.good {
      color: var(--sp-success);
    }
    &.warn {
      color: var(--sp-warning);
    }
  }
  .analysis-conclusion {
    font-size: 13px;
    line-height: 1.7;
    color: var(--sp-text-secondary);
    background: rgba(0, 180, 166, 0.08);
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 12px;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .analysis-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
  }
}

.picker-popup {
  max-height: 70%;
  overflow-y: auto;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
  .picker-title {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 12px;
  }
  .picker-list {
    max-height: 55vh;
    overflow-y: auto;
  }
  .picker-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 4px;
    border-bottom: 1px solid var(--sp-border);
    font-size: 14px;
    &.active {
      background: rgba(0, 180, 166, 0.05);
    }
  }
}
</style>

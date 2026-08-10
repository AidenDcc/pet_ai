<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { getReviewListApi, type ReportJoined } from '@/api/modules/report'
import { getDoctorPatientsApi, type PatientRow } from '@/api/modules/pet'
import { DEVICE_STATUS, SPECIES_ICON, toVantTagType } from '@/utils/consts'

const router = useRouter()
const { t } = useI18n()
const auth = useAuthStore()

const stats = ref({
  pending: 0,
  online: 0,
  patients: 0,
  abnormal: 0,
})
const pendingReports = ref<ReportJoined[]>([])
const onlinePatients = ref<PatientRow[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const [reviews, patientPage] = await Promise.all([
      getReviewListApi(),
      getDoctorPatientsApi({ page: 1, pageSize: 50 }),
    ])
    pendingReports.value = reviews
    onlinePatients.value = patientPage.list.filter((p) => p.device?.status === 'online')
    stats.value = {
      pending: reviews.length,
      online: onlinePatients.value.length,
      patients: patientPage.total,
      abnormal: reviews.reduce((s, r) => s + r.abnormal.length, 0),
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="dashboard">
    <van-skeleton :loading="loading" :row="6" class="mt-16" />

    <template v-if="!loading">
      <!-- 欢迎 -->
      <div class="welcome">
        <div class="welcome-title">{{ t('doctor.dashboard.welcomeMorning', { name: auth.user?.name ?? t('role.doctor') }) }}</div>
        <div class="welcome-sub">{{ t('doctor.dashboard.welcomeSub', { pending: stats.pending, abnormal: stats.abnormal }) }}</div>
      </div>

      <!-- 统计卡片 2×2 -->
      <div class="stat-grid">
        <div class="stat-card sp-card">
          <div class="stat-icon" style="background: #fff3e0">📋</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.pending }}</div>
            <div class="stat-label">{{ t('doctor.dashboard.pendingReports') }}</div>
          </div>
        </div>
        <div class="stat-card sp-card">
          <div class="stat-icon" style="background: #e6faf8">🟢</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.online }}</div>
            <div class="stat-label">{{ t('doctor.dashboard.onlinePets') }}</div>
          </div>
        </div>
        <div class="stat-card sp-card">
          <div class="stat-icon" style="background: #e8f0fe">🐾</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.patients }}</div>
            <div class="stat-label">{{ t('doctor.dashboard.totalPatients') }}</div>
          </div>
        </div>
        <div class="stat-card sp-card">
          <div class="stat-icon" style="background: #ffe9e9">⚠️</div>
          <div class="stat-info">
            <div class="stat-value" style="color: #ff6b6b">{{ stats.abnormal }}</div>
            <div class="stat-label">{{ t('doctor.dashboard.abnormalSignals') }}</div>
          </div>
        </div>
      </div>

      <!-- 待审核报告 -->
      <div class="sp-card section">
        <div class="card-head">
          <span class="fw-600">{{ t('doctor.dashboard.pendingList') }}</span>
          <span class="text-primary fs-12" @click="router.push('/doctor/reports')">{{ t('doctor.dashboard.viewAll') }} →</span>
        </div>
        <van-empty v-if="!pendingReports.length" :description="t('doctor.dashboard.noPendingReport')" />
        <div v-for="r in pendingReports.slice(0, 6)" :key="r.id" class="row-item" @click="router.push('/doctor/reports')">
          <van-image round width="36" height="36" :src="r.petAvatar" />
          <div class="row-info">
            <div class="row-name">
              {{ r.petName }}
              <span class="row-sub">{{ r.period }}</span>
            </div>
            <div class="row-desc ellipsis">{{ r.summary }}</div>
          </div>
          <van-tag round type="warning">{{ t('doctor.dashboard.pendingTag') }}</van-tag>
        </div>
      </div>

      <!-- 在线监护 -->
      <div class="sp-card section mt-16">
        <div class="card-head">
          <span class="fw-600">{{ t('doctor.dashboard.onlineList') }}</span>
          <span class="text-primary fs-12" @click="router.push('/doctor/patients')">{{ t('doctor.patients.all') }} →</span>
        </div>
        <van-empty v-if="!onlinePatients.length" :description="t('doctor.dashboard.noOnlinePet')" />
        <div v-for="p in onlinePatients.slice(0, 8)" :key="p.id" class="row-item" @click="router.push('/doctor/patients')">
          <van-image round width="34" height="34" :src="p.avatar" />
          <div class="row-info">
            <div class="row-name">{{ SPECIES_ICON[p.species] }} {{ p.name }}</div>
            <div class="row-desc">{{ p.breed }} · {{ p.owner?.name ?? '' }}</div>
          </div>
          <van-tag round :type="toVantTagType(DEVICE_STATUS[p.device?.status ?? 'offline'].tag)">
            {{ t(DEVICE_STATUS[p.device?.status ?? 'offline'].labelKey) }}
          </van-tag>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.dashboard {
  padding: 16px 14px;
  padding-top: 0;
}
.welcome {
  margin-bottom: 14px;
  .welcome-title {
    font-size: 18px;
    font-weight: 700;
  }
  .welcome-sub {
    margin-top: 4px;
    font-size: 12px;
    color: var(--sp-text-secondary);
  }
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  .stat-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    .stat-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    .stat-value {
      font-size: 22px;
      font-weight: 800;
      line-height: 1.1;
    }
    .stat-label {
      margin-top: 2px;
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
  }
}
.section {
  padding: 14px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.row-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--sp-border);
  &:last-child {
    border-bottom: none;
  }
}
.row-info {
  flex: 1;
  min-width: 0;
  .row-name {
    font-size: 14px;
    font-weight: 600;
  }
  .row-sub {
    font-size: 12px;
    font-weight: 400;
    color: var(--sp-text-secondary);
    margin-left: 6px;
  }
  .row-desc {
    font-size: 12px;
    color: var(--sp-text-secondary);
    margin-top: 3px;
  }
}
</style>

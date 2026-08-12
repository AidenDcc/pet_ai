<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { getReportApi, type ReportJoined } from '@/api/modules/report'
import { SPECIES_ICON } from '@/utils/consts'

const route = useRoute()
const router = useRouter()
const reportId = route.params.id as string
const { t } = useI18n()

const report = ref<ReportJoined | null>(null)
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    report.value = await getReportApi(reportId)
  } catch (e) {
    ElMessage.error((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

function reviewLabel(r: ReportJoined): string {
  if (r.doctorReview === 'approved') return t('status.approved')
  if (r.doctorReview === 'rejected') return t('status.rejected')
  if (r.doctorReview === 'pending') return t('status.pendingReview')
  return t('user.reports.ai')
}

function reviewType(r: ReportJoined): 'success' | 'danger' | 'warning' | 'info' {
  if (r.doctorReview === 'approved') return 'success'
  if (r.doctorReview === 'rejected') return 'danger'
  if (r.doctorReview === 'pending') return 'warning'
  return 'info'
}

load()
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">{{ t('nav.admin.reportDetail') }}</div>
      <div class="page-desc">{{ report ? `${SPECIES_ICON[report.species]} ${report.petName}` : '' }}</div>
    </div>

    <el-card v-loading="loading" shadow="never" class="report-card">
      <template v-if="report">
        <!-- 健康分 + 概览 -->
        <div class="score-row">
          <div
            class="score-ring"
            :style="{
              background: `conic-gradient(${report.score < 85 ? '#ff9f43' : '#72d1a8'} ${report.score * 3.6}deg, #eef2ee 0deg)`,
            }"
          >
            <div class="ring-inner">
              <div class="score-num">{{ report.score }}</div>
              <div class="score-label">{{ t('user.reports.score') }}</div>
            </div>
          </div>
          <div class="score-info">
            <div class="period">{{ report.period }}</div>
            <div class="summary">{{ report.summary }}</div>
            <div class="tags">
              <el-tag size="small" :type="report.abnormal.length ? 'warning' : 'success'">
                {{ report.abnormal.length ? t('user.reports.abnormalCount', { n: report.abnormal.length }) : t('user.reports.normal') }}
              </el-tag>
              <el-tag size="small" :type="reviewType(report)">{{ reviewLabel(report) }}</el-tag>
            </div>
          </div>
        </div>

        <!-- AI 分析 -->
        <div class="block">
          <div class="block-title">🤖 {{ t('nav.aiAnalysis') }}</div>
          <div class="ai-text">{{ report.aiConclusion }}</div>
        </div>

        <!-- 异常项 -->
        <div v-if="report.abnormal.length" class="block">
          <div class="block-title">⚠️ {{ t('user.reportDetail.watchOut') }}</div>
          <div v-for="a in report.abnormal" :key="a.key" class="abnormal-item">
            <div class="abnormal-head">
              <span class="abnormal-label">{{ a.label }}</span>
              <el-tag
                size="small"
                :type="a.level === 'danger' ? 'danger' : a.level === 'warn' ? 'warning' : 'primary'"
              >
                {{ a.value }}
              </el-tag>
            </div>
            <div class="abnormal-suggestion">💡 {{ a.suggestion }}</div>
          </div>
        </div>

        <!-- 指标概览 -->
        <div class="block">
          <div class="block-title">📊 {{ t('user.reportDetail.overview') }}</div>
          <div class="metric-grid">
            <div class="metric-item">
              <div class="metric-value">{{ report.metricsSummary.heartRate.avg }}</div>
              <div class="metric-label">{{ t('user.reportDetail.avgHr') }} {{ t('user.health.bpm') }}</div>
              <div class="metric-range">{{ t('user.reportDetail.peak') }} {{ report.metricsSummary.heartRate.max }} / {{ t('user.reportDetail.valley') }} {{ report.metricsSummary.heartRate.min }}</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">{{ report.metricsSummary.spo2.avg }}</div>
              <div class="metric-label">{{ t('user.reportDetail.avgSpo2') }} {{ t('user.health.percent') }}</div>
              <div class="metric-range">{{ t('user.reportDetail.low') }} {{ report.metricsSummary.spo2.min }}</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">{{ report.metricsSummary.temperature.avg }}°</div>
              <div class="metric-label">{{ t('user.reportDetail.avgTemp') }} {{ t('user.health.degreeC') }}</div>
              <div class="metric-range">{{ t('user.reportDetail.peak') }} {{ report.metricsSummary.temperature.max }}°</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">{{ report.metricsSummary.sleepDuration }}</div>
              <div class="metric-label">{{ t('user.reportDetail.dailySleep') }} h</div>
              <div class="metric-range">{{ t('user.reportDetail.dailyActivity') }} {{ (report.metricsSummary.totalActivity / 7 / 1000).toFixed(1) }}{{ t('user.reportDetail.stepsUnit') }}</div>
            </div>
          </div>
        </div>

        <!-- 医生审阅 -->
        <div v-if="report.doctorReview && report.doctorReview !== 'pending'" class="block">
          <div class="block-title">🩺 {{ t('user.reportDetail.doctorReview') }}</div>
          <div class="doctor-row">
            <span class="doctor-name">{{ report.doctorName || t('user.reportDetail.platformDoctor') }}</span>
            <el-tag size="small" :type="report.doctorReview === 'approved' ? 'success' : 'danger'">
              {{ report.doctorReview === 'approved' ? t('status.approved') : t('user.reportDetail.suggestRecheck') }}
            </el-tag>
          </div>
          <div class="doctor-comment">{{ report.doctorComment }}</div>
        </div>

        <div class="footer-actions">
          <el-button @click="router.back()">{{ t('common.back') }}</el-button>
        </div>
      </template>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.report-card {
  max-width: 860px;
}

.score-row {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 8px 4px 20px;

  .score-ring {
    width: 104px;
    height: 104px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .ring-inner {
      width: 78px;
      height: 78px;
      border-radius: 50%;
      background: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      .score-num {
        font-size: 24px;
        font-weight: 800;
        color: var(--sp-text);
      }
      .score-label {
        font-size: 12px;
        color: var(--sp-text-placeholder);
      }
    }
  }

  .score-info {
    flex: 1;
    min-width: 0;

    .period {
      font-size: 15px;
      font-weight: 700;
    }
    .summary {
      margin-top: 6px;
      font-size: 13px;
      color: var(--sp-text-secondary);
      line-height: 1.6;
    }
    .tags {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }
  }
}

.block {
  padding: 16px 0;
  border-top: 1px solid var(--sp-border);

  .block-title {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 12px;
  }
}

.ai-text {
  font-size: 13px;
  line-height: 1.8;
  color: var(--sp-text);
  background: var(--el-color-primary-light-9);
  border-radius: 10px;
  padding: 12px;
}

.abnormal-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--sp-border);

  &:last-child {
    border-bottom: none;
  }

  .abnormal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .abnormal-label {
      font-size: 14px;
      font-weight: 600;
    }
  }
  .abnormal-suggestion {
    margin-top: 6px;
    font-size: 12px;
    color: var(--sp-text-secondary);
    line-height: 1.6;
  }
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  .metric-item {
    background: #f2fbf6;
    border-radius: 10px;
    padding: 12px;

    .metric-value {
      font-size: 20px;
      font-weight: 800;
      color: var(--sp-primary-dark, #4c9a7c);
    }
    .metric-label {
      margin-top: 2px;
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
    .metric-range {
      margin-top: 4px;
      font-size: 11px;
      color: var(--sp-text-placeholder);
    }
  }
}

.doctor-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .doctor-name {
    font-size: 14px;
    font-weight: 600;
  }
}

.doctor-comment {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--sp-text-secondary);
  background: #f2fbf6;
  border-radius: 10px;
  padding: 12px;
}

.footer-actions {
  margin-top: 20px;
  border-top: 1px solid var(--sp-border);
  padding-top: 16px;
}
</style>

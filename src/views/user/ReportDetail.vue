<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast, showConfirmDialog } from 'vant'
import { getReportApi, generateReportApi, markReportReadApi, type ReportJoined } from '@/api/modules/report'
import ReportTrendChart from '@/components/ReportTrendChart.vue'

const route = useRoute()
const router = useRouter()
const reportId = route.params.id as string
const { t } = useI18n()

const report = ref<ReportJoined | null>(null)
const loading = ref(false)

/** 五类趋势图配置（心率 / 呼吸率 / 血氧 / 体温 / 卡路里） */
const TREND_METRICS = [
  { key: 'heartRate', labelKey: 'user.health.heartRate', unitKey: 'user.health.bpm', color: '#ff6b6b' },
  { key: 'respiratoryRate', labelKey: 'user.health.respiratory', unitKey: 'user.health.bpm', color: '#5b8ff9' },
  { key: 'spo2', labelKey: 'user.health.spo2', unitKey: 'user.health.percent', color: '#00b4a6' },
  { key: 'temperature', labelKey: 'user.health.temperature', unitKey: 'user.health.degreeC', color: '#ff9f43' },
  { key: 'calorie', labelKey: 'user.health.calorie', unitKey: 'user.health.calorieUnit', color: '#34c759' },
] as const

async function load() {
  loading.value = true
  try {
    report.value = await getReportApi(reportId)
    // 进入详情即标记已读（未读状态在列表页由 readAt 判定）
    markReportReadApi(reportId).catch(() => undefined)
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function regenerate() {
  try {
    await showConfirmDialog({
      title: t('user.reportDetail.regenerate'),
      message: t('user.reportDetail.regenerateMsg'),
    })
  } catch {
    return
  }
  try {
    const r = await generateReportApi(report.value!.petId)
    report.value = r
    showToast(t('user.reportDetail.regenSuccess'))
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  }
}

load()
</script>

<template>
  <div class="detail">
    <van-skeleton :loading="loading" :row="6" />

    <template v-if="report">
      <!-- 健康分 -->
      <div class="score-card sp-card">
        <div
          class="score-ring"
          :style="{
            background: `conic-gradient(${report.score < 85 ? '#ff9500' : '#34c759'} ${report.score * 3.6}deg, #eef1f5 0deg)`,
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
          <div class="tags mt-8">
            <van-tag v-if="report.abnormal.length" round type="warning">{{ t('user.reports.abnormalCount', { n: report.abnormal.length }) }}</van-tag>
            <van-tag v-else round type="success">{{ t('user.reports.normal') }}</van-tag>
            <van-tag
              round
              :type="report.doctorReview === 'approved' ? 'success' : report.doctorReview === 'rejected' ? 'danger' : 'primary'"
            >
              {{ report.doctorReview === 'pending' ? t('user.reports.pendingReview') : report.doctorReview === 'approved' ? t('user.reports.approved') : report.doctorReview === 'rejected' ? t('user.reports.rejected') : t('user.reports.ai') }}
            </van-tag>
          </div>
        </div>
      </div>

      <!-- AI 分析 -->
      <div class="block sp-card mt-16">
        <div class="block-title">🤖 {{ t('nav.aiAnalysis') }}</div>
        <div class="ai-text">{{ report.aiConclusion }}</div>
      </div>

      <!-- 异常项 -->
      <div v-if="report.abnormal.length" class="block sp-card mt-16">
        <div class="block-title">⚠️ {{ t('user.reportDetail.watchOut') }}</div>
        <div v-for="a in report.abnormal" :key="a.key" class="abnormal-item">
          <div class="abnormal-head">
            <span class="abnormal-label">{{ a.label }}</span>
            <van-tag round :type="a.level === 'danger' ? 'danger' : a.level === 'warn' ? 'warning' : 'primary'">
              {{ a.value }}
            </van-tag>
          </div>
          <div class="abnormal-suggestion">💡 {{ a.suggestion }}</div>
        </div>
      </div>

      <!-- 指标概览 -->
      <div class="block sp-card mt-16">
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

      <!-- 指标趋势（平滑折线图） -->
      <div v-if="report.trend" class="block sp-card mt-16">
        <div class="block-title">📈 {{ t('user.health.trendTitle') }}</div>
        <div v-for="m in TREND_METRICS" :key="m.key" class="trend-item">
          <div class="trend-head">
            <span class="trend-name">{{ t(m.labelKey) }}</span>
            <span class="trend-unit">{{ t(m.unitKey) }}</span>
          </div>
          <ReportTrendChart :points="report.trend[m.key]" :unit="t(m.unitKey)" :color="m.color" height="180px" />
        </div>
      </div>

      <!-- 医生审阅 -->
      <div v-if="report.doctorReview && report.doctorReview !== 'pending'" class="block sp-card mt-16">
        <div class="block-title">🩺 {{ t('user.reportDetail.doctorReview') }}</div>
        <div class="doctor-row">
          <span class="doctor-name">{{ report.doctorName || t('user.reportDetail.platformDoctor') }}</span>
          <van-tag
            round
            :type="report.doctorReview === 'approved' ? 'success' : 'danger'"
          >
            {{ report.doctorReview === 'approved' ? t('status.approved') : t('user.reportDetail.suggestRecheck') }}
          </van-tag>
        </div>
        <div class="doctor-comment">{{ report.doctorComment }}</div>
      </div>

      <van-button block round plain type="primary" class="mt-24" icon="refresh" @click="regenerate">
        {{ t('user.reportDetail.regenerateHint') }}
      </van-button>
      <van-button block round plain class="mt-8" icon="arrow-left" @click="router.back()">
        {{ t('common.back') }}
      </van-button>
    </template>
  </div>
</template>

<style scoped lang="scss">
.detail {
  padding: 16px 14px;
}
.score-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 16px;
  .score-ring {
    width: 92px;
    height: 92px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    .ring-inner {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      .score-num {
        font-size: 22px;
        font-weight: 800;
        color: var(--sp-text);
      }
      .score-label {
        font-size: 11px;
        color: var(--sp-text-placeholder);
      }
    }
  }
  .score-info {
    flex: 1;
    .period {
      font-size: 14px;
      font-weight: 600;
    }
    .summary {
      margin-top: 4px;
      font-size: 13px;
      color: var(--sp-text-secondary);
      line-height: 1.6;
    }
    .tags {
      display: flex;
      gap: 8px;
    }
  }
}
.block {
  padding: 16px;
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
.trend-item {
  margin-bottom: 14px;
  &:last-child {
    margin-bottom: 0;
  }
  .trend-head {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 2px;
    .trend-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--sp-text);
    }
    .trend-unit {
      font-size: 12px;
      color: var(--sp-text-placeholder);
    }
  }
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  .metric-item {
    background: #f7f9fc;
    border-radius: 10px;
    padding: 12px;
    .metric-value {
      font-size: 20px;
      font-weight: 800;
      color: var(--sp-primary-dark);
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
  background: #f7f9fc;
  border-radius: 10px;
  padding: 12px;
}
.mt-8 {
  margin-top: 8px;
}
.mt-24 {
  margin-top: 24px;
}
</style>

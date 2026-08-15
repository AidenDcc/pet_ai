<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getReportApi, markReportReadApi, type ReportJoined } from '@/api/modules/report'
import { getPetApi, type PetJoined } from '@/api/modules/pet'
import { SPECIES_ICON, SPECIES_LABEL, GENDER_LABEL } from '@/utils/consts'
import { ageOf } from '@/utils/format'
import ReportTrendChart from '@/components/ReportTrendChart.vue'

const route = useRoute()
const router = useRouter()
const reportId = route.params.id as string
const { t, tm } = useI18n()

/** 数据合规声明条目（数组型词条，需用 tm 读取） */
const complianceItems = computed(() => (tm('admin.petReports.compliance.items') as string[]) ?? [])

const report = ref<ReportJoined | null>(null)
const pet = ref<PetJoined | null>(null)
const loading = ref(false)

/** 体征与运动指标 tab 激活项 */
const activeTab = ref<'vitals' | 'exercise'>('vitals')

/** 体征趋势图配置（心率 / 呼吸频率 / 血氧 / 体温） */
const VITAL_TREND = [
  { key: 'heartRate', labelKey: 'user.health.heartRate', unitKey: 'user.health.bpm', color: '#ff6b6b' },
  { key: 'respiratoryRate', labelKey: 'user.health.respiratory', unitKey: 'user.health.bpm', color: '#5b8ff9' },
  { key: 'spo2', labelKey: 'user.health.spo2', unitKey: 'user.health.percent', color: '#00b4a6' },
  { key: 'temperature', labelKey: 'user.health.temperature', unitKey: 'user.health.degreeC', color: '#ff9f43' },
] as const

/** 运动趋势图配置（步频 / 步幅 / 速度 / 卡路里） */
const EXERCISE_TREND = [
  { key: 'stepFreq', labelKey: 'user.health.stepFreq', unitKey: 'user.health.stepFreqUnit', color: '#5b8ff9' },
  { key: 'stride', labelKey: 'user.health.stride', unitKey: 'user.health.strideUnit', color: '#ff9f43' },
  { key: 'speed', labelKey: 'user.health.speed', unitKey: 'user.health.speedUnit', color: '#00b4a6' },
  { key: 'calorie', labelKey: 'user.health.calorie', unitKey: 'user.health.calorieUnit', color: '#34c759' },
] as const

const GRADE_LABEL_KEY: Record<'A' | 'B' | 'C' | 'D', string> = {
  A: 'admin.petReports.aiGradeLabels.A',
  B: 'admin.petReports.aiGradeLabels.B',
  C: 'admin.petReports.aiGradeLabels.C',
  D: 'admin.petReports.aiGradeLabels.D',
}
const RISK_LABEL_KEY: Record<'none' | 'mild' | 'severe', string> = {
  none: 'admin.petReports.risk.none',
  mild: 'admin.petReports.risk.mild',
  severe: 'admin.petReports.risk.severe',
}

/** 综合健康评级：优先取 AI 评级，历史报告由健康分映射 */
function gradeOf(r: ReportJoined): 'A' | 'B' | 'C' | 'D' {
  if (r.grade) return r.grade
  if (r.score >= 90) return 'A'
  if (r.score >= 80) return 'B'
  if (r.score >= 70) return 'C'
  return 'D'
}

/** 核心风险提示：由评级推导（D 就医预警 / C 亚健康 / A·B 无风险） */
function riskOf(grade: 'A' | 'B' | 'C' | 'D'): 'none' | 'mild' | 'severe' {
  if (grade === 'D') return 'severe'
  if (grade === 'C') return 'mild'
  return 'none'
}

/** 评级 tag 类型（Vant tag 支持 primary/success/warning/danger） */
function gradeTag(grade: string): 'success' | 'primary' | 'warning' | 'danger' {
  if (grade === 'A') return 'success'
  if (grade === 'B') return 'primary'
  if (grade === 'C') return 'warning'
  return 'danger'
}

/** 卡路里换算：每步消耗约 0.05 千卡（与报告口径一致） */
const CAL_PER_STEP = 0.05
function dailyCalorie(r: ReportJoined): number {
  return Math.round((r.exerciseSummary?.dailyActivity ?? 0) * CAL_PER_STEP)
}

/** 指标卡片展示项（体征/运动共用） */
interface MetricCard {
  key: string
  label: string
  valueText: string
  range: string
  /** 正常值范围（存在则展示提示 icon） */
  ref?: string
  /** 与上周比较差值（存在则展示） */
  compare?: number
  compareUnit: string
  exercise?: boolean
}

const vitalCards = computed<MetricCard[]>(() => {
  const r = report.value
  if (!r) return []
  const m = r.metricsSummary
  const ref = r.referenceRanges
  const cmp = r.compare
  return [
    {
      key: 'hr',
      label: `${t('user.reportDetail.avgHr')} ${t('user.health.bpm')}`,
      valueText: String(m.heartRate.avg),
      range: `${t('user.reportDetail.peak')} ${m.heartRate.max} / ${t('user.reportDetail.valley')} ${m.heartRate.min}`,
      ref: ref?.heartRate,
      compare: cmp?.heartRate,
      compareUnit: t('user.health.bpm'),
    },
    {
      key: 'spo2',
      label: `${t('user.reportDetail.avgSpo2')} ${t('user.health.percent')}`,
      valueText: String(m.spo2.avg),
      range: `${t('user.reportDetail.low')} ${m.spo2.min}`,
      ref: ref?.spo2,
      compare: cmp?.spo2,
      compareUnit: t('user.health.percent'),
    },
    {
      key: 'temp',
      label: `${t('user.reportDetail.avgTemp')} ${t('user.health.degreeC')}`,
      valueText: `${m.temperature.avg}°`,
      range: `${t('user.reportDetail.peak')} ${m.temperature.max}°`,
      ref: ref?.temperature,
      compare: cmp?.temperature,
      compareUnit: t('user.health.degreeC'),
    },
    {
      key: 'resp',
      label: `${t('user.reportDetail.avgResp')} ${t('user.health.bpm')}`,
      valueText: String(m.respiratoryRate.avg),
      range: `${t('user.reportDetail.peak')} ${m.respiratoryRate.max} / ${t('user.reportDetail.valley')} ${m.respiratoryRate.min}`,
      ref: ref?.respiratoryRate,
      compare: cmp?.respiratoryRate,
      compareUnit: t('user.health.bpm'),
    },
  ]
})

const exerciseCards = computed<MetricCard[]>(() => {
  const r = report.value
  if (!r) return []
  const e = r.exerciseSummary
  const cmp = r.compare
  return [
    {
      key: 'stepFreq',
      label: `${t('user.health.stepFreq')} (${t('user.health.stepFreqUnit')})`,
      valueText: String(e?.stepFreq ?? 0),
      range: t('admin.petReports.dailyAvg'),
      compare: cmp?.stepFreq,
      compareUnit: t('user.health.stepFreqUnit'),
      exercise: true,
    },
    {
      key: 'stride',
      label: `${t('user.health.stride')} (${t('user.health.strideUnit')})`,
      valueText: String(e?.stride ?? 0),
      range: t('admin.petReports.dailyAvg'),
      compare: cmp?.stride,
      compareUnit: t('user.health.strideUnit'),
      exercise: true,
    },
    {
      key: 'speed',
      label: `${t('user.health.speed')} (${t('user.health.speedUnit')})`,
      valueText: String(e?.speed ?? 0),
      range: t('admin.petReports.dailyAvg'),
      compare: cmp?.speed,
      compareUnit: t('user.health.speedUnit'),
      exercise: true,
    },
    {
      key: 'calorie',
      label: `${t('user.health.calorie')} (${t('user.health.calorieUnit')})`,
      valueText: String(dailyCalorie(r)),
      range: t('admin.petReports.dailyAvg'),
      compare: cmp?.calorie,
      compareUnit: t('user.health.calorieUnit'),
      exercise: true,
    },
  ]
})

/** 与上周比较差值文案（带正负号 + 单位） */
function deltaText(delta: number, unit: string): string {
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta} ${unit}`
}

/** 差值涨跌样式：正=up 负=down 零=flat */
function deltaClass(delta: number): string {
  if (delta > 0) return 'up'
  if (delta < 0) return 'down'
  return 'flat'
}

/** 建议清单（报告结论融合） */
const recommendationList = computed(() => report.value?.recommendations ?? [])

/** 当前展开「正常值范围」提示的指标 key（null = 全部关闭） */
const openTip = ref<string | null>(null)
function toggleTip(key: string) {
  openTip.value = openTip.value === key ? null : key
}

async function load() {
  loading.value = true
  try {
    report.value = await getReportApi(reportId)
    // 进入详情即标记已读（未读状态在列表页由 readAt 判定）
    markReportReadApi(reportId).catch(() => undefined)
    if (report.value.petId) {
      getPetApi(report.value.petId)
        .then((p) => {
          pet.value = p
        })
        .catch(() => {
          pet.value = null
        })
    }
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

load()
</script>

<template>
  <div class="detail">
    <van-skeleton :loading="loading" :row="6" />

    <template v-if="report">
      <!-- 健康分 + 概览 -->
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
          <div v-if="report.reportNo" class="report-no">{{ t('admin.petReports.reportNo') }}：{{ report.reportNo }}</div>
          <div class="summary">{{ report.summary }}</div>
          <div class="tags mt-8">
            <van-tag v-if="report.abnormal.length" round type="warning">{{ t('user.reports.abnormalCount', { n: report.abnormal.length }) }}</van-tag>
            <van-tag v-else round type="success">{{ t('user.reports.normal') }}</van-tag>
            <van-tag round :type="gradeTag(gradeOf(report))">{{ t('admin.petReports.grade') }} {{ gradeOf(report) }}</van-tag>
            <van-tag v-if="report.source" round :type="report.source === 'offline' ? 'default' : 'primary'">
              {{ report.source === 'offline' ? t('admin.petReports.sourceOffline') : t('admin.petReports.sourceAi') }}
            </van-tag>
            <van-tag
              round
              :type="report.doctorReview === 'approved' ? 'success' : report.doctorReview === 'rejected' ? 'danger' : 'primary'"
            >
              {{ report.doctorReview === 'pending' ? t('user.reports.pendingReview') : report.doctorReview === 'approved' ? t('user.reports.approved') : report.doctorReview === 'rejected' ? t('user.reports.rejected') : t('user.reports.ai') }}
            </van-tag>
          </div>
        </div>
      </div>

      <!-- 宠物基本信息 -->
      <div class="block sp-card mt-16">
        <div class="block-title">🐾 {{ t('admin.petReports.petInfo') }}</div>
        <div class="pet-info-row">
          <van-image round :width="48" :height="48" :src="pet?.avatar || report.petAvatar" />
          <div class="pet-info-main">
            <div class="pet-info-name">{{ SPECIES_ICON[report.species] }} {{ pet?.name || report.petName }}</div>
            <div v-if="pet" class="pet-info-meta">
              {{ t(SPECIES_LABEL[pet.species]) }} · {{ pet.breed }} · {{ t(GENDER_LABEL[pet.gender]) }} ·
              {{ t('common.yearsOld', { n: ageOf(pet.birthDate) }) }} · {{ pet.weight }} {{ t('user.profile.weightUnit') }}
            </div>
          </div>
          <div v-if="pet" class="pet-info-tags">
            <van-tag v-if="pet.sterilized" plain>{{ t('user.profile.sterilized') }}</van-tag>
            <van-tag v-if="pet.isPregnant" plain type="warning">{{ t('user.profile.isPregnant') }}</van-tag>
            <van-tag v-if="pet.isLactating" plain type="warning">{{ t('user.profile.isLactating') }}</van-tag>
          </div>
        </div>
      </div>

      <!-- AI 智能分析 -->
      <div class="block sp-card mt-16">
        <div class="block-title">🤖 {{ t('nav.aiAnalysis') }}</div>
        <div class="ai-points">
          <div class="ai-point">
            <div class="ai-point-label">{{ t('admin.petReports.aiGrade') }}</div>
            <div class="ai-point-value grade" :class="`grade-${gradeOf(report)}`">
              {{ t(GRADE_LABEL_KEY[gradeOf(report)]) }}
            </div>
          </div>
          <div class="ai-point">
            <div class="ai-point-label">{{ t('admin.petReports.aiRisk') }}</div>
            <div class="ai-point-value risk" :class="`risk-${riskOf(gradeOf(report))}`">
              {{ t(RISK_LABEL_KEY[riskOf(gradeOf(report))]) }}
            </div>
          </div>
        </div>
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

      <!-- 体征与运动指标（tab 页签） -->
      <div class="block sp-card mt-16">
        <div class="block-title">📊 {{ t('admin.petReports.vitalExercise') }}</div>
        <van-tabs v-model:active="activeTab" color="#ff6b00">
          <!-- 体征数据 -->
          <van-tab :title="t('admin.petReports.tabs.vitals')" name="vitals">
            <div class="metric-grid">
              <div v-for="c in vitalCards" :key="c.key" class="metric-item">
                <div class="metric-value">{{ c.valueText }}</div>
                <div class="metric-label">
                  {{ c.label }}
                  <van-icon v-if="c.ref" name="info-o" class="range-icon" @click.stop="toggleTip(c.key)" />
                  <div v-if="openTip === c.key" class="range-tip">{{ t('admin.petReports.referenceRange') }}：{{ c.ref }}</div>
                </div>
                <div class="metric-range">{{ c.range }}</div>
                <div v-if="c.compare !== undefined" class="metric-compare" :class="deltaClass(c.compare)">
                  {{ t('admin.petReports.vsLastWeek') }} {{ deltaText(c.compare, c.compareUnit) }}
                </div>
              </div>
            </div>
            <div v-if="report.trend" class="trend-list">
              <div v-for="m in VITAL_TREND" :key="m.key" class="trend-card">
                <div class="trend-head">
                  <span class="trend-name">{{ t(m.labelKey) }}</span>
                  <span class="trend-unit">{{ t(m.unitKey) }}</span>
                </div>
                <ReportTrendChart :points="report.trend[m.key]" :unit="t(m.unitKey)" :color="m.color" height="180px" />
              </div>
            </div>
          </van-tab>

          <!-- 运动数据 -->
          <van-tab :title="t('admin.petReports.tabs.exercise')" name="exercise">
            <div class="metric-grid">
              <div v-for="c in exerciseCards" :key="c.key" class="metric-item exercise">
                <div class="metric-value">{{ c.valueText }}</div>
                <div class="metric-label">{{ c.label }}</div>
                <div class="metric-range">{{ c.range }}</div>
                <div v-if="c.compare !== undefined" class="metric-compare" :class="deltaClass(c.compare)">
                  {{ t('admin.petReports.vsLastWeek') }} {{ deltaText(c.compare, c.compareUnit) }}
                </div>
              </div>
            </div>
            <div v-if="report.trend" class="trend-list">
              <div v-for="m in EXERCISE_TREND" :key="m.key" class="trend-card">
                <div class="trend-head">
                  <span class="trend-name">{{ t(m.labelKey) }}</span>
                  <span class="trend-unit">{{ t(m.unitKey) }}</span>
                </div>
                <ReportTrendChart :points="report.trend[m.key]" :unit="t(m.unitKey)" :color="m.color" height="180px" />
              </div>
            </div>
          </van-tab>
        </van-tabs>
      </div>

      <!-- 建议清单 + 就医提示（报告结论融合） -->
      <div v-if="recommendationList.length || report.vetReferral?.needed" class="block sp-card mt-16">
        <div class="block-title">💡 {{ t('admin.petReports.advice') }}</div>
        <ol class="rec-list">
          <li v-for="(r, i) in recommendationList" :key="i">{{ r }}</li>
        </ol>
        <div v-if="report.vetReferral?.needed" class="referral">
          <div class="referral-title">🩺 {{ t('admin.petReports.vetReferral') }}</div>
          <div v-if="report.vetReferral.warning" class="referral-warning">{{ report.vetReferral.warning }}</div>
          <div v-if="report.vetReferral.suggestedExams.length" class="referral-exams">
            {{ t('admin.petReports.suggestedExams') }}：{{ report.vetReferral.suggestedExams.join('、') }}
          </div>
        </div>
      </div>

      <!-- 医生审阅 -->
      <div v-if="report.doctorReview && report.doctorReview !== 'pending'" class="block sp-card mt-16">
        <div class="block-title">🩺 {{ t('user.reportDetail.doctorReview') }}</div>
        <div class="doctor-row">
          <span class="doctor-name">{{ report.doctorName || t('user.reportDetail.platformDoctor') }}</span>
          <van-tag round :type="report.doctorReview === 'approved' ? 'success' : 'danger'">
            {{ report.doctorReview === 'approved' ? t('status.approved') : t('user.reportDetail.suggestRecheck') }}
          </van-tag>
        </div>
        <div class="doctor-comment">{{ report.doctorComment }}</div>
      </div>

      <!-- 数据合规声明 -->
      <div class="block sp-card mt-16">
        <div class="block-title">🛡️ {{ t('admin.petReports.compliance.title') }}</div>
        <ul class="compliance-list">
          <li v-for="(item, idx) in complianceItems" :key="idx">{{ item }}</li>
        </ul>
      </div>

      <van-button block round plain class="mt-16" icon="arrow-left" @click="router.back()">
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
    min-width: 0;
    .period {
      font-size: 14px;
      font-weight: 600;
    }
    .report-no {
      margin-top: 2px;
      font-size: 11px;
      color: var(--sp-text-placeholder);
    }
    .summary {
      margin-top: 4px;
      font-size: 13px;
      color: var(--sp-text-secondary);
      line-height: 1.6;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
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

.pet-info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #f2fbf6;
  border-radius: 10px;

  .pet-info-main {
    flex: 1;
    min-width: 0;
  }
  .pet-info-name {
    font-size: 15px;
    font-weight: 700;
  }
  .pet-info-meta {
    margin-top: 4px;
    font-size: 12px;
    color: var(--sp-text-secondary);
  }
  .pet-info-tags {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-end;
  }
}

.ai-points {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 12px;

  .ai-point {
    background: #f2fbf6;
    border-radius: 10px;
    padding: 10px 12px;

    .ai-point-label {
      font-size: 12px;
      color: var(--sp-text-placeholder);
    }
    .ai-point-value {
      margin-top: 4px;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.4;
      color: var(--sp-text);

      &.grade-A { color: #34c759; }
      &.grade-B { color: #5b8ff9; }
      &.grade-C { color: #ff9f43; }
      &.grade-D { color: #ff5964; }

      &.risk-none { color: #34c759; }
      &.risk-mild { color: #ff9f43; }
      &.risk-severe { color: #ff5964; }
    }
  }
}

.ai-text {
  font-size: 13px;
  line-height: 1.8;
  color: var(--sp-text);
  background: #f2fbf6;
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
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;

  .metric-item {
    background: #f2fbf6;
    border-radius: 10px;
    padding: 12px;

    &.exercise {
      background: #f5f3fb;
    }

    .metric-value {
      font-size: 20px;
      font-weight: 800;
      color: var(--sp-primary-dark, #4c9a7c);
    }
    .metric-label {
      margin-top: 2px;
      font-size: 12px;
      color: var(--sp-text-secondary);
      display: flex;
      align-items: center;
      gap: 4px;
      position: relative;

      .range-icon {
        font-size: 13px;
        color: var(--sp-text-placeholder);
        cursor: pointer;
      }
      .range-tip {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        z-index: 10;
        max-width: 180px;
        padding: 6px 8px;
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
        font-size: 11px;
        line-height: 1.5;
        white-space: normal;
      }
    }
    .metric-range {
      margin-top: 4px;
      font-size: 11px;
      color: var(--sp-text-placeholder);
    }
    .metric-compare {
      margin-top: 4px;
      font-size: 11px;

      &.up { color: #ff6b6b; }
      &.down { color: #00b4a6; }
      &.flat { color: var(--sp-text-placeholder); }
    }
  }
}

.trend-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;

  .trend-card {
    border: 1px solid var(--sp-border);
    border-radius: 10px;
    padding: 12px 12px 8px;

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
}

.rec-list {
  margin: 0;
  padding-left: 18px;

  li {
    font-size: 13px;
    line-height: 1.8;
    color: var(--sp-text);
  }
}

.referral {
  margin-top: 12px;
  padding: 12px;
  background: #fff7f0;
  border: 1px solid #ffe0cc;
  border-radius: 10px;

  .referral-title {
    font-size: 13px;
    font-weight: 700;
    color: #ff6b35;
  }
  .referral-warning {
    margin-top: 6px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--sp-text);
  }
  .referral-exams {
    margin-top: 4px;
    font-size: 12px;
    color: var(--sp-text-secondary);
  }
}

.compliance-list {
  margin: 0;
  padding-left: 18px;

  li {
    font-size: 12px;
    line-height: 1.8;
    color: var(--sp-text-secondary);
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
.mt-8 {
  margin-top: 8px;
}
.mt-16 {
  margin-top: 16px;
}
.mt-24 {
  margin-top: 24px;
}
</style>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { getReportApi, type ReportJoined } from '@/api/modules/report'
import { getPetApi, type PetJoined } from '@/api/modules/pet'
import { SPECIES_ICON, SPECIES_LABEL, GENDER_LABEL } from '@/utils/consts'
import { ageOf } from '@/utils/format'
import ReportTrendChart from '@/components/ReportTrendChart.vue'
import GaitRingChart from '@/components/GaitRingChart.vue'

const route = useRoute()
const router = useRouter()
const reportId = route.params.id as string
const { t, tm } = useI18n()

/** 数据合规声明条目（数组型词条，需用 tm 读取） */
const complianceItems = computed(() => (tm('admin.petReports.compliance.items') as string[]) ?? [])

const report = ref<ReportJoined | null>(null)
const pet = ref<PetJoined | null>(null)
const loading = ref(false)

/** 运动与代谢指标 tab 激活项 */
const activeTab = ref<'vitals' | 'exercise'>('vitals')

/** 体征趋势图配置（心率 / 呼吸频率 / 血氧 / 体温 / 卡路里） */
const VITAL_TREND = [
  { key: 'heartRate', labelKey: 'user.health.heartRate', unitKey: 'user.health.bpm', color: '#ff6b6b' },
  { key: 'respiratoryRate', labelKey: 'user.health.respiratory', unitKey: 'user.health.bpm', color: '#5b8ff9' },
  { key: 'spo2', labelKey: 'user.health.spo2', unitKey: 'user.health.percent', color: '#00b4a6' },
  { key: 'temperature', labelKey: 'user.health.temperature', unitKey: 'user.health.degreeC', color: '#ff9f43' },
  { key: 'calorie', labelKey: 'user.health.calorie', unitKey: 'user.health.calorieUnit', color: '#34c759' },
] as const

/** 运动趋势图配置（步频 / 步幅 / 速度）；卡路里已由「步态」圆角环形图替代 */
const EXERCISE_TREND = [
  { key: 'stepFreq', labelKey: 'user.health.stepFreq', unitKey: 'user.health.stepFreqUnit', color: '#5b8ff9' },
  { key: 'stride', labelKey: 'user.health.stride', unitKey: 'user.health.strideUnit', color: '#ff9f43' },
  { key: 'speed', labelKey: 'user.health.speed', unitKey: 'user.health.speedUnit', color: '#00b4a6' },
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

/** 卡路里换算：每步消耗约 0.05 千卡（与报告口径一致） */
const CAL_PER_STEP = 0.05
function dailyCalorie(r: ReportJoined): number {
  return Math.round((r.exerciseSummary?.dailyActivity ?? 0) * CAL_PER_STEP)
}

/** 步态标签（如 trot → 小跑） */
function gaitLabel(gait: string): string {
  const key = `user.health.gaitTypes.${gait}`
  return (t(key) as string) || gait
}

/** 周期主导步态及占比（由步态分布取权重最大项；无数据返回 null） */
function dominantGait(r: ReportJoined): { key: 'trot' | 'walk' | 'run' | 'rest'; pct: number } | null {
  const dist = r.exerciseSummary?.gaitDistribution
  if (!dist) return null
  const keys = Object.keys(dist) as ('trot' | 'walk' | 'run' | 'rest')[]
  if (!keys.length) return null
  const total = keys.reduce((s, k) => s + (dist[k] ?? 0), 0)
  if (!total) return null
  const top = keys.reduce((a, k) => (dist[k] > dist[a] ? k : a), keys[0])
  return { key: top, pct: Math.round(((dist[top] ?? 0) / total) * 100) }
}

/** 指标卡片展示项（体征/运动共用） */
interface MetricCard {
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
      label: `${t('user.reportDetail.avgHr')} ${t('user.health.bpm')}`,
      valueText: String(m.heartRate.avg),
      range: `${t('user.reportDetail.peak')} ${m.heartRate.max} / ${t('user.reportDetail.valley')} ${m.heartRate.min}`,
      ref: ref?.heartRate,
      compare: cmp?.heartRate,
      compareUnit: t('user.health.bpm'),
    },
    {
      label: `${t('user.reportDetail.avgSpo2')} ${t('user.health.percent')}`,
      valueText: String(m.spo2.avg),
      range: `${t('user.reportDetail.low')} ${m.spo2.min}`,
      ref: ref?.spo2,
      compare: cmp?.spo2,
      compareUnit: t('user.health.percent'),
    },
    {
      label: `${t('user.reportDetail.avgTemp')} ${t('user.health.degreeC')}`,
      valueText: `${m.temperature.avg}°`,
      range: `${t('user.reportDetail.peak')} ${m.temperature.max}°`,
      ref: ref?.temperature,
      compare: cmp?.temperature,
      compareUnit: t('user.health.degreeC'),
    },
    {
      label: `${t('user.reportDetail.avgResp')} ${t('user.health.bpm')}`,
      valueText: String(m.respiratoryRate.avg),
      range: `${t('user.reportDetail.peak')} ${m.respiratoryRate.max} / ${t('user.reportDetail.valley')} ${m.respiratoryRate.min}`,
      ref: ref?.respiratoryRate,
      compare: cmp?.respiratoryRate,
      compareUnit: t('user.health.bpm'),
    },
    {
      label: `${t('user.health.calorie')} (${t('user.health.calorieUnit')})`,
      valueText: String(dailyCalorie(r)),
      range: t('admin.petReports.dailyAvg'),
      compare: cmp?.calorie,
      compareUnit: t('user.health.calorieUnit'),
    },
  ]
})

const exerciseCards = computed<MetricCard[]>(() => {
  const r = report.value
  if (!r) return []
  const e = r.exerciseSummary
  const cmp = r.compare
  const gait = dominantGait(r)
  return [
    {
      label: `${t('user.health.stepFreq')} (${t('user.health.stepFreqUnit')})`,
      valueText: String(e?.stepFreq ?? 0),
      range: t('admin.petReports.dailyAvg'),
      compare: cmp?.stepFreq,
      compareUnit: t('user.health.stepFreqUnit'),
      exercise: true,
    },
    {
      label: `${t('user.health.stride')} (${t('user.health.strideUnit')})`,
      valueText: String(e?.stride ?? 0),
      range: t('admin.petReports.dailyAvg'),
      compare: cmp?.stride,
      compareUnit: t('user.health.strideUnit'),
      exercise: true,
    },
    {
      label: `${t('user.health.speed')} (${t('user.health.speedUnit')})`,
      valueText: String(e?.speed ?? 0),
      range: t('admin.petReports.dailyAvg'),
      compare: cmp?.speed,
      compareUnit: t('user.health.speedUnit'),
      exercise: true,
    },
    {
      label: t('user.health.gait'),
      valueText: gait ? gaitLabel(gait.key) : '—',
      range: gait ? t('admin.petReports.gaitShare', { pct: gait.pct }) : '',
      compareUnit: '',
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

async function load() {
  loading.value = true
  try {
    report.value = await getReportApi(reportId)
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

function gradeTag(grade: string): 'success' | 'primary' | 'warning' | 'danger' {
  if (grade === 'A') return 'success'
  if (grade === 'B') return 'primary'
  if (grade === 'C') return 'warning'
  return 'danger'
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
            <div v-if="report.reportNo" class="report-no">{{ t('admin.petReports.reportNo') }}：{{ report.reportNo }}</div>
            <div class="summary">{{ report.summary }}</div>
            <div class="tags">
              <el-tag size="small" :type="report.abnormal.length ? 'warning' : 'success'">
                {{ report.abnormal.length ? t('user.reports.abnormalCount', { n: report.abnormal.length }) : t('user.reports.normal') }}
              </el-tag>
              <el-tag size="small" :type="gradeTag(gradeOf(report))">
                {{ t('admin.petReports.grade') }} {{ gradeOf(report) }}
              </el-tag>
              <el-tag v-if="report.source" size="small" :type="report.source === 'offline' ? 'info' : 'success'">
                {{ report.source === 'offline' ? t('admin.petReports.sourceOffline') : t('admin.petReports.sourceAi') }}
              </el-tag>
              <el-tag size="small" :type="reviewType(report)">{{ reviewLabel(report) }}</el-tag>
            </div>
          </div>
        </div>

        <!-- 宠物基本信息 -->
        <div class="block">
          <div class="block-title">🐾 {{ t('admin.petReports.petInfo') }}</div>
          <div class="pet-info-row">
            <el-avatar :size="48" :src="pet?.avatar || report.petAvatar" />
            <div class="pet-info-main">
              <div class="pet-info-name">{{ SPECIES_ICON[report.species] }} {{ pet?.name || report.petName }}</div>
              <div v-if="pet" class="pet-info-meta">
                {{ t(SPECIES_LABEL[pet.species]) }} · {{ pet.breed }} · {{ t(GENDER_LABEL[pet.gender]) }} ·
                {{ t('common.yearsOld', { n: ageOf(pet.birthDate) }) }} · {{ pet.weight }} {{ t('user.profile.weightUnit') }}
              </div>
            </div>
            <div v-if="pet" class="pet-info-tags">
              <el-tag v-if="pet.sterilized" size="small">{{ t('user.profile.sterilized') }}</el-tag>
              <el-tag v-if="pet.isPregnant" size="small" type="warning">{{ t('user.profile.isPregnant') }}</el-tag>
              <el-tag v-if="pet.isLactating" size="small" type="warning">{{ t('user.profile.isLactating') }}</el-tag>
            </div>
          </div>

          <!-- 宠物主人信息 -->
          <div v-if="pet?.ownerName || report.ownerName" class="owner-row">
            <span class="owner-label">{{ t('admin.common.owner') }}</span>
            <el-avatar :size="32" :src="pet?.ownerAvatar || report.ownerAvatar">
              {{ (pet?.ownerName || report.ownerName || '').slice(0, 1) }}
            </el-avatar>
            <div class="owner-info">
              <div class="owner-name">{{ pet?.ownerName || report.ownerName }}</div>
              <div class="owner-account">{{ pet?.ownerAccount || report.ownerId }}</div>
            </div>
          </div>
        </div>

        <!-- AI 智能分析 -->
        <div class="block">
          <div class="block-title">🤖 {{ t('admin.petReports.aiAnalysis') }}</div>
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

        <!-- 体征与运动指标（tab 页签） -->
        <div class="block">
          <div class="block-title">📊 {{ t('admin.petReports.vitalExercise') }}</div>
          <el-tabs v-model="activeTab">
            <!-- 体征数据 -->
            <el-tab-pane :label="t('admin.petReports.tabs.vitals')" name="vitals">
              <div class="metric-grid">
                <div v-for="c in vitalCards" :key="c.label" class="metric-item">
                  <div class="metric-value">{{ c.valueText }}</div>
                  <div class="metric-label">
                    {{ c.label }}
                    <el-tooltip v-if="c.ref" trigger="click" placement="top" :show-after="0">
                      <template #content>
                        <div class="range-tip">{{ t('admin.petReports.referenceRange') }}：{{ c.ref }}</div>
                      </template>
                      <el-icon class="range-icon"><InfoFilled /></el-icon>
                    </el-tooltip>
                  </div>
                  <div class="metric-range">{{ c.range }}</div>
                  <div v-if="c.compare !== undefined" class="metric-compare" :class="deltaClass(c.compare)">
                    {{ t('admin.petReports.vsLastWeek') }} {{ deltaText(c.compare, c.compareUnit) }}
                  </div>
                </div>
              </div>
              <div v-if="report.trend" class="trend-grid">
                <div v-for="m in VITAL_TREND" :key="m.key" class="trend-card">
                  <div class="trend-head">
                    <span class="trend-name">{{ t(m.labelKey) }}</span>
                    <span class="trend-unit">{{ t(m.unitKey) }}</span>
                  </div>
                  <ReportTrendChart :points="report.trend[m.key]" :unit="t(m.unitKey)" :color="m.color" height="200px" />
                </div>
              </div>
            </el-tab-pane>

            <!-- 运动数据 -->
            <el-tab-pane :label="t('admin.petReports.tabs.exercise')" name="exercise">
              <div class="metric-grid">
                <div v-for="c in exerciseCards" :key="c.label" class="metric-item exercise">
                  <div class="metric-value">{{ c.valueText }}</div>
                  <div class="metric-label">{{ c.label }}</div>
                  <div class="metric-range">{{ c.range }}</div>
                  <div v-if="c.compare !== undefined" class="metric-compare" :class="deltaClass(c.compare)">
                    {{ t('admin.petReports.vsLastWeek') }} {{ deltaText(c.compare, c.compareUnit) }}
                  </div>
                </div>
              </div>
              <div v-if="report.trend" class="trend-grid">
                <div v-for="m in EXERCISE_TREND" :key="m.key" class="trend-card">
                  <div class="trend-head">
                    <span class="trend-name">{{ t(m.labelKey) }}</span>
                    <span class="trend-unit">{{ t(m.unitKey) }}</span>
                  </div>
                  <ReportTrendChart :points="report.trend[m.key]" :unit="t(m.unitKey)" :color="m.color" height="200px" />
                </div>
                <!-- 步态：圆角环形图展示周期步态分布 -->
                <div class="trend-card">
                  <div class="trend-head">
                    <span class="trend-name">{{ t('user.health.gait') }}</span>
                  </div>
                  <GaitRingChart :distribution="report.exerciseSummary?.gaitDistribution" height="200px" />
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>

        <!-- 建议清单 + 就医提示（报告结论融合） -->
        <div v-if="recommendationList.length || report.vetReferral?.needed" class="block">
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

        <!-- 数据合规声明 -->
        <div class="block">
          <div class="block-title">🛡️ {{ t('admin.petReports.compliance.title') }}</div>
          <ul class="compliance-list">
            <li v-for="(item, idx) in complianceItems" :key="idx">{{ item }}</li>
          </ul>
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
    .report-no {
      margin-top: 4px;
      font-size: 12px;
      color: var(--sp-text-placeholder);
    }
    .summary {
      margin-top: 6px;
      font-size: 13px;
      color: var(--sp-text-secondary);
      line-height: 1.6;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
  }
}

.pet-info-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: #f2fbf6;
  border-radius: 10px;

  .pet-info-main {
    flex: 1;
    min-width: 0;
  }
  .pet-info-name {
    font-size: 16px;
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
    gap: 6px;
    align-items: flex-end;
  }
}

.owner-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 10px 14px;
  background: #f5f3fb;
  border-radius: 10px;

  .owner-label {
    font-size: 12px;
    color: var(--sp-text-secondary);
    flex-shrink: 0;
  }
  .owner-info {
    min-width: 0;
  }
  .owner-name {
    font-size: 14px;
    font-weight: 600;
  }
  .owner-account {
    margin-top: 2px;
    font-size: 12px;
    color: var(--sp-text-placeholder);
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

.ai-points {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 12px;

  .ai-point {
    background: #f2fbf6;
    border-radius: 10px;
    padding: 12px;

    .ai-point-label {
      font-size: 12px;
      color: var(--sp-text-placeholder);
    }
    .ai-point-value {
      margin-top: 6px;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.5;
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
  background: var(--el-color-primary-light-9);
  border-radius: 10px;
  padding: 12px;
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

.range-tip {
  font-size: 12px;
  line-height: 1.6;
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

      .range-icon {
        font-size: 13px;
        color: var(--sp-text-placeholder);
        cursor: pointer;
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

.trend-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;

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
      }
      .trend-unit {
        font-size: 12px;
        color: var(--sp-text-placeholder);
      }
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

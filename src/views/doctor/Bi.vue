<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getDoctorBiApi } from '@/api/modules/bi'
import type { DoctorBiData } from '@/types'
import { useEchart } from '@/composables/useEchart'
import { SPECIES_LABEL } from '@/utils/consts'
import type { ECOption } from '@/utils/echarts'

const { t } = useI18n()

const data = ref<DoctorBiData | null>(null)
const loading = ref(false)

const scoreRef = ref<HTMLElement | null>(null)
const speciesRef = ref<HTMLElement | null>(null)
const abnormalRef = ref<HTMLElement | null>(null)
const weeklyRef = ref<HTMLElement | null>(null)
const rateRef = ref<HTMLElement | null>(null)

const scoreChart = useEchart(scoreRef)
const speciesChart = useEchart(speciesRef)
const abnormalChart = useEchart(abnormalRef)
const weeklyChart = useEchart(weeklyRef)
const rateChart = useEchart(rateRef)

const BRAND = '#00b4a6'
const PALETTE = ['#00b4a6', '#5b8ff9', '#ff9f43', '#ff6b6b', '#7d6bff', '#2bcbba']
const axisStyle = { color: '#a3b0c0', fontSize: 10 }

const kpis = computed(() => {
  const d = data.value
  if (!d) return []
  return [
    { label: t('doctor.bi.kpiPatients'), value: d.kpis.patients },
    { label: t('doctor.bi.kpiConsults'), value: d.kpis.consults },
    { label: t('doctor.bi.kpiPending'), value: d.kpis.pending },
    { label: t('doctor.bi.kpiMonthReports'), value: d.kpis.monthReports },
  ]
})

function baseTooltip() {
  return { backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e4e9f0', textStyle: { color: '#1f2d3d' } }
}

function render() {
  const d = data.value
  if (!d) return

  if (d.petScores.length) {
    scoreChart.setOption({
      tooltip: { trigger: 'axis', ...baseTooltip() },
      grid: { left: 40, right: 12, top: 20, bottom: 24 },
      xAxis: { type: 'category', data: d.petScores.map((p) => p.name), axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e4e9f0' } } },
      yAxis: { type: 'value', max: 100, axisLabel: axisStyle, splitLine: { lineStyle: { color: '#f0f3f8' } } },
      series: [
        {
          type: 'bar',
          data: d.petScores.map((p) => p.score),
          barWidth: 20,
          itemStyle: { borderRadius: [6, 6, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#33c6ba' }, { offset: 1, color: BRAND }] } },
        },
      ],
    })
  }

  if (d.speciesDist.length) {
    speciesChart.setOption({
      tooltip: { trigger: 'item', ...baseTooltip() },
      legend: { bottom: 0, textStyle: { color: '#5e6d82', fontSize: 11 } },
      color: PALETTE,
      series: [
        {
          type: 'pie',
          radius: ['42%', '70%'],
          center: ['50%', '44%'],
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          data: d.speciesDist.map((s) => ({ name: t(SPECIES_LABEL[s.name as keyof typeof SPECIES_LABEL] ?? s.name), value: s.value })),
        },
      ],
    })
  }

  if (d.abnormalDist.length) {
    abnormalChart.setOption({
      tooltip: { trigger: 'item', ...baseTooltip() },
      grid: { left: 70, right: 14, top: 12, bottom: 20 },
      xAxis: { type: 'value', axisLabel: axisStyle, splitLine: { lineStyle: { color: '#f0f3f8' } } },
      yAxis: { type: 'category', data: d.abnormalDist.map((a) => a.name), axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e4e9f0' } } },
      series: [
        {
          type: 'bar',
          data: d.abnormalDist.map((a) => a.value),
          barWidth: 12,
          itemStyle: { borderRadius: [0, 6, 6, 0], color: '#ff9f43' },
        },
      ],
    })
  }

  if (d.weeklyReports.length) {
    weeklyChart.setOption({
      tooltip: { trigger: 'axis', ...baseTooltip() },
      grid: { left: 36, right: 14, top: 20, bottom: 24 },
      xAxis: { type: 'category', data: d.weeklyReports.map((w) => w.day), axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e4e9f0' } } },
      yAxis: { type: 'value', axisLabel: axisStyle, splitLine: { lineStyle: { color: '#f0f3f8' } } },
      series: [
        {
          type: 'bar',
          data: d.weeklyReports.map((w) => w.value),
          barWidth: 16,
          itemStyle: { borderRadius: [6, 6, 0, 0], color: '#5b8ff9' },
        },
      ],
    })
  }

  const total = d.reviewRate.approved + d.reviewRate.rejected + d.reviewRate.pending
  const rate = total ? Math.round((d.reviewRate.approved / total) * 100) : 0
  rateChart.setOption({
    series: [
      {
        type: 'gauge',
        min: 0,
        max: 100,
        startAngle: 210,
        endAngle: -30,
        progress: { show: true, width: 14, roundCap: true, itemStyle: { color: BRAND } },
        axisLine: { lineStyle: { width: 14, color: [[1, '#eef1f5']] } },
        pointer: { itemStyle: { color: BRAND }, length: '60%' },
        axisTick: { show: false },
        splitLine: { length: 8, lineStyle: { color: '#fff', width: 2 } },
        axisLabel: { show: false },
        detail: { valueAnimation: true, formatter: '{value}%', fontSize: 24, color: '#1f2d3d', offsetCenter: [0, '72%'] },
        data: [{ value: rate, name: t('doctor.bi.reviewRate') }],
      },
    ],
  } as ECOption)
}

async function load() {
  loading.value = true
  try {
    data.value = await getDoctorBiApi()
    render()
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="bi-page">
    <van-skeleton :loading="loading" title :row="6" />

    <template v-if="data">
      <!-- KPI -->
      <div class="kpi-grid">
        <div v-for="k in kpis" :key="k.label" class="kpi-card sp-card">
          <div class="kpi-value">{{ k.value }}</div>
          <div class="kpi-label">{{ k.label }}</div>
        </div>
      </div>

      <!-- 问诊宠物健康均分 -->
      <div class="sp-card chart-card">
        <div class="card-title">{{ t('doctor.bi.petScore') }}</div>
        <div v-if="data.petScores.length" ref="scoreRef" class="chart" />
        <div v-else class="chart-empty">{{ t('common.empty') }}</div>
      </div>

      <!-- 患者品种分布 -->
      <div class="sp-card chart-card">
        <div class="card-title">{{ t('doctor.bi.speciesDist') }}</div>
        <div v-if="data.speciesDist.length" ref="speciesRef" class="chart" />
        <div v-else class="chart-empty">{{ t('common.empty') }}</div>
      </div>

      <!-- 报告异常类型分布 -->
      <div class="sp-card chart-card">
        <div class="card-title">{{ t('doctor.bi.abnormalDist') }}</div>
        <div v-if="data.abnormalDist.length" ref="abnormalRef" class="chart" />
        <div v-else class="chart-empty">{{ t('common.empty') }}</div>
      </div>

      <!-- 近 7 日报告量 -->
      <div class="sp-card chart-card">
        <div class="card-title">{{ t('doctor.bi.weeklyReports') }}</div>
        <div ref="weeklyRef" class="chart" />
      </div>

      <!-- 审核通过率 -->
      <div class="sp-card chart-card">
        <div class="card-title">
          {{ t('doctor.bi.reviewRate') }}
          <span class="sub">
            {{ data.reviewRate.approved }}/{{ data.reviewRate.approved + data.reviewRate.rejected + data.reviewRate.pending }}
          </span>
        </div>
        <div ref="rateRef" class="chart" />
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.bi-page {
  padding: 16px 14px;
  padding-top: 0;
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  .kpi-card {
    text-align: center;
    padding: 16px;
    .kpi-value {
      font-size: 24px;
      font-weight: 800;
      color: var(--sp-primary-dark);
    }
    .kpi-label {
      margin-top: 6px;
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
  }
}
.chart-card {
  margin-top: 12px;
  padding: 14px;
  .card-title {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 10px;
    .sub {
      font-size: 12px;
      font-weight: 400;
      color: var(--sp-text-placeholder);
    }
  }
  .chart {
    height: 220px;
  }
  .chart-empty {
    height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: var(--sp-text-placeholder);
  }
}
</style>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAdminBiPetApi } from '@/api/modules/bi'
import type { AdminBiPetData } from '@/types'
import { useEchart } from '@/composables/useEchart'
import type { ECOption } from '@/utils/echarts'
import { formatTime } from '@/utils/format'
import StatKpiCard from '@/components/StatKpiCard.vue'

const { t } = useI18n()

const data = ref<AdminBiPetData | null>(null)
const loading = ref(false)

const speciesRef = ref<HTMLElement | null>(null)
const cityRef = ref<HTMLElement | null>(null)
const abnormalDailyRef = ref<HTMLElement | null>(null)
const abnormalTopRef = ref<HTMLElement | null>(null)
const vitalsRef = ref<HTMLElement | null>(null)
const exerciseRef = ref<HTMLElement | null>(null)

const speciesChart = useEchart(speciesRef)
const cityChart = useEchart(cityRef)
const abnormalDailyChart = useEchart(abnormalDailyRef)
const abnormalTopChart = useEchart(abnormalTopRef)
const vitalsChart = useEchart(vitalsRef)
const exerciseChart = useEchart(exerciseRef)

const BRAND = '#72d1a8'
const PALETTE = ['#72d1a8', '#5b8ff9', '#ff9f43', '#ff6b6b', '#7d6bff', '#2bcbba']

const axisStyle = { color: '#a8b3ab', fontSize: 11 }

function baseTooltip() {
  return { trigger: 'axis' as const, backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e5e8eb', textStyle: { color: '#222222' } }
}

/** 归一化到 0-100（相对参考区间） */
function pct(v: number, min: number, max: number): number {
  if (max <= min) return 0
  return Math.max(0, Math.min(100, Math.round(((v - min) / (max - min)) * 1000) / 10))
}

const VITAL_META = [
  { key: 'temperature', labelKey: 'admin.biPet.legendTemperature', unit: '°C', min: 37.5, max: 39.5 },
  { key: 'heartRate', labelKey: 'admin.biPet.legendHeartRate', unit: '次/分', min: 60, max: 180 },
  { key: 'spo2', labelKey: 'admin.biPet.legendSpo2', unit: '%', min: 95, max: 100 },
  { key: 'respiratoryRate', labelKey: 'admin.biPet.legendRespiratoryRate', unit: '次/分', min: 10, max: 40 },
  { key: 'calorie', labelKey: 'admin.biPet.legendCalorie', unit: 'kcal', min: 0, max: 600 },
] as const

const EXERCISE_META = [
  { key: 'steps', labelKey: 'admin.biPet.legendSteps', unit: '步', min: 0, max: 12000 },
  { key: 'activeMin', labelKey: 'admin.biPet.legendActiveMin', unit: '分钟', min: 0, max: 150 },
  { key: 'sleep', labelKey: 'admin.biPet.legendSleep', unit: '小时', min: 0, max: 18 },
] as const

/** 生成多指标归一化平滑曲线图（rows 含 day 等非数值字段，读取时按数值强转） */
function buildNormalizedChart(
  days: string[],
  rows: Record<string, number | string>[],
  meta: readonly { key: string; labelKey: string; unit: string; min: number; max: number }[],
): ECOption {
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const list = (params as { dataIndex: number; seriesIndex: number }[]) ?? []
        if (!list.length) return ''
        const row = rows[list[0].dataIndex]
        const day = days[list[0].dataIndex] ?? ''
        const lines = list.map((p) => {
          const m = meta[p.seriesIndex]
          return `${t(m.labelKey)}：<b>${row?.[m.key] ?? '-'}${m.unit}</b>`
        })
        return `${day}<br/>${lines.join('<br/>')}`
      },
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e5e8eb',
      textStyle: { color: '#222222' },
    },
    legend: { data: meta.map((m) => t(m.labelKey)), top: 0, textStyle: { color: '#777777', fontSize: 12 }, type: 'scroll' },
    grid: { left: 40, right: 16, top: 32, bottom: 24 },
    xAxis: { type: 'category', data: days, axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e5e8eb' } } },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { ...axisStyle, formatter: '{value}%' }, splitLine: { lineStyle: { color: '#eef2ee' } } },
    color: PALETTE,
    series: meta.map((m) => ({
      name: t(m.labelKey),
      type: 'line' as const,
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2 },
      data: rows.map((r) => pct(Number(r[m.key]) || 0, m.min, m.max)),
    })),
  }
}

function render() {
  const d = data.value
  if (!d) return

  speciesChart.setOption({
    tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e5e8eb', textStyle: { color: '#222222' } },
    legend: { bottom: 0, textStyle: { color: '#777777', fontSize: 12 } },
    color: [BRAND, '#5b8ff9'],
    series: [
      {
        type: 'pie',
        radius: ['42%', '70%'],
        center: ['50%', '44%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: d.speciesDist,
      },
    ],
  })

  cityChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...{ backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e5e8eb', textStyle: { color: '#222222' } } },
    grid: { left: 56, right: 24, top: 16, bottom: 24 },
    xAxis: { type: 'value', axisLabel: axisStyle, splitLine: { lineStyle: { color: '#eef2ee' } } },
    yAxis: { type: 'category', inverse: true, data: d.cityRank.map((r) => r.name), axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e5e8eb' } } },
    series: [
      {
        type: 'bar',
        data: d.cityRank.map((r) => r.value),
        barWidth: 10,
        itemStyle: { borderRadius: [0, 6, 6, 0], color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#8fdcbb' }, { offset: 1, color: BRAND }] } },
        label: { show: true, position: 'right', color: '#555a52', fontSize: 11 },
      },
    ],
  })

  abnormalDailyChart.setOption({
    tooltip: baseTooltip(),
    grid: { left: 40, right: 16, top: 16, bottom: 24 },
    xAxis: { type: 'category', data: d.abnormalDaily.map((r) => r.day), axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e5e8eb' } } },
    yAxis: { type: 'value', axisLabel: axisStyle, splitLine: { lineStyle: { color: '#eef2ee' } } },
    series: [
      {
        type: 'line',
        data: d.abnormalDaily.map((r) => r.value),
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { color: '#ff6b6b', width: 2 },
        itemStyle: { color: '#ff6b6b' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(255,107,107,0.22)' }, { offset: 1, color: 'rgba(255,107,107,0.02)' }] } },
      },
    ],
  })

  abnormalTopChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...{ backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e5e8eb', textStyle: { color: '#222222' } } },
    grid: { left: 76, right: 24, top: 16, bottom: 24 },
    xAxis: { type: 'value', axisLabel: axisStyle, splitLine: { lineStyle: { color: '#eef2ee' } } },
    yAxis: { type: 'category', inverse: true, data: d.abnormalTop.map((r) => r.name), axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e5e8eb' } } },
    series: [
      {
        type: 'bar',
        data: d.abnormalTop.map((r) => r.value),
        barWidth: 10,
        itemStyle: { borderRadius: [0, 6, 6, 0], color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#ffc1a8' }, { offset: 1, color: '#ff9f43' }] } },
        label: { show: true, position: 'right', color: '#555a52', fontSize: 11 },
      },
    ],
  })

  vitalsChart.setOption(buildNormalizedChart(d.avgVitals.map((r) => r.day), d.avgVitals, VITAL_META))
  exerciseChart.setOption(buildNormalizedChart(d.exerciseTrend.map((r) => r.day), d.exerciseTrend, EXERCISE_META))
}

async function load() {
  loading.value = true
  try {
    data.value = await getAdminBiPetApi()
    render()
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-loading="loading">
    <!-- 顶部统计指标 -->
    <div class="kpi-grid">
      <StatKpiCard v-for="kpi in data?.kpis ?? []" :key="kpi.labelKey" :kpi="kpi" />
    </div>

    <!-- 猫狗 / 城市 / 异常趋势+指标 -->
    <el-row :gutter="16" class="mt-16">
      <el-col :span="8">
        <el-card shadow="never" class="row-fit">
          <template #header><span class="fw-600">{{ t('admin.biPet.titleSpecies') }}</span></template>
          <div ref="speciesRef" class="chart-md" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="row-fit">
          <template #header><span class="fw-600">{{ t('admin.biPet.titleCityRank') }}</span></template>
          <div ref="cityRef" class="chart-md" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="row-fit">
          <template #header><span class="fw-600">{{ t('admin.biPet.titleAbnormalDaily') }}</span></template>
          <div ref="abnormalDailyRef" class="chart-sm" />
          <div class="divider" />
          <div class="sub-title">{{ t('admin.biPet.titleAbnormalTop') }}</div>
          <div ref="abnormalTopRef" class="chart-sm" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 平均体征 / 运动指标 -->
    <el-row :gutter="16" class="mt-16">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.biPet.titleAvgVitals') }}</span></template>
          <div ref="vitalsRef" class="chart-lg" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.biPet.titleExercise') }}</span></template>
          <div ref="exerciseRef" class="chart-lg" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 异常宠物表格 -->
    <el-row class="mt-16">
      <el-col :span="24">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.biPet.titleAbnormalTable') }}</span></template>
          <el-table :data="data?.abnormalPets ?? []" size="default" stripe>
            <el-table-column prop="petName" :label="t('admin.biPet.colPet')" min-width="110" />
            <el-table-column prop="ownerName" :label="t('admin.biPet.colOwner')" min-width="120" />
            <el-table-column prop="species" :label="t('admin.biPet.colSpecies')" width="80" align="center" />
            <el-table-column :label="t('admin.biPet.colMetric')" min-width="110">
              <template #default="{ row }">
                <el-tag size="small" :type="row.level === 'danger' ? 'danger' : 'warning'" effect="light">{{ t(row.metricKey) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="detail" :label="t('admin.biPet.colDetail')" min-width="230" />
            <el-table-column :label="t('admin.biPet.colUpdatedAt')" min-width="150">
              <template #default="{ row }">{{ formatTime(row.updatedAt, 'MM-DD HH:mm') }}</template>
            </el-table-column>
            <el-table-column :label="t('admin.biPet.colLevel')" width="90" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="row.level === 'danger' ? 'danger' : 'warning'" effect="dark">
                  {{ t(row.level === 'danger' ? 'admin.biMonitor.levelDanger' : 'admin.biMonitor.levelWarn') }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.mt-16 {
  margin-top: 16px;
}
.row-fit {
  height: 348px;
}
.chart-lg {
  height: 260px;
}
.chart-md {
  height: 270px;
}
.chart-sm {
  height: 116px;
}
.sub-title {
  font-size: 12px;
  color: #a8b3ab;
  margin: 10px 0 4px;
}
.divider {
  height: 1px;
  background: #f0f3f1;
  margin: 10px 0;
}
</style>

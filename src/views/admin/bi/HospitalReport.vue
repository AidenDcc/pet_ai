<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAdminBiHospitalApi } from '@/api/modules/bi'
import type { AdminBiHospitalData } from '@/types'
import { useEchart } from '@/composables/useEchart'
import type { ECOption } from '@/utils/echarts'
import StatKpiCard from '@/components/StatKpiCard.vue'
import ChinaMapChart from '@/components/ChinaMapChart.vue'

const { t } = useI18n()

const data = ref<AdminBiHospitalData | null>(null)
const loading = ref(false)

const coopRef = ref<HTMLElement | null>(null)
const consultRef = ref<HTMLElement | null>(null)
const responseRef = ref<HTMLElement | null>(null)
const likeHospRef = ref<HTMLElement | null>(null)
const likeDocRef = ref<HTMLElement | null>(null)

const coopChart = useEchart(coopRef)
const consultChart = useEchart(consultRef)
const responseChart = useEchart(responseRef)
const likeHospChart = useEchart(likeHospRef)
const likeDocChart = useEchart(likeDocRef)

const BRAND = '#72d1a8'
const PALETTE = ['#72d1a8', '#5b8ff9', '#ff9f43', '#ff6b6b', '#7d6bff', '#2bcbba']

const axisStyle = { color: '#a8b3ab', fontSize: 11 }

function baseTooltip() {
  return { trigger: 'axis' as const, backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e5e8eb', textStyle: { color: '#222222' } }
}

function render() {
  const d = data.value
  if (!d) return

  coopChart.setOption({
    tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e5e8eb', textStyle: { color: '#222222' } },
    legend: { bottom: 0, textStyle: { color: '#777777', fontSize: 12 } },
    color: PALETTE,
    series: [
      {
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['50%', '44%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: d.cooperationDist,
      },
    ],
  })

  consultChart.setOption({
    tooltip: baseTooltip(),
    legend: { data: [t('admin.biHospital.legendConsults'), t('admin.biHospital.legendResolved')], top: 0, textStyle: { color: '#777777', fontSize: 12 } },
    grid: { left: 40, right: 12, top: 30, bottom: 22 },
    xAxis: { type: 'category', data: d.consultTrend.map((r) => r.day), axisLabel: { ...axisStyle, interval: 4 }, axisLine: { lineStyle: { color: '#e5e8eb' } } },
    yAxis: { type: 'value', axisLabel: axisStyle, splitLine: { lineStyle: { color: '#eef2ee' } } },
    color: [BRAND, '#5b8ff9'],
    series: [
      { name: t('admin.biHospital.legendConsults'), type: 'bar', data: d.consultTrend.map((r) => r.consults), barWidth: 4, itemStyle: { borderRadius: [3, 3, 0, 0], color: BRAND } },
      { name: t('admin.biHospital.legendResolved'), type: 'bar', data: d.consultTrend.map((r) => r.resolved), barWidth: 4, itemStyle: { borderRadius: [3, 3, 0, 0], color: '#5b8ff9' } },
    ],
  })

  responseChart.setOption({
    tooltip: baseTooltip(),
    grid: { left: 44, right: 12, top: 18, bottom: 22 },
    xAxis: { type: 'category', data: d.consultTrend.map((r) => r.day), axisLabel: { ...axisStyle, interval: 4 }, axisLine: { lineStyle: { color: '#e5e8eb' } } },
    yAxis: { type: 'value', name: t('admin.bi.minutes'), nameTextStyle: { color: '#a8b3ab' }, axisLabel: axisStyle, splitLine: { lineStyle: { color: '#eef2ee' } } },
    series: [
      {
        name: t('admin.biHospital.legendResponseMin'),
        type: 'line',
        data: d.consultTrend.map((r) => r.responseMin),
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { color: '#ff9f43', width: 3 },
        itemStyle: { color: '#ff9f43' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(255,159,67,0.22)' }, { offset: 1, color: 'rgba(255,159,67,0.02)' }] } },
      },
    ],
  })

  buildRank(likeHospChart, d.likeHospitals)
  buildRank(likeDocChart, d.likeDoctors)
}

/** 横向条形排行 */
function buildRank(chart: { setOption: (o: ECOption) => void }, list: AdminBiHospitalData['likeHospitals']) {
  chart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...{ backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e5e8eb', textStyle: { color: '#222222' } } },
    grid: { left: 88, right: 36, top: 12, bottom: 20 },
    xAxis: { type: 'value', axisLabel: axisStyle, splitLine: { lineStyle: { color: '#eef2ee' } } },
    yAxis: { type: 'category', inverse: true, data: list.map((r) => r.name), axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e5e8eb' } } },
    series: [
      {
        type: 'bar',
        data: list.map((r) => r.value),
        barWidth: 12,
        itemStyle: { borderRadius: [0, 6, 6, 0], color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#8fdcbb' }, { offset: 1, color: BRAND }] } },
        label: { show: true, position: 'right', color: '#555a52', fontSize: 11, formatter: (p: unknown) => `${(p as { value?: number })?.value ?? 0} 赞` },
      },
    ],
  })
}

async function load() {
  loading.value = true
  try {
    data.value = await getAdminBiHospitalApi()
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

    <!-- 合作方式 / 地图 / 问诊趋势 -->
    <el-row :gutter="16" class="mt-16">
      <el-col :span="8">
        <el-card shadow="never" class="row-fit">
          <template #header><span class="fw-600">{{ t('admin.biHospital.titleCooperation') }}</span></template>
          <div ref="coopRef" class="chart-md" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="row-fit">
          <template #header><span class="fw-600">{{ t('admin.biHospital.titleProvinceMap') }}</span></template>
          <ChinaMapChart :data="data?.provinceHospitals ?? []" :title="t('admin.biHospital.kpiHospitals')" height="300px" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="row-fit">
          <template #header><span class="fw-600">{{ t('admin.biHospital.titleConsultTrend') }}</span></template>
          <div ref="consultRef" class="chart-sm" />
          <div class="divider" />
          <div class="sub-title">{{ t('admin.biHospital.titleResponseTrend') }}</div>
          <div ref="responseRef" class="chart-sm" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 点赞排行 -->
    <el-row :gutter="16" class="mt-16">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.biHospital.titleLikeHospitals') }}</span></template>
          <div ref="likeHospRef" class="chart-lg" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.biHospital.titleLikeDoctors') }}</span></template>
          <div ref="likeDocRef" class="chart-lg" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 16px;
}
.mt-16 {
  margin-top: 16px;
}
.row-fit {
  height: 366px;
}
.chart-lg {
  height: 260px;
}
.chart-md {
  height: 282px;
}
.chart-sm {
  height: 128px;
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

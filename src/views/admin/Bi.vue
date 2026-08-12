<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAdminBiApi } from '@/api/modules/bi'
import type { AdminBiData } from '@/types'
import { useEchart } from '@/composables/useEchart'
import { money } from '@/utils/format'
import { DEVICE_STATUS } from '@/utils/consts'
import type { ECOption } from '@/utils/echarts'

const { t } = useI18n()

const data = ref<AdminBiData | null>(null)
const loading = ref(false)

const trendRef = ref<HTMLElement | null>(null)
const planRef = ref<HTMLElement | null>(null)
const deviceRef = ref<HTMLElement | null>(null)
const abnormalRef = ref<HTMLElement | null>(null)
const growthRef = ref<HTMLElement | null>(null)

const trendChart = useEchart(trendRef)
const planChart = useEchart(planRef)
const deviceChart = useEchart(deviceRef)
const abnormalChart = useEchart(abnormalRef)
const growthChart = useEchart(growthRef)

const BRAND = '#72d1a8'
const PALETTE = ['#72d1a8', '#5b8ff9', '#ff9f43', '#ff6b6b', '#7d6bff', '#2bcbba']

function baseTooltip() {
  return { trigger: 'axis' as const, backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e5e8eb', textStyle: { color: '#222222' } }
}
const axisStyle = { color: '#a8b3ab', fontSize: 11 }

function render() {
  const d = data.value
  if (!d) return

  trendChart.setOption({
    tooltip: baseTooltip(),
    legend: { data: [t('admin.bi.revenue'), t('admin.bi.orders')], top: 0, textStyle: { color: '#777777' } },
    grid: { left: 56, right: 52, top: 30, bottom: 24 },
    xAxis: { type: 'category', data: d.revenueTrend.map((r) => r.day), axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e5e8eb' } } },
    yAxis: [
      { type: 'value', name: t('admin.bi.yuan'), nameTextStyle: { color: '#a8b3ab' }, axisLabel: axisStyle, splitLine: { lineStyle: { color: '#eef2ee' } } },
      { type: 'value', name: t('admin.bi.units'), nameTextStyle: { color: '#a8b3ab' }, axisLabel: axisStyle, splitLine: { show: false } },
    ],
    series: [
      {
        name: t('admin.bi.revenue'),
        type: 'line',
        yAxisIndex: 0,
        data: d.revenueTrend.map((r) => r.revenue),
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: BRAND, width: 3 },
        itemStyle: { color: BRAND },
        areaStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(114,209,168,0.28)' }, { offset: 1, color: 'rgba(114,209,168,0.02)' }] },
        },
      },
      {
        name: t('admin.bi.orders'),
        type: 'bar',
        yAxisIndex: 1,
        data: d.revenueTrend.map((r) => r.orders),
        barWidth: 10,
        itemStyle: { borderRadius: [4, 4, 0, 0], color: '#ff9f43' },
      },
    ],
  } as ECOption)

  planChart.setOption({
    tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e5e8eb', textStyle: { color: '#222222' } },
    legend: { bottom: 0, textStyle: { color: '#777777', fontSize: 11 } },
    color: PALETTE,
    series: [
      {
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['50%', '44%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: d.planRevenue,
      },
    ],
  })

  const totalDevices = d.deviceStatus.reduce((s, x) => s + x.value, 0)
  const online = d.deviceStatus.find((x) => x.name === 'online')?.value ?? 0
  const onlineRate = totalDevices ? Math.round((online / totalDevices) * 100) : 0
  deviceChart.setOption({
    series: [
      {
        type: 'gauge',
        min: 0,
        max: 100,
        startAngle: 210,
        endAngle: -30,
        progress: { show: true, width: 16, roundCap: true, itemStyle: { color: BRAND } },
        axisLine: { lineStyle: { width: 16, color: [[1, '#eef2ee']] } },
        pointer: { itemStyle: { color: BRAND }, length: '60%' },
        axisTick: { show: false },
        splitLine: { length: 8, lineStyle: { color: '#fff', width: 2 } },
        axisLabel: { show: false },
        detail: { valueAnimation: true, formatter: '{value}%', fontSize: 26, color: '#222222', offsetCenter: [0, '72%'] },
        data: [{ value: onlineRate, name: t('admin.bi.deviceStatus') }],
      },
    ],
  } as ECOption)

  abnormalChart.setOption({
    tooltip: baseTooltip(),
    grid: { left: 90, right: 16, top: 16, bottom: 24 },
    xAxis: { type: 'value', axisLabel: axisStyle, splitLine: { lineStyle: { color: '#eef2ee' } } },
    yAxis: { type: 'category', data: d.abnormalDist.map((a) => a.name), axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e5e8eb' } } },
    series: [
      {
        type: 'bar',
        data: d.abnormalDist.map((a) => a.value),
        barWidth: 12,
        itemStyle: { borderRadius: [0, 6, 6, 0], color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#8fdcbb' }, { offset: 1, color: BRAND }] } },
      },
    ],
  })

  growthChart.setOption({
    tooltip: baseTooltip(),
    legend: { data: [t('admin.bi.users'), t('admin.bi.vets')], bottom: 0, textStyle: { color: '#777777' } },
    grid: { left: 44, right: 16, top: 16, bottom: 44 },
    xAxis: { type: 'category', data: d.growthTrend.map((g) => g.day), axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e5e8eb' } } },
    yAxis: { type: 'value', axisLabel: axisStyle, splitLine: { lineStyle: { color: '#eef2ee' } } },
    color: [BRAND, '#5b8ff9'],
    series: [
      { name: t('admin.bi.users'), type: 'line', data: d.growthTrend.map((g) => g.users), smooth: true, symbol: 'none' },
      { name: t('admin.bi.vets'), type: 'line', data: d.growthTrend.map((g) => g.vets), smooth: true, symbol: 'none' },
    ],
  })
}

async function load() {
  loading.value = true
  try {
    data.value = await getAdminBiApi()
    render()
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-loading="loading">
    <el-row :gutter="16">
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value">{{ data ? money(data.kpis.revenue) : '-' }}</div>
          <div class="stat-label">{{ t('admin.bi.kpiRevenue') }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value">{{ data?.kpis.orders ?? '-' }}</div>
          <div class="stat-label">{{ t('admin.bi.kpiOrders') }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value text-primary">{{ data?.kpis.users ?? '-' }}</div>
          <div class="stat-label">{{ t('admin.bi.kpiUsers') }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value text-success">{{ data?.kpis.devices ?? '-' }}</div>
          <div class="stat-label">{{ t('admin.bi.kpiDevices') }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt-16">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.bi.revenueOrderTrend') }}</span></template>
          <div ref="trendRef" class="chart-lg" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.bi.planRevenue') }}</span></template>
          <div ref="planRef" class="chart-lg" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt-16">
      <el-col :span="8">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.bi.deviceStatus') }}</span></template>
          <div ref="deviceRef" class="chart-md" />
          <div class="device-legend">
            <span v-for="s in data?.deviceStatus ?? []" :key="s.name" class="legend-item">
              {{ t(DEVICE_STATUS[s.name]?.labelKey ?? s.name) }} {{ s.value }}
            </span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.bi.abnormalDist') }}</span></template>
          <div ref="abnormalRef" class="chart-md" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.bi.growthTrend') }}</span></template>
          <div ref="growthRef" class="chart-md" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.stat-card {
  text-align: center;
  .stat-value {
    font-size: 24px;
    font-weight: 800;
  }
  .stat-label {
    margin-top: 6px;
    font-size: 13px;
    color: var(--sp-text-secondary);
  }
}
.chart-lg {
  height: 260px;
}
.chart-md {
  height: 230px;
}
.mt-16 {
  margin-top: 16px;
}
.device-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 6px;
  font-size: 12px;
  color: var(--sp-text-secondary);
}
</style>

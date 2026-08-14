<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAdminBiDeviceApi } from '@/api/modules/bi'
import type { AdminBiDeviceData } from '@/types'
import { useEchart } from '@/composables/useEchart'
import type { ECOption } from '@/utils/echarts'
import { formatDateTime } from '@/utils/format'
import StatKpiCard from '@/components/StatKpiCard.vue'

const { t } = useI18n()

const data = ref<AdminBiDeviceData | null>(null)
const loading = ref(false)

const newRef = ref<HTMLElement | null>(null)
const onlineRef = ref<HTMLElement | null>(null)

const newChart = useEchart(newRef)
const onlineChart = useEchart(onlineRef)

const BRAND = '#72d1a8'
const BLUE = '#5b8ff9'
const ORANGE = '#ff9f43'

const axisStyle = { color: '#a8b3ab', fontSize: 11 }

function baseTooltip() {
  return { trigger: 'axis' as const, backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e5e8eb', textStyle: { color: '#222222' } }
}

function render() {
  const d = data.value
  if (!d) return

  newChart.setOption({
    tooltip: baseTooltip(),
    legend: { data: [t('admin.biDevice.legendNewDevices'), t('admin.biDevice.legendTotalDevices')], top: 0, textStyle: { color: '#777777', fontSize: 12 } },
    grid: { left: 60, right: 56, top: 32, bottom: 24 },
    xAxis: { type: 'category', data: d.newTrend.map((r) => r.day), axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e5e8eb' } } },
    yAxis: [
      { type: 'value', axisLabel: { ...axisStyle, formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v) }, splitLine: { lineStyle: { color: '#eef2ee' } } },
      { type: 'value', axisLabel: { ...axisStyle, formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v) }, splitLine: { show: false } },
    ],
    color: [BRAND, BLUE],
    series: [
      {
        name: t('admin.biDevice.legendNewDevices'),
        type: 'bar',
        yAxisIndex: 0,
        data: d.newTrend.map((r) => r.newDevices),
        barWidth: 8,
        itemStyle: { borderRadius: [4, 4, 0, 0], color: BRAND },
      },
      {
        name: t('admin.biDevice.legendTotalDevices'),
        type: 'line',
        yAxisIndex: 1,
        data: d.newTrend.map((r) => r.totalDevices),
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: BLUE, width: 3 },
        itemStyle: { color: BLUE },
      },
    ],
  } as ECOption)

  onlineChart.setOption({
    tooltip: baseTooltip(),
    legend: { data: [t('admin.biDevice.legendOnlineCount'), t('admin.biDevice.legendAvgDuration')], top: 0, textStyle: { color: '#777777', fontSize: 12 } },
    grid: { left: 60, right: 56, top: 32, bottom: 24 },
    xAxis: { type: 'category', data: d.onlineTrend.map((r) => r.day), axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e5e8eb' } } },
    yAxis: [
      { type: 'value', axisLabel: { ...axisStyle, formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v) }, splitLine: { lineStyle: { color: '#eef2ee' } } },
      { type: 'value', name: t('admin.bi.minutes'), nameTextStyle: { color: '#a8b3ab' }, axisLabel: axisStyle, splitLine: { show: false } },
    ],
    color: [BLUE, ORANGE],
    series: [
      {
        name: t('admin.biDevice.legendOnlineCount'),
        type: 'line',
        data: d.onlineTrend.map((r) => r.online),
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: BLUE, width: 3 },
        itemStyle: { color: BLUE },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(91,143,249,0.22)' }, { offset: 1, color: 'rgba(91,143,249,0.02)' }] } },
      },
      {
        name: t('admin.biDevice.legendAvgDuration'),
        type: 'line',
        yAxisIndex: 1,
        data: d.onlineTrend.map((r) => r.avgDuration),
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: ORANGE, width: 3 },
        itemStyle: { color: ORANGE },
      },
    ],
  } as ECOption)
}

async function load() {
  loading.value = true
  try {
    data.value = await getAdminBiDeviceApi()
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

    <!-- 中部左右：30 天设备趋势 -->
    <el-row :gutter="16" class="mt-16">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.biDevice.titleNewTrend') }}</span></template>
          <div ref="newRef" class="chart-lg" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.biDevice.titleOnlineTrend') }}</span></template>
          <div ref="onlineRef" class="chart-lg" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 异常设备表格 -->
    <el-row class="mt-16">
      <el-col :span="24">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.biDevice.titleAbnormal') }}</span></template>
          <el-table :data="data?.abnormalDevices ?? []" size="default" stripe>
            <el-table-column prop="sn" :label="t('admin.biDevice.colSn')" min-width="130" />
            <el-table-column prop="name" :label="t('admin.biDevice.colName')" min-width="120" />
            <el-table-column prop="petName" :label="t('admin.biDevice.colPet')" min-width="110" />
            <el-table-column :label="t('admin.biDevice.colType')" min-width="110">
              <template #default="{ row }">
                <el-tag size="small" type="warning" effect="light">{{ t(row.typeKey) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="detail" :label="t('admin.biDevice.colDetail')" min-width="220" />
            <el-table-column :label="t('admin.biDevice.colLastSync')" min-width="160">
              <template #default="{ row }">{{ formatDateTime(row.lastSyncAt) }}</template>
            </el-table-column>
            <el-table-column :label="t('admin.biDevice.colStatus')" width="100" align="center">
              <template #default>
                <el-tag size="small" type="danger" effect="dark">{{ t('admin.biDevice.statusAbnormal') }}</el-tag>
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
.mt-16 {
  margin-top: 16px;
}
.chart-lg {
  height: 260px;
}
</style>

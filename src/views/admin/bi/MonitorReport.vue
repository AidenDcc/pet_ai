<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAdminBiMonitorApi } from '@/api/modules/bi'
import type { AdminBiMonitorData } from '@/types'
import { useEchart } from '@/composables/useEchart'
import type { ECOption } from '@/utils/echarts'
import { formatTime } from '@/utils/format'
import StatKpiCard from '@/components/StatKpiCard.vue'
import ChinaMapChart from '@/components/ChinaMapChart.vue'

const { t } = useI18n()

const data = ref<AdminBiMonitorData | null>(null)
const loading = ref(false)

const userRef = ref<HTMLElement | null>(null)
const deviceRef = ref<HTMLElement | null>(null)
const retentionRef = ref<HTMLElement | null>(null)
const consultRef = ref<HTMLElement | null>(null)

const userChart = useEchart(userRef)
const deviceChart = useEchart(deviceRef)
const retentionChart = useEchart(retentionRef)
const consultChart = useEchart(consultRef)

const BRAND = '#72d1a8'
const ORANGE = '#ff9f43'
const alertHeight = '250px'

const axisStyle = { color: '#a8b3ab', fontSize: 11 }

function baseTooltip() {
  return { trigger: 'axis' as const, backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e5e8eb', textStyle: { color: '#222222' } }
}

function render() {
  const d = data.value
  if (!d) return

  userChart.setOption({
    tooltip: baseTooltip(),
    legend: { data: [t('admin.biMonitor.legendDau'), t('admin.biMonitor.legendNewUsers')], top: 0, textStyle: { color: '#777777', fontSize: 12 } },
    grid: { left: 56, right: 52, top: 32, bottom: 24 },
    xAxis: { type: 'category', data: d.userTrend.map((r) => r.day), axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e5e8eb' } } },
    yAxis: [
      { type: 'value', axisLabel: { ...axisStyle, formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v) }, splitLine: { lineStyle: { color: '#eef2ee' } } },
      { type: 'value', axisLabel: axisStyle, splitLine: { show: false } },
    ],
    color: [BRAND, ORANGE],
    series: [
      {
        name: t('admin.biMonitor.legendDau'),
        type: 'line',
        yAxisIndex: 0,
        data: d.userTrend.map((r) => r.dau),
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: BRAND, width: 3 },
        itemStyle: { color: BRAND },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(114,209,168,0.28)' }, { offset: 1, color: 'rgba(114,209,168,0.02)' }] } },
      },
      {
        name: t('admin.biMonitor.legendNewUsers'),
        type: 'bar',
        yAxisIndex: 1,
        data: d.userTrend.map((r) => r.newUsers),
        barWidth: 8,
        itemStyle: { borderRadius: [4, 4, 0, 0], color: ORANGE },
      },
    ],
  } as ECOption)

  deviceChart.setOption({
    tooltip: baseTooltip(),
    legend: { data: [t('admin.biMonitor.legendActiveDevices'), t('admin.biMonitor.legendActivatedDevices')], top: 0, textStyle: { color: '#777777', fontSize: 12 } },
    grid: { left: 60, right: 56, top: 32, bottom: 24 },
    xAxis: { type: 'category', data: d.deviceTrend.map((r) => r.day), axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e5e8eb' } } },
    yAxis: [
      { type: 'value', axisLabel: { ...axisStyle, formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v) }, splitLine: { lineStyle: { color: '#eef2ee' } } },
      { type: 'value', axisLabel: { ...axisStyle, formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v) }, splitLine: { show: false } },
    ],
    color: ['#5b8ff9', BRAND],
    series: [
      { name: t('admin.biMonitor.legendActiveDevices'), type: 'line', data: d.deviceTrend.map((r) => r.active), smooth: true, symbol: 'circle', symbolSize: 5, lineStyle: { width: 3 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(91,143,249,0.22)' }, { offset: 1, color: 'rgba(91,143,249,0.02)' }] } } },
      { name: t('admin.biMonitor.legendActivatedDevices'), type: 'line', yAxisIndex: 1, data: d.deviceTrend.map((r) => r.activated), smooth: true, symbol: 'circle', symbolSize: 5, lineStyle: { color: BRAND, width: 3 }, itemStyle: { color: BRAND } },
    ],
  } as ECOption)

  retentionChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...{ backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e5e8eb', textStyle: { color: '#222222' } } },
    grid: { left: 44, right: 16, top: 24, bottom: 24 },
    xAxis: { type: 'category', data: d.retention.map((r) => t(r.labelKey)), axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e5e8eb' } } },
    yAxis: { type: 'value', axisLabel: { ...axisStyle, formatter: (v: number) => `${v}%` }, splitLine: { lineStyle: { color: '#eef2ee' } } },
    series: [
      {
        type: 'bar',
        data: d.retention.map((r) => r.value),
        barWidth: 30,
        itemStyle: { borderRadius: [6, 6, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#72d1a8' }, { offset: 1, color: '#4c9a7c' }] } },
        label: { show: true, position: 'top', formatter: '{c}%', color: '#555a52', fontSize: 12 },
      },
    ],
  })

  consultChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...{ backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e5e8eb', textStyle: { color: '#222222' } } },
    grid: { left: 92, right: 24, top: 16, bottom: 24 },
    xAxis: { type: 'value', axisLabel: axisStyle, splitLine: { lineStyle: { color: '#eef2ee' } } },
    yAxis: { type: 'category', inverse: true, data: d.hospitalConsultRank.map((r) => r.name), axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e5e8eb' } } },
    series: [
      {
        type: 'bar',
        data: d.hospitalConsultRank.map((r) => r.value),
        barWidth: 12,
        itemStyle: { borderRadius: [0, 6, 6, 0], color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#8fdcbb' }, { offset: 1, color: BRAND }] } },
        label: { show: true, position: 'right', color: '#555a52', fontSize: 11 },
      },
    ],
  })
}

async function load() {
  loading.value = true
  try {
    data.value = await getAdminBiMonitorApi()
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

    <!-- 中部左右：30 天趋势 -->
    <el-row :gutter="16" class="mt-16">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.biMonitor.titleUserTrend') }}</span></template>
          <div ref="userRef" class="chart-lg" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.biMonitor.titleDeviceTrend') }}</span></template>
          <div ref="deviceRef" class="chart-lg" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 中间：各省区激活设备地图 -->
    <el-row class="mt-16">
      <el-col :span="24">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.biMonitor.titleMap') }}</span></template>
          <ChinaMapChart :data="data?.provinceDevices ?? []" :title="t('admin.biMonitor.kpiActivatedDevices')" height="380px" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 下面：告警轮播 / 用户留存 / 问诊排行 -->
    <el-row :gutter="16" class="mt-16">
      <el-col :span="6">
        <el-card shadow="never" class="card-fit">
          <template #header><span class="fw-600">{{ t('admin.biMonitor.titleAlerts') }}</span></template>
          <el-carousel v-if="(data?.alerts ?? []).length" direction="vertical" :height="alertHeight" :interval="3500" indicator-position="none" class="alert-carousel">
            <el-carousel-item v-for="a in data!.alerts" :key="a.id">
              <div class="alert-item" :class="`is-${a.level}`">
                <div class="alert-head">
                  <el-tag :type="a.level === 'danger' ? 'danger' : 'warning'" size="small" effect="light">
                    {{ t(a.level === 'danger' ? 'admin.biMonitor.levelDanger' : 'admin.biMonitor.levelWarn') }}
                  </el-tag>
                  <span class="alert-pet">{{ a.petName }}</span>
                  <span class="alert-time">{{ formatTime(a.time) }}</span>
                </div>
                <div class="alert-content">{{ a.content }}</div>
              </div>
            </el-carousel-item>
          </el-carousel>
          <el-empty v-else :description="t('admin.biMonitor.empty')" :image-size="60" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never" class="card-fit">
          <template #header><span class="fw-600">{{ t('admin.biMonitor.titleRetention') }}</span></template>
          <div ref="retentionRef" class="chart-fit" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="card-fit">
          <template #header><span class="fw-600">{{ t('admin.biMonitor.titleConsultRank') }}</span></template>
          <div ref="consultRef" class="chart-fit" />
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
.chart-lg {
  height: 260px;
}
.card-fit {
  height: 320px;
}
.chart-fit {
  height: 250px;
}
.alert-carousel {
  height: 250px;
}
.alert-item {
  height: 100%;
  padding: 14px 16px;
  border-radius: 10px;
  box-sizing: border-box;
  border: 1px solid #eef2ee;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fbfefc;
}
.alert-item.is-danger {
  background: rgba(255, 107, 107, 0.05);
  border-color: rgba(255, 107, 107, 0.25);
}
.alert-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.alert-pet {
  font-size: 15px;
  font-weight: 700;
  color: #222;
}
.alert-time {
  margin-left: auto;
  font-size: 12px;
  color: #a8b3ab;
}
.alert-content {
  font-size: 13px;
  color: #555a52;
  line-height: 1.6;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}
</style>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAdminOverviewApi, type OverviewData } from '@/api/modules/admin'
import { useEchart } from '@/composables/useEchart'
import { money } from '@/utils/format'

const { t } = useI18n()

const data = ref<OverviewData | null>(null)
const loading = ref(false)

const revenueRef = ref<HTMLElement | null>(null)
const deviceRef = ref<HTMLElement | null>(null)
const planRef = ref<HTMLElement | null>(null)
const activityRef = ref<HTMLElement | null>(null)

const revenueChart = useEchart(revenueRef)
const deviceChart = useEchart(deviceRef)
const planChart = useEchart(planRef)
const activityChart = useEchart(activityRef)

const BRAND = '#00b4a6'
const PALETTE = ['#00b4a6', '#5b8ff9', '#ff9f43', '#ff6b6b', '#7d6bff', '#2bcbba']

function baseTooltip() {
  return { trigger: 'axis' as const, backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e4e9f0', textStyle: { color: '#1f2d3d' } }
}

function render() {
  const d = data.value
  if (!d) return
  const axisStyle = { color: '#a3b0c0', fontSize: 11 }

  revenueChart.setOption({
    tooltip: baseTooltip(),
    grid: { left: 52, right: 16, top: 24, bottom: 24 },
    xAxis: { type: 'category', data: d.revenueTrend.labels, axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e4e9f0' } } },
    yAxis: { type: 'value', axisLabel: { ...axisStyle, formatter: (v: number) => `${Math.round(v / 1000)}k` }, splitLine: { lineStyle: { color: '#f0f3f8' } } },
    series: [
      {
        type: 'line',
        data: d.revenueTrend.values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: BRAND, width: 3 },
        itemStyle: { color: BRAND },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0,180,166,0.30)' },
              { offset: 1, color: 'rgba(0,180,166,0.02)' },
            ],
          },
        },
      },
    ],
  })

  deviceChart.setOption({
    tooltip: { trigger: 'item', ...{ backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e4e9f0', textStyle: { color: '#1f2d3d' } } },
    legend: { bottom: 0, textStyle: { color: '#5e6d82', fontSize: 11 } },
    color: PALETTE,
    series: [
      {
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '44%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: d.deviceStatus,
      },
    ],
  })

  planChart.setOption({
    tooltip: { trigger: 'item', ...{ backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e4e9f0', textStyle: { color: '#1f2d3d' } } },
    legend: { bottom: 0, textStyle: { color: '#5e6d82', fontSize: 11 } },
    color: PALETTE,
    series: [
      {
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '44%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: d.planDistribution,
      },
    ],
  })

  activityChart.setOption({
    tooltip: baseTooltip(),
    grid: { left: 46, right: 16, top: 24, bottom: 24 },
    xAxis: { type: 'category', data: d.activationTrend.labels, axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e4e9f0' } } },
    yAxis: { type: 'value', axisLabel: axisStyle, splitLine: { lineStyle: { color: '#f0f3f8' } } },
    color: [BRAND],
    series: [
      {
        type: 'bar',
        data: d.activationTrend.values,
        barWidth: 18,
        itemStyle: { borderRadius: [6, 6, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#33c6ba' }, { offset: 1, color: BRAND }] } },
      },
    ],
  })
}

async function load() {
  loading.value = true
  try {
    data.value = await getAdminOverviewApi()
    render()
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-loading="loading">
    <!-- 统计卡片 -->
    <el-row :gutter="16">
      <el-col :span="4">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value">{{ data?.stats.totalDevices ?? '-' }}</div>
          <div class="stat-label">{{ t('admin.dashboard.devices') }}</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value text-success">{{ data?.stats.activeDevices ?? '-' }}</div>
          <div class="stat-label">{{ t('admin.dashboard.onlineDevices') }}</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value">{{ data?.stats.totalUsers ?? '-' }}</div>
          <div class="stat-label">{{ t('admin.dashboard.users') }}</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value text-primary">{{ data?.stats.onlinePets ?? '-' }}</div>
          <div class="stat-label">{{ t('admin.dashboard.onlinePets') }}</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value text-warning">{{ data?.stats.pendingVets ?? '-' }}</div>
          <div class="stat-label">{{ t('admin.dashboard.pendingVets') }}</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value">{{ data ? money(data.stats.monthlyRevenue) : '-' }}</div>
          <div class="stat-label">{{ t('admin.dashboard.monthRevenue') }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt-16">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.dashboard.revenueTrend') }}</span></template>
          <div ref="revenueRef" class="chart-lg" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.dashboard.deviceStatus') }}</span></template>
          <div ref="deviceRef" class="chart-lg" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt-16">
      <el-col :span="8">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.dashboard.deviceActivation') }}</span></template>
          <div ref="activityRef" class="chart-md" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.dashboard.planDist') }}</span></template>
          <div ref="planRef" class="chart-md" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header><span class="fw-600">{{ t('admin.dashboard.bizOverview') }}</span></template>
          <div class="overview-list">
            <div class="overview-item">
              <span>{{ t('admin.dashboard.totalRevenue') }}</span>
              <span class="fw-600">{{ data ? money(data.stats.totalRevenue) : '-' }}</span>
            </div>
            <div class="overview-item">
              <span>{{ t('admin.dashboard.activationRate') }}</span>
              <span class="fw-600 text-primary">
                {{ data ? Math.round((data.stats.activeDevices / Math.max(data.stats.totalDevices, 1)) * 100) : '-' }}%
              </span>
            </div>
            <div class="overview-item">
              <span>{{ t('admin.dashboard.vetPassRate') }}</span>
              <span class="fw-600 text-success">82%</span>
            </div>
            <div class="overview-item">
              <span>{{ t('admin.dashboard.newUsers') }}</span>
              <span class="fw-600">{{ data?.userGrowth.values[data.userGrowth.values.length - 1] ?? '-' }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.stat-card {
  text-align: center;
  .stat-value {
    font-size: 26px;
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
  height: 220px;
}
.mt-16 {
  margin-top: 16px;
}
.overview-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 8px 4px;
}
.overview-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: var(--sp-text-secondary);
}
</style>

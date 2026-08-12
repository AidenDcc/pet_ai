<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAdminOverviewApi, type OverviewData } from '@/api/modules/admin'
import { useAuthStore } from '@/stores/auth'
import { ROLE_LABEL } from '@/utils/consts'
import { useEchart } from '@/composables/useEchart'
import { money } from '@/utils/format'
import type { Role } from '@/types'

const { t } = useI18n()
const auth = useAuthStore()

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

const BRAND = '#72d1a8'
const PALETTE = ['#72d1a8', '#5b8ff9', '#ff9f43', '#ff6b6b', '#7d6bff', '#2bcbba']

const roleLabel = computed(() => (auth.role ? t(ROLE_LABEL[auth.role as Role]) : ''))

function baseTooltip() {
  return { trigger: 'axis' as const, backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e5e8eb', textStyle: { color: '#222222' } }
}

function render() {
  const d = data.value
  if (!d) return
  const axisStyle = { color: '#a8b3ab', fontSize: 11 }

  revenueChart.setOption({
    tooltip: baseTooltip(),
    grid: { left: 52, right: 16, top: 24, bottom: 24 },
    xAxis: { type: 'category', data: d.revenueTrend.labels, axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e5e8eb' } } },
    yAxis: { type: 'value', axisLabel: { ...axisStyle, formatter: (v: number) => `${Math.round(v / 1000)}k` }, splitLine: { lineStyle: { color: '#eef2ee' } } },
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
              { offset: 0, color: 'rgba(114,209,168,0.30)' },
              { offset: 1, color: 'rgba(114,209,168,0.02)' },
            ],
          },
        },
      },
    ],
  })

  deviceChart.setOption({
    tooltip: { trigger: 'item', ...{ backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e5e8eb', textStyle: { color: '#222222' } } },
    legend: { bottom: 0, textStyle: { color: '#777777', fontSize: 11 } },
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
    tooltip: { trigger: 'item', ...{ backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e5e8eb', textStyle: { color: '#222222' } } },
    legend: { bottom: 0, textStyle: { color: '#777777', fontSize: 11 } },
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
    xAxis: { type: 'category', data: d.activationTrend.labels, axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e5e8eb' } } },
    yAxis: { type: 'value', axisLabel: axisStyle, splitLine: { lineStyle: { color: '#eef2ee' } } },
    color: [BRAND],
    series: [
      {
        type: 'bar',
        data: d.activationTrend.values,
        barWidth: 18,
        itemStyle: { borderRadius: [6, 6, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#8fdcbb' }, { offset: 1, color: BRAND }] } },
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
    <!-- 欢迎横幅卡片：浅薄荷渐变 + 右上角悬浮账号面板 -->
    <el-card shadow="never" class="welcome-card">
      <div class="welcome-inner">
        <div class="welcome-left">
          <h2 class="welcome-title">{{ t('admin.dashboard.welcome', { name: auth.user?.name ?? '' }) }}</h2>
          <p class="welcome-desc">{{ t('admin.dashboard.welcomeDesc') }}</p>
          <div class="welcome-tags">
            <el-tag size="small" effect="light" type="primary">{{ roleLabel }}</el-tag>
            <el-tag size="small" effect="light" class="status-tag">
              <span class="dot" />{{ t('status.online') }}
            </el-tag>
            <span class="workbench-tag">{{ t('admin.dashboard.workbenchTag') }}</span>
          </div>
        </div>
        <div class="account-panel">
          <div class="account-title">{{ t('admin.dashboard.accountPanel') }}</div>
          <div class="account-row">
            <span>{{ t('admin.dashboard.accountName') }}</span>
            <strong>{{ auth.user?.name }}</strong>
          </div>
          <div class="account-row">
            <span>{{ t('admin.dashboard.accountEmail') }}</span>
            <strong class="ellipsis">{{ auth.user?.email ?? '—' }}</strong>
          </div>
          <div class="account-row">
            <span>{{ t('admin.dashboard.accountRole') }}</span>
            <strong>{{ roleLabel }}</strong>
          </div>
          <div class="account-row">
            <span>{{ t('admin.dashboard.secureLogin') }}</span>
            <strong class="secure-on"><span class="dot" />{{ t('status.normal') }}</strong>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="mt-16">
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
.welcome-card {
  border-radius: 10px;
  overflow: hidden;
}
.welcome-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 28px;
  background: linear-gradient(120deg, #f2fbf6 0%, #e6f7ef 100%);
}
.welcome-left {
  flex: 1;
  min-width: 0;
}
.welcome-title {
  font-size: 24px;
  font-weight: 800;
  color: #222222;
}
.welcome-desc {
  margin-top: 8px;
  font-size: 13px;
  color: #777777;
}
.welcome-tags {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #34c759;
  display: inline-block;
}
.workbench-tag {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 999px;
  background: #72d1a8;
  color: #fff;
  cursor: default;
}
.account-panel {
  width: 300px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 6px rgba(15, 71, 54, 0.06);
  padding: 16px 18px;
}
.account-title {
  font-size: 14px;
  font-weight: 700;
  color: #222222;
  padding-bottom: 12px;
  border-bottom: 1px solid #eef2ee;
}
.account-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  padding-top: 10px;
  color: #777777;
  strong {
    color: #222222;
    font-weight: 600;
    max-width: 170px;
  }
}
.secure-on {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #34c759 !important;
}
.stat-card {
  position: relative;
  overflow: hidden;
  text-align: center;
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #72d1a8, #b3e8cc);
  }
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

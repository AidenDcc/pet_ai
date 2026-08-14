<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import { useEchart } from '@/composables/useEchart'
import type { ECOption } from '@/utils/echarts'

export interface TrendPoint {
  ts: number
  value: number
}

const props = withDefaults(
  defineProps<{
    points: TrendPoint[]
    unit?: string
    color?: string
    height?: string
  }>(),
  {
    unit: '',
    color: '#4c9a7c',
    height: '220px',
  },
)

const elRef = ref<HTMLElement | null>(null)
const { setOption } = useEchart(elRef)

/** 时间跨度 ≤24h（单日逐小时）→ 小时刻度；跨天 → 日期刻度 */
const isHourMode = computed(() => {
  const pts = props.points
  return pts.length > 1 && pts[pts.length - 1].ts - pts[0].ts <= 24 * 3600000
})

/** 跨天日期标签：放得下则逐日显示，放不下只保留 首 / 中 / 尾 三个刻度 */
function buildDateLabels(pts: TrendPoint[]): string[] {
  const n = pts.length
  if (!n) return []
  if (n * 24 <= 300) return pts.map((p) => dayjs(p.ts).format('MM-DD'))
  const mid = Math.floor((n - 1) / 2)
  return pts.map((p, i) => (i === 0 || i === mid || i === n - 1 ? dayjs(p.ts).format('MM-DD') : ''))
}

function buildOption(): ECOption {
  const pts = props.points
  const hourMode = isHourMode.value
  const labels = hourMode ? pts.map((p) => dayjs(p.ts).format('HH:00')) : buildDateLabels(pts)

  const data = pts.map((p, i) => [labels[i] ?? '', p.value])

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const list = (params as { dataIndex: number; value: [string, number] }[]) ?? []
        const p = list[0]
        if (!p) return ''
        const label = String(p.value[0])
        return `${label}<br/><b>${p.value[1]}${props.unit}</b>`
      },
    },
    grid: { left: 36, right: 12, top: 16, bottom: 22 },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#e4e9f0' } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { color: '#a3b0c0', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: { color: '#a3b0c0', fontSize: 10 },
      splitLine: { lineStyle: { color: '#f0f3f8' } },
    },
    series: [
      {
        type: 'line',
        data,
        // 平滑折线
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: props.color, width: 2 },
        itemStyle: { color: props.color },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: hexWithAlpha(props.color, 0.16) },
              { offset: 1, color: hexWithAlpha(props.color, 0) },
            ],
          },
        },
      },
    ],
  }
}

/** 给 6 位十六进制颜色追加透明度 */
function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex}${a}`
}

watch(
  () => props.points,
  () => setOption(buildOption()),
  { deep: true, immediate: true },
)
</script>

<template>
  <div ref="elRef" class="report-trend-chart" :style="{ height }" />
</template>

<style scoped>
.report-trend-chart {
  width: 100%;
}
</style>

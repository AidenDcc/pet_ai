<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import { useEchart } from '@/composables/useEchart'
import type { ECOption } from '@/utils/echarts'

interface Point {
  ts: number
  value: number
}

const props = withDefaults(
  defineProps<{
    points: Point[]
    unit?: string
    /** 逐点健康等级色（绿/橙/红）；缺省回退到 color */
    colors?: string[]
    color?: string
    height?: string
  }>(),
  {
    unit: '',
    colors: () => [],
    color: '#ff6b00',
    height: '240px',
  },
)

const elRef = ref<HTMLElement | null>(null)
const { setOption } = useEchart(elRef)

/** 单日逐小时 → 条形（≤48 点）；多日 → 细折线 + 彩色圆点 */
const isDense = computed(() => props.points.length > 48)

/** 全部点在同一天显示 HH:00，跨天显示 MM-DD */
const axisLabel = computed(() => {
  const pts = props.points
  if (!pts.length) return 'HH:00'
  const sameDay = pts.every((p) => dayjs(p.ts).isSame(dayjs(pts[0].ts), 'day'))
  return sameDay ? 'HH:00' : 'MM-DD'
})

function buildOption(): ECOption {
  const pts = props.points
  const data = pts.map((p, i) => ({
    value: [p.ts, p.value],
    itemStyle: { color: props.colors[i] ?? props.color },
  }))
  const axisFormat = axisLabel.value === 'HH:00' ? 'HH:mm' : 'MM-DD'

  const base: ECOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const list = (params as { value: [number, number] }[]) ?? []
        const p = list[0]
        if (!p) return ''
        return `${dayjs(p.value[0]).format(axisFormat)}<br/><b>${p.value[1]}${props.unit}</b>`
      },
    },
    grid: { left: 44, right: 12, top: 18, bottom: 26 },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: '#e4e9f0' } },
      axisLabel: {
        color: '#a3b0c0',
        fontSize: 10,
        formatter: (v: number) => dayjs(v).format(axisLabel.value),
      },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: { color: '#a3b0c0', fontSize: 10 },
      splitLine: { lineStyle: { color: '#f0f3f8' } },
    },
  }

  const series: ECOption['series'] = isDense.value
    ? [
        {
          type: 'line',
          data,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { color: '#e4e9f0', width: 1 },
        },
      ]
    : [
        {
          type: 'bar',
          data,
          barWidth: Math.max(3, Math.min(16, 300 / Math.max(pts.length, 1))),
        },
      ]

  return { ...base, series }
}

watch(
  () => props.points,
  () => setOption(buildOption()),
  { deep: true, immediate: true },
)
</script>

<template>
  <div ref="elRef" class="vital-detail-chart" :style="{ height }" />
</template>

<style scoped>
.vital-detail-chart {
  width: 100%;
}
</style>

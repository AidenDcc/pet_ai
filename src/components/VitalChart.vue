<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEchart } from '@/composables/useEchart'
import { formatTime } from '@/utils/format'
import type { NormalRange } from '@/types'
import type { ECOption } from '@/utils/echarts'

const { t } = useI18n()

interface Point {
  ts: number
  value: number
}

const props = withDefaults(
  defineProps<{
    points: Point[]
    unit?: string
    color?: string
    range?: NormalRange | null
    height?: string
    name?: string
  }>(),
  {
    unit: '',
    color: '#ff6b00',
    range: null,
    height: '220px',
    name: '',
  },
)

const elRef = ref<HTMLElement | null>(null)
const { setOption } = useEchart(elRef)

function buildOption(): ECOption {
  const data = props.points.map((p) => [p.ts, p.value] as [number, number])
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const list = (params as { value: [number, number] }[]) ?? []
        const p = list[0]
        if (!p) return ''
        const name = props.name || t('common.name')
        return `${formatTime(p.value[0])}<br/><b>${name}：</b>${p.value[1]} ${props.unit}`
      },
    },
    grid: { left: 46, right: 14, top: 26, bottom: 26 },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: '#e4e9f0' } },
      axisLabel: { color: '#a3b0c0', fontSize: 10 },
      splitLine: { show: false },
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
        smooth: true,
        symbol: 'none',
        lineStyle: { color: props.color, width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${props.color}55` },
              { offset: 1, color: `${props.color}05` },
            ],
          },
        },
        markLine: props.range
          ? {
              silent: true,
              symbol: 'none',
              data: [
                { yAxis: props.range.min, name: t('common.lowerLimit') },
                { yAxis: props.range.max, name: t('common.upperLimit') },
              ],
              lineStyle: { color: '#ff9500', type: 'dashed', width: 1 },
              label: {
                color: '#ff9500',
                fontSize: 10,
                formatter: (p: { name?: string; value?: unknown }) =>
                  `${p.name ?? ''} ${p.value ?? ''}`,
              },
            }
          : undefined,
      },
    ],
  }
}

watch(
  () => props.points,
  () => setOption(buildOption()),
  { deep: true, immediate: true },
)
</script>

<template>
  <div ref="elRef" class="vital-chart" :style="{ height }" />
</template>

<style scoped>
.vital-chart {
  width: 100%;
}
</style>

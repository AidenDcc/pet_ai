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

/** 时间跨度 ≤24h（单日逐小时）→ 小时刻度；跨天 → 日期刻度 */
const isHourMode = computed(() => {
  const pts = props.points
  return pts.length > 0 && pts[pts.length - 1].ts - pts[0].ts <= 24 * 3600000
})

/** 单日逐小时 → 柱状图；多日（周/月/季）→ 点线图 */
const isLine = computed(() => !isHourMode.value)

/** 跨天（周/月/季）日期标签：放得下则逐日显示，放不下只保留 首 / 中 / 尾 三个刻度 */
function buildDateLabels(pts: Point[]): string[] {
  const n = pts.length
  if (!n) return []
  // 估算 MM-DD 标签宽度（≈24px/个）与绘图区宽（≈300px）的容纳关系
  if (n * 24 <= 300) return pts.map((p) => dayjs(p.ts).format('MM-DD'))
  const mid = Math.floor((n - 1) / 2)
  return pts.map((p, i) => (i === 0 || i === mid || i === n - 1 ? dayjs(p.ts).format('MM-DD') : ''))
}

function buildOption(): ECOption {
  const pts = props.points
  const hourMode = isHourMode.value
  // 分类轴标签：单日=逐小时 HH:00；跨天=全部日期 或 首/中/尾日期
  const labels = hourMode ? pts.map((p) => dayjs(p.ts).format('HH:00')) : buildDateLabels(pts)

  const data = pts.map((p, i) => ({
    value: [labels[i], p.value],
    itemStyle: { color: props.colors[i] ?? props.color },
  }))

  const base: ECOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const list = (params as { dataIndex: number; value: [string | number, number] }[]) ?? []
        const p = list[0]
        if (!p) return ''
        const pt = pts[p.dataIndex]
        const label = String(p.value[0]) || (pt ? dayjs(pt.ts).format('MM-DD') : '')
        return `${label}<br/><b>${p.value[1]}${props.unit}</b>`
      },
    },
    grid: { left: 34, right: 8, top: 16, bottom: 24 },
    xAxis: {
      type: 'category',
      data: labels,
      // 单日柱状图两侧留白；多日折线贴边展示
      boundaryGap: isLine.value ? false : true,
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
  }

  const series: ECOption['series'] = isLine.value
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
          // 柱宽随点数自适应并留出间隙，避免高密度小时柱覆盖
          barWidth: Math.max(4, Math.min(16, Math.floor(280 / Math.max(pts.length, 1)) - 4)),
          // 柱顶圆弧、柱脚平底
          itemStyle: { borderRadius: [5, 5, 0, 0] },
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

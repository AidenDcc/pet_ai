<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEchart } from '@/composables/useEchart'
import type { ECOption } from '@/utils/echarts'

/** 步态分布（各步态出现的天数或权重） */
export interface GaitDistribution {
  trot?: number
  walk?: number
  run?: number
  rest?: number
}

/** 展示顺序与配色：行走 / 小跑 / 奔跑 / 静止 */
const GAIT_ORDER = ['walk', 'trot', 'run', 'rest'] as const
const GAIT_COLORS: Record<string, string> = {
  walk: '#5b8ff9',
  trot: '#ff9f43',
  run: '#ff6b6b',
  rest: '#c3ccd9',
}

const props = withDefaults(
  defineProps<{
    distribution?: GaitDistribution
    height?: string
  }>(),
  {
    height: '200px',
  },
)

const { t } = useI18n()
const elRef = ref<HTMLElement | null>(null)
const { setOption } = useEchart(elRef)

const gaitName = (k: string) => t(`user.health.gaitTypes.${k}`) as string

/** 主导步态及占比（空数据返回 null） */
const dominant = computed(() => {
  const dist = props.distribution ?? {}
  const total = GAIT_ORDER.reduce((s, k) => s + (Number(dist[k]) || 0), 0)
  if (!total) return null
  const top = GAIT_ORDER.reduce((a, k) => ((Number(dist[k]) || 0) > (Number(dist[a]) || 0) ? k : a), 'walk')
  return { key: top, pct: Math.round(((Number(dist[top]) || 0) / total) * 100) }
})

function buildOption(): ECOption {
  const dist = props.distribution ?? {}
  const total = GAIT_ORDER.reduce((s, k) => s + (Number(dist[k]) || 0), 0)
  const top = dominant.value
  // 全部为 0 时渲染灰色占位环 + 空提示
  const empty = !total
  const data = empty
    ? [{ name: '', value: 1, itemStyle: { color: '#eef1f4' } }]
    : GAIT_ORDER.map((k) => ({
        name: gaitName(k),
        value: Number(dist[k]) || 0,
        itemStyle: { color: GAIT_COLORS[k] },
      }))

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number }
        if (!p.name) return ''
        return `${p.name}<br/><b>${p.value}（${p.percent}%）</b>`
      },
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e5e8eb',
      textStyle: { color: '#222222' },
    },
    legend: {
      bottom: 0,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 12,
      textStyle: { color: '#777777', fontSize: 11 },
    },
    title: empty
      ? {
          text: t('admin.petReports.gaitNoData'),
          left: 'center',
          top: '36%',
          textStyle: { fontSize: 12, fontWeight: 500, color: '#a3b0c0' },
        }
      : {
          text: gaitName(top?.key ?? ''),
          subtext: top ? `${top.pct}%` : '',
          left: 'center',
          top: '34%',
          textAlign: 'center',
          textStyle: { fontSize: 15, fontWeight: 700, color: '#333333' },
          subtextStyle: { fontSize: 13, color: '#999999' },
        },
    series: [
      {
        type: 'pie',
        radius: ['55%', '78%'],
        center: ['50%', '44%'],
        padAngle: 2,
        itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        labelLine: { show: false },
        data,
      },
    ],
  }
}

watch(
  () => props.distribution,
  () => setOption(buildOption()),
  { deep: true, immediate: true },
)
</script>

<template>
  <div ref="elRef" class="gait-ring-chart" :style="{ height }" />
</template>

<style scoped>
.gait-ring-chart {
  width: 100%;
}
</style>

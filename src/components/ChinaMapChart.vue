<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { MapChart } from 'echarts/charts'
import { VisualMapComponent } from 'echarts/components'
import echarts, { type ECOption } from '@/utils/echarts'
import { useEchart } from '@/composables/useEchart'
import chinaGeo from '@/assets/map/china.json'
import type { BiProvinceValue } from '@/types'

// 运行时按需注册地图与组件（幂等，不污染移动端包体）
echarts.use([MapChart, VisualMapComponent])

/** 省界 features 名称（一次性提取） */
const featureNames: string[] = ((chinaGeo as any).features ?? []).map((f: any) => f.properties?.name ?? '')

/** 短名 → 标准省名：data.name 用短名（广东），feature.name 为标准名（广东省/内蒙古自治区） */
function resolveFullName(shortName: string): string {
  const hit = featureNames.find((n) => n.startsWith(shortName) || n.includes(shortName))
  return hit || shortName
}

const props = withDefaults(
  defineProps<{
    data: BiProvinceValue[]
    title?: string
    height?: string
  }>(),
  {
    title: '',
    height: '380px',
  },
)

const elRef = ref<HTMLElement | null>(null)
const { setOption } = useEchart(elRef)

let mapRegistered = false
function ensureMap() {
  if (mapRegistered) return
  if (!(echarts as any).getMap?.('china')) {
    ;(echarts as any).registerMap?.('china', chinaGeo as any)
  }
  mapRegistered = true
}

function buildOption(): ECOption {
  const mapped = props.data.map((d) => ({ name: resolveFullName(d.name), value: d.value }))
  const max = Math.max(1, ...props.data.map((d) => d.value))
  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name?: string; value?: number }
        const val = p.value ?? 0
        return `${p.name ?? ''}<br/><b style="font-size:14px">${val.toLocaleString()}</b>${props.title ? ` ${props.title}` : ''}`
      },
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e5e8eb',
      textStyle: { color: '#222222' },
    },
    visualMap: {
      min: 0,
      max,
      left: 12,
      bottom: 10,
      calculable: true,
      text: ['高', '低'],
      textStyle: { color: '#a8b3ab', fontSize: 11 },
      inRange: { color: ['#e6f5ee', '#72d1a8', '#2f9e6e'] },
    },
    series: [
      {
        name: props.title,
        type: 'map',
        map: 'china',
        roam: false,
        zoom: 1.05,
        label: { show: false },
        itemStyle: { borderColor: '#ffffff', borderWidth: 1 },
        emphasis: {
          label: { show: true, fontSize: 12, color: '#222222' },
          itemStyle: { areaColor: '#ffd591' },
        },
        select: { itemStyle: { areaColor: '#ffd591' } },
        data: mapped,
      },
    ],
  }
}

onMounted(ensureMap)

watch(
  () => props.data,
  () => {
    ensureMap()
    setOption(buildOption())
  },
  { deep: true, immediate: true },
)
</script>

<template>
  <div ref="elRef" class="china-map-chart" :style="{ height }" />
</template>

<style scoped>
.china-map-chart {
  width: 100%;
}
</style>

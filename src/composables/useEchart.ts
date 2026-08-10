import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import echarts, { type ECOption } from '@/utils/echarts'
import type { ECharts } from 'echarts/core'

/** 在 el 元素上初始化 ECharts，自动处理 resize 与销毁；未就绪时的 option 会缓存补发 */
export function useEchart(el: Ref<HTMLElement | null>) {
  let chart: ECharts | null = null
  let pending: ECOption | null = null
  let observer: ResizeObserver | null = null

  onMounted(() => {
    if (!el.value) return
    chart = echarts.init(el.value)
    if (pending) {
      chart.setOption(pending)
      pending = null
    }
    observer = new ResizeObserver(() => chart?.resize())
    observer.observe(el.value)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    chart?.dispose()
    chart = null
  })

  function setOption(option: ECOption) {
    if (chart) chart.setOption(option)
    else pending = option
  }

  return { setOption }
}

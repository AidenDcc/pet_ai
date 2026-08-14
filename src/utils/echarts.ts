import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart, GaugeChart, RadarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  MarkLineComponent,
  MarkAreaComponent,
  GraphicComponent,
  DataZoomComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ComposeOption } from 'echarts/core'
import type {
  LineSeriesOption,
  BarSeriesOption,
  PieSeriesOption,
  GaugeSeriesOption,
  RadarSeriesOption,
} from 'echarts/charts'
import type {
  GridComponentOption,
  TooltipComponentOption,
  LegendComponentOption,
  TitleComponentOption,
  RadarComponentOption,
} from 'echarts/components'
// 中国省区地图（仅类型；MapChart / VisualMap 运行时在 ChinaMapChart 组件内按需注册，
// 避免把地图代码打进移动端包体）
import type { MapSeriesOption } from 'echarts/charts'
import type { VisualMapComponentOption } from 'echarts/components'

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GaugeChart,
  RadarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  MarkLineComponent,
  MarkAreaComponent,
  GraphicComponent,
  DataZoomComponent,
  CanvasRenderer,
])

export type ECOption = ComposeOption<
  | LineSeriesOption
  | BarSeriesOption
  | PieSeriesOption
  | GaugeSeriesOption
  | RadarSeriesOption
  | MapSeriesOption
  | RadarComponentOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | TitleComponentOption
  | VisualMapComponentOption
>

export default echarts

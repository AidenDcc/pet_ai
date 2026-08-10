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
  | RadarComponentOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | TitleComponentOption
>

export default echarts

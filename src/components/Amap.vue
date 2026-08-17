<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import type { PetFence } from '@/types'

interface Point {
  lat: number
  lng: number
  ts?: number
}

const props = withDefaults(
  defineProps<{
    points?: Point[]
    center?: Point | null
    radius?: number
    showFence?: boolean
    showTrack?: boolean
    /** 热力图模式：以热力图展示点位密度（多日轨迹），替代折线 + 点标记 */
    heatmap?: boolean
    fences?: PetFence[]
    fullscreen?: boolean
    /** 选中心点模式：点击地图触发 pick-center */
    pickMode?: boolean
    /** 已选中心点标记（独立于宠物标记，父组件控制） */
    pickMarker?: Point | null
  }>(),
  {
    points: () => [],
    center: null,
    radius: 500,
    showFence: true,
    showTrack: true,
    heatmap: false,
    fences: () => [],
    fullscreen: false,
    pickMode: false,
    pickMarker: null,
  },
)

const emit = defineEmits<{ (e: 'pick-center', pos: { lat: number; lng: number }): void }>()

// 从环境变量读取（在项目根目录 .env.local 配置），避免硬编码与泄露
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY ?? ''
const AMAP_JSCODE = import.meta.env.VITE_AMAP_JSCODE ?? ''

const containerRef = ref<HTMLDivElement>()
const mapReady = ref(false)
const loadError = ref('')
let map: AMap.Map | null = null
let trackLine: AMap.Polyline | null = null
let heatmapOverlay: AMap.HeatMap | null = null
let fenceCircle: AMap.Circle | null = null
let petMarker: AMap.Marker | null = null
let trackMarkers: AMap.Marker[] = []
let fenceOverlays: (AMap.Circle | AMap.Marker)[] = []
let pickMarkerOverlay: AMap.Marker | null = null

/** —— SDK 动态加载（AMapLoader 官方方式）—— */
// 高德 JS API v2.0 要求整页只调用一次 AMapLoader.load()，
// 因此用模块级 loadPromise 复用同一次加载尝试：
// 成功后所有 Amap 实例共享就绪状态；失败也共享同一条错误（需修正配置后刷新页面）。
let loadPromise: Promise<void> | null = null

/** 把高德返回的鉴权错误翻译成可操作的提示 */
function buildAuthErrorMessage(detail: string): string {
  const d = detail.toLowerCase()
  if (d.includes('domain') || detail.includes('域名')) {
    return '高德地图域名未授权：请到控制台把当前域名加入白名单（本地开发请绑定 localhost）'
  }
  if (d.includes('scode') || detail.includes('安全密钥') || detail.includes('秘钥')) {
    return '高德地图安全密钥无效：请检查 .env.local 中的 VITE_AMAP_JSCODE 是否与 Key 配对'
  }
  // 默认按 Key 无效处理（最常见的 INVALID_USER_KEY）
  return '高德地图 Key 无效或鉴权失败：请检查 .env.local 中的 VITE_AMAP_KEY 是否正确'
}

function loadSdk(): Promise<void> {
  if ((window as any).__amap_sdk_ready) return Promise.resolve()
  if (loadPromise) return loadPromise

  if (!AMAP_KEY) {
    // 区分开发/生产：本机走 .env.local，部署平台（如 Cloudflare Pages）走构建环境变量
    const hint = import.meta.env.DEV
      ? '请在本机项目根目录 .env.local 配置 VITE_AMAP_KEY 与 VITE_AMAP_JSCODE，然后重启 dev 服务'
      : '请在部署平台（如 Cloudflare Pages → Settings → 环境变量）配置 VITE_AMAP_KEY 与 VITE_AMAP_JSCODE，并重新构建部署'
    loadPromise = Promise.reject(new Error('未配置高德地图 Key：' + hint))
    return loadPromise
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    // 安全秘钥必须在 SDK 加载前设置（官方要求）
    ;(window as any)._AMapSecurityConfig = {
      securityJsCode: AMAP_JSCODE,
    }

    const onLoaderReady = () => callLoader(resolve, reject)

    // loader.js 已加载则直接调用，否则注入 script
    if ((window as any).AMapLoader?.load) {
      onLoaderReady()
      return
    }

    const script = document.createElement('script')
    script.dataset.amapLoader = '1'
    script.src = 'https://webapi.amap.com/loader.js'
    script.onerror = () => reject(new Error('高德地图 SDK 网络加载失败，请检查网络连接'))
    script.onload = onLoaderReady
    document.head.appendChild(script)
  })

  return loadPromise
}

function callLoader(resolve: () => void, reject: (e: Error) => void) {
  const loader = (window as any).AMapLoader
  if (!loader || typeof loader.load !== 'function') {
    reject(new Error('高德地图 Loader 初始化失败'))
    return
  }
  loader
    .load({ key: AMAP_KEY, version: '2.0' })
    .then(() => {
      ;(window as any).__amap_sdk_ready = true
      resolve()
    })
    .catch((e: unknown) => {
      reject(new Error(buildAuthErrorMessage((e as Error)?.message || String(e))))
    })
}

/** —— 地图初始化 —— */

function initMap() {
  if (!containerRef.value) return

  const all: Point[] = [...props.points]
  if (props.center) all.push(props.center)
  // Include fence centers
  props.fences.forEach((f) => {
    if (f.enabled) all.push({ lat: f.center.lat, lng: f.center.lng })
  })

  let center: [number, number] = [121.4737, 31.2304]
  if (all.length) {
    const lngs = all.map((p) => p.lng)
    const lats = all.map((p) => p.lat)
    center = [
      (Math.min(...lngs) + Math.max(...lngs)) / 2,
      (Math.min(...lats) + Math.max(...lats)) / 2,
    ]
  }

  try {
    map = new AMap.Map(containerRef.value, {
      zoom: 14,
      center,
      resizeEnable: true,
      viewMode: '2D',
    })

    mapReady.value = true
    drawAll()
    // 选中心点：点击地图（pickMode 时对外触发 pick-center）
    map.on('click', onMapClick)
  } catch (e) {
    loadError.value = '地图初始化失败: ' + (e as Error).message
  }
}

/** 地图点击：仅在 pickMode 下生效，把点击经纬度抛给父组件 */
function onMapClick(e: { lnglat: { lat: number; lng: number } }) {
  if (!props.pickMode) return
  emit('pick-center', { lat: e.lnglat.lat, lng: e.lnglat.lng })
}

/** 绘制/更新「已选中心点」标记 */
function updatePickMarker() {
  if (!map) return
  if (pickMarkerOverlay) {
    pickMarkerOverlay.setMap(null)
    pickMarkerOverlay = null
  }
  const p = props.pickMarker
  if (p) {
    pickMarkerOverlay = new AMap.Marker({
      position: [p.lng, p.lat],
      content:
        '<div style="position:relative;width:34px;height:34px;">' +
        '<div style="position:absolute;inset:-5px;border-radius:50%;background:rgba(0,180,166,0.22);animation:pet-pulse 1.4s infinite;"></div>' +
        '<div style="position:absolute;inset:0;border-radius:50%;background:#00b4a6;display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;box-shadow:0 2px 8px rgba(0,180,166,0.45);">📍</div>' +
        '</div>',
      offset: new AMap.Pixel(-17, -17),
      zIndex: 26,
    })
    pickMarkerOverlay.setMap(map)
  }
}

function clearOverlays() {
  if (trackLine) { trackLine.setMap(null); trackLine = null }
  if (heatmapOverlay) { heatmapOverlay.setMap(null); heatmapOverlay = null }
  if (fenceCircle) { fenceCircle.setMap(null); fenceCircle = null }
  if (petMarker) { petMarker.setMap(null); petMarker = null }
  if (pickMarkerOverlay) { pickMarkerOverlay.setMap(null); pickMarkerOverlay = null }
  trackMarkers.forEach((m) => m.setMap(null))
  trackMarkers = []
  fenceOverlays.forEach((o) => o.setMap(null))
  fenceOverlays = []
}

/** 热力图插件懒加载（复用同一次加载结果，避免重复注册） */
let heatmapReady = false
function loadHeatmapPlugin(): Promise<void> {
  if (heatmapReady) return Promise.resolve()
  return new Promise((resolve) => {
    AMap.plugin('AMap.HeatMap', () => {
      heatmapReady = true
      resolve()
    })
  })
}

/** 以热力图渲染全部点位（多日轨迹点位较多，展示停留密度） */
async function drawHeatmap() {
  if (!map || props.points.length === 0) return
  await loadHeatmapPlugin()
  if (!map) return
  if (heatmapOverlay) {
    heatmapOverlay.setMap(null)
    heatmapOverlay = null
  }
  heatmapOverlay = new AMap.HeatMap(map, {
    radius: 30,
    opacity: [0, 0.85],
    gradient: {
      0.4: '#13B06A',
      0.6: '#EBF04E',
      0.7: '#F08700',
      0.8: '#DE2626',
      0.9: '#7B0D0D',
    },
  })
  heatmapOverlay.setDataSet({
    data: props.points.map((p) => ({ lng: p.lng, lat: p.lat, count: 1 })),
    // 权重上限随点位数缩放，避免 3 天/7 天因点量不同导致热力过淡或过饱和
    max: Math.max(20, Math.round(props.points.length / 8)),
  })
}

function drawAll() {
  if (!map) return
  clearOverlays()

  // 热力图模式：多日点位走密度展示，不画折线/点标记
  if (props.heatmap) {
    drawHeatmap()
  }

  // 轨迹折线
  if (!props.heatmap && props.showTrack && props.points.length > 1) {
    const path = props.points.map((p) => [p.lng, p.lat] as [number, number])
    trackLine = new AMap.Polyline({
      path,
      strokeColor: '#ff8a3d',
      strokeWeight: 3,
      strokeOpacity: 0.85,
      strokeStyle: 'solid',
      lineJoin: 'round',
      lineCap: 'round',
      zIndex: 10,
    })
    trackLine.setMap(map)

    props.points.slice(0, -1).forEach((p) => {
      const m = new AMap.Marker({
        position: [p.lng, p.lat],
        icon: new AMap.Icon({
          size: new AMap.Size(6, 6),
          image: 'data:image/svg+xml,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="6" height="6"><circle cx="3" cy="3" r="3" fill="#ff8a3d" opacity="0.6"/></svg>',
          ),
          imageSize: new AMap.Size(6, 6),
        }),
        offset: new AMap.Pixel(-3, -3),
        zIndex: 8,
      })
      m.setMap(map)
      trackMarkers.push(m)
    })
  }

  // 多电子围栏（动态中心点围栏为蓝色，固定围栏为橙色）
  props.fences.forEach((f) => {
    if (!f.enabled && !props.showFence) return
    const isDynamic = f.type === 'dynamic'
    const color = isDynamic ? '#2f7cf6' : f.enabled ? '#ff6b00' : '#999'
    const circle = new AMap.Circle({
      center: [f.center.lng, f.center.lat],
      radius: f.radius,
      strokeColor: color,
      strokeWeight: f.enabled ? 2 : 1,
      strokeOpacity: f.enabled ? 0.9 : 0.5,
      strokeStyle: 'dashed',
      fillColor: color,
      fillOpacity: f.enabled ? 0.08 : 0.03,
      zIndex: 4,
    })
    circle.setMap(map)
    fenceOverlays.push(circle)

    // 围栏名称标签
    const labelMarker = new AMap.Marker({
      position: [f.center.lng, f.center.lat],
      content:
        '<div style="' +
        'background:' + (isDynamic ? 'rgba(47,124,246,0.9)' : 'rgba(255,107,0,0.9)') + ';color:#fff;font-size:11px;padding:2px 8px;border-radius:10px;' +
        'white-space:nowrap;transform:translate(-50%,-120%);box-shadow:0 1px 4px rgba(0,0,0,0.2);' +
        (f.enabled ? '' : 'background:rgba(150,150,150,0.7);') +
        '">' + (isDynamic ? '📱 ' : '') + f.name + '</div>',
      offset: new AMap.Pixel(0, 0),
      zIndex: 15,
    })
    labelMarker.setMap(map)
    fenceOverlays.push(labelMarker)
  })

  // 单围栏兼容（旧 props）
  if (props.showFence && props.center && props.fences.length === 0) {
    fenceCircle = new AMap.Circle({
      center: [props.center.lng, props.center.lat],
      radius: props.radius,
      strokeColor: '#ff6b00',
      strokeWeight: 1.5,
      strokeOpacity: 0.9,
      strokeStyle: 'dashed',
      fillColor: '#ff6b00',
      fillOpacity: 0.08,
      zIndex: 5,
    })
    fenceCircle.setMap(map)
  }

  // 宠物当前位置
  const lastPoint = props.points[props.points.length - 1]
  if (lastPoint) {
    petMarker = new AMap.Marker({
      position: [lastPoint.lng, lastPoint.lat],
      content:
        '<div style="position:relative;width:36px;height:36px;">' +
        '<div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(255,107,0,0.25);animation:pet-pulse 1.4s infinite;"></div>' +
        '<div style="position:absolute;inset:0;border-radius:50%;background:#ff6b00;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(255,107,0,0.45);">🐾</div>' +
        '</div>',
      offset: new AMap.Pixel(-18, -18),
      zIndex: 20,
    })
    petMarker.setMap(map)
  }

  updatePickMarker()
  fitView()
}

function fitView() {
  if (!map) return
  const all: [number, number][] = []
  if (props.showTrack || props.heatmap) props.points.forEach((p) => all.push([p.lng, p.lat]))
  if (props.showFence && props.center) all.push([props.center.lng, props.center.lat])
  props.fences.forEach((f) => {
    if (f.enabled || props.showFence) all.push([f.center.lng, f.center.lat])
  })

  if (all.length === 1) {
    map.setZoomAndCenter(15, all[0])
  } else if (all.length > 1) {
    map.setFitView(undefined, false, [60, 60, 60, 60])
  }
}

onMounted(async () => {
  try {
    await loadSdk()
    initMap()
  } catch (e) {
    loadError.value = (e as Error).message
  }
})

/** 鉴权/加载失败后刷新整页（v2.0 不允许重复 load，刷新是最稳妥的重试方式） */
function reload() {
  location.reload()
}

onBeforeUnmount(() => {
  clearOverlays()
  if (map) {
    map.destroy()
    map = null
  }
})

watch(
  () => [props.points, props.center, props.radius, props.showFence, props.showTrack, props.heatmap, props.fences],
  () => {
    if (mapReady.value) drawAll()
  },
  { deep: true },
)

watch(() => props.pickMarker, updatePickMarker)
</script>

<template>
  <div class="amap-wrap" :class="{ 'amap-wrap--fullscreen': fullscreen, 'amap-wrap--picking': pickMode }">
    <div ref="containerRef" class="amap-container" />

    <!-- 加载中 -->
    <div v-if="!mapReady && !loadError" class="amap-loading">
      <van-loading size="20" color="#ff6b00" />
      <span class="loading-text">地图加载中…</span>
    </div>

    <!-- 加载失败 -->
    <div v-if="loadError" class="amap-loading">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ loadError }}</span>
      <van-button size="small" plain type="primary" class="retry-btn" @click="reload">刷新重试</van-button>
    </div>
  </div>
</template>

<style scoped>
.amap-wrap {
  position: relative;
  /* 创建独立层叠上下文：高德内部 Logo/版权 z-index 极高（10 万级），
     若不加隔离会溢出盖住页面导航（状态栏/宠物切换/底部面板/底部栏），
     z-index: 0 将其封闭在本容器内，使上层 UI 始终显示在地图之上 */
  z-index: 0;
  width: 100%;
  height: 320px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--sp-border, #e4e7ed);
  background: #f5f7fa;
}

.amap-wrap--fullscreen {
  position: absolute;
  inset: 0;
  height: 100%;
  border: none;
  border-radius: 0;
}

.amap-container {
  width: 100%;
  height: 100%;
}

/* 选中心点模式下十字光标 */
.amap-wrap--picking .amap-container {
  cursor: crosshair;
}

.amap-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #f5f7fa;
  border-radius: 14px;
  z-index: 1;
}

.amap-wrap--fullscreen .amap-loading {
  border-radius: 0;
}

.loading-text {
  font-size: 12px;
  color: #999;
}

.error-icon {
  font-size: 28px;
}

.error-text {
  font-size: 13px;
  color: #ff6b6b;
  text-align: center;
  padding: 0 20px;
  line-height: 1.5;
}

.retry-btn {
  margin-top: 4px;
}
</style>

<style>
@keyframes pet-pulse {
  0% { transform: scale(0.6); opacity: 0.5; }
  100% { transform: scale(1.6); opacity: 0; }
}
</style>

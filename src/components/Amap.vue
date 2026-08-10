<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

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
  }>(),
  {
    points: () => [],
    center: null,
    radius: 500,
    showFence: true,
    showTrack: true,
  },
)

const AMAP_KEY = '4edcefcfccfd24b5cdbe07687d416fe774'
const AMAP_JSCODE = 'c6b85eaf6f6b70ee2e5428b3609ed245'

const containerRef = ref<HTMLDivElement>()
const mapReady = ref(false)
const loadError = ref('')
let map: AMap.Map | null = null
let trackLine: AMap.Polyline | null = null
let fenceCircle: AMap.Circle | null = null
let petMarker: AMap.Marker | null = null
let trackMarkers: AMap.Marker[] = []

/** —— SDK 动态加载（AMapLoader 官方方式）—— */
let sdkLoadingPromise: Promise<void> | null = null

function loadSdk(): Promise<void> {
  // 全局去重：同一页面多个 Amap 实例只加载一次
  if ((window as any).__amap_sdk_ready) return Promise.resolve()
  if (sdkLoadingPromise) return sdkLoadingPromise

  // 如果 SDK 已完全就绪，直接返回
  if (typeof (window as any).AMap?.Map === 'function') {
    ;(window as any).__amap_sdk_ready = true
    return Promise.resolve()
  }

  sdkLoadingPromise = new Promise<void>((resolve, reject) => {
    // 安全秘钥必须在 SDK 加载前设置（官方要求）
    ;(window as any)._AMapSecurityConfig = {
      securityJsCode: AMAP_JSCODE,
    }

    // 避免重复注入 loader.js
    if (document.querySelector('script[data-amap-loader]')) {
      // loader.js 已在加载中，等待 AMapLoader 可用后调用 load()
      waitForLoader(resolve, reject)
      return
    }

    const script = document.createElement('script')
    script.dataset.amapLoader = '1'
    script.src = 'https://webapi.amap.com/loader.js'

    script.onerror = () => {
      sdkLoadingPromise = null
      reject(new Error('高德地图 SDK 网络加载失败'))
    }

    script.onload = () => {
      // loader.js 加载完成后，AMapLoader 全局可用，调用其 load() 方法
      waitForLoader(resolve, reject)
    }

    document.head.appendChild(script)
  })

  return sdkLoadingPromise
}

function waitForLoader(resolve: () => void, reject: (e: Error) => void) {
  const AMapLoader = (window as any).AMapLoader
  if (!AMapLoader || typeof AMapLoader.load !== 'function') {
    // AMapLoader 还没准备好，轮询等待
    const start = Date.now()
    const timer = setInterval(() => {
      const loader = (window as any).AMapLoader
      if (loader && typeof loader.load === 'function') {
        clearInterval(timer)
        doLoad(loader, resolve, reject)
      } else if (Date.now() - start > 15000) {
        clearInterval(timer)
        sdkLoadingPromise = null
        reject(new Error('高德地图 Loader 加载超时'))
      }
    }, 100)
    return
  }
  doLoad(AMapLoader, resolve, reject)
}

function doLoad(
  loader: { load: (opts: Record<string, unknown>) => Promise<unknown> },
  resolve: () => void,
  reject: (e: Error) => void,
) {
  loader
    .load({
      key: AMAP_KEY,
      version: '2.0',
    })
    .then(() => {
      // AMapLoader.load() resolve 后，window.AMap 及其所有核心模块已就绪
      ;(window as any).__amap_sdk_ready = true
      resolve()
    })
    .catch((e: unknown) => {
      sdkLoadingPromise = null
      reject(new Error('高德地图鉴权失败: ' + (e as Error).message))
    })
}

/** —— 地图初始化 —— */

function boundsFromPoints() {
  const all: Point[] = [...props.points]
  if (props.center) all.push(props.center)
  if (!all.length) return { center: [121.4737, 31.2304] as [number, number], zoom: 14 }
  const lngs = all.map((p) => p.lng)
  const lats = all.map((p) => p.lat)
  const center: [number, number] = [
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
    (Math.min(...lats) + Math.max(...lats)) / 2,
  ]
  return { center, zoom: 14 }
}

function initMap() {
  if (!containerRef.value) return

  const { center } = boundsFromPoints()

  try {
    map = new AMap.Map(containerRef.value, {
      zoom: 14,
      center,
      resizeEnable: true,
      viewMode: '2D',
    })

    mapReady.value = true
    drawAll()
  } catch (e) {
    loadError.value = '地图初始化失败: ' + (e as Error).message
  }
}

function clearOverlays() {
  if (trackLine) { trackLine.setMap(null); trackLine = null }
  if (fenceCircle) { fenceCircle.setMap(null); fenceCircle = null }
  if (petMarker) { petMarker.setMap(null); petMarker = null }
  trackMarkers.forEach((m) => m.setMap(null))
  trackMarkers = []
}

function drawAll() {
  if (!map) return
  clearOverlays()

  // 轨迹折线
  if (props.showTrack && props.points.length > 1) {
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

    // 历史采样点（小圆点）
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

  // 电子围栏
  if (props.showFence && props.center) {
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

  fitView()
}

function fitView() {
  if (!map) return
  const all: [number, number][] = []
  if (props.showTrack) props.points.forEach((p) => all.push([p.lng, p.lat]))
  if (props.showFence && props.center) all.push([props.center.lng, props.center.lat])

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

onBeforeUnmount(() => {
  clearOverlays()
  if (map) {
    map.destroy()
    map = null
  }
})

watch(
  () => [props.points, props.center, props.radius, props.showFence, props.showTrack],
  () => {
    if (mapReady.value) drawAll()
  },
  { deep: true },
)
</script>

<template>
  <div class="amap-wrap">
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
    </div>
  </div>
</template>

<style scoped>
.amap-wrap {
  position: relative;
  width: 100%;
  height: 320px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--sp-border, #e4e7ed);
  background: #f5f7fa;
}
.amap-container {
  width: 100%;
  height: 100%;
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
</style>

<style>
@keyframes pet-pulse {
  0% { transform: scale(0.6); opacity: 0.5; }
  100% { transform: scale(1.6); opacity: 0; }
}
</style>

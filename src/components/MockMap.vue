<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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

const W = 600
const H = 360
const PAD = 40

const bbox = computed(() => {
  const all = [...props.points]
  if (props.center) all.push(props.center)
  const lats = all.map((p) => p.lat)
  const lngs = all.map((p) => p.lng)
  if (!lats.length) return { minLat: 31.218, maxLat: 31.242, minLng: 121.46, maxLng: 121.487 }
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const dLat = Math.max(maxLat - minLat, 0.012)
  const dLng = Math.max(maxLng - minLng, 0.018)
  return {
    minLat: minLat - dLat * 0.2,
    maxLat: maxLat + dLat * 0.2,
    minLng: minLng - dLng * 0.2,
    maxLng: maxLng + dLng * 0.2,
  }
})

function project(lat: number, lng: number): { x: number; y: number } {
  const { minLat, maxLat, minLng, maxLng } = bbox.value
  const x = PAD + ((lng - minLng) / (maxLng - minLng)) * (W - 2 * PAD)
  const y = H - PAD - ((lat - minLat) / (maxLat - minLat)) * (H - 2 * PAD)
  return { x, y }
}

const trackPath = computed(() =>
  props.points.map((p) => `${project(p.lat, p.lng).x},${project(p.lat, p.lng).y}`).join(' '),
)
const last = computed(() =>
  props.points.length ? project(props.points[props.points.length - 1].lat, props.points[props.points.length - 1].lng) : null,
)
const centerPt = computed(() => (props.center ? project(props.center.lat, props.center.lng) : null))
const radiusPx = computed(() => Math.max(14, (props.radius || 500) * 0.05))

// 装饰性街道网格
const gridLines = computed(() => {
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (let i = 1; i < 7; i++) lines.push({ x1: (W / 7) * i, y1: 0, x2: (W / 7) * i + 30, y2: H })
  for (let i = 1; i < 5; i++) lines.push({ x1: 0, y1: (H / 5) * i, x2: W, y2: (H / 5) * i + 20 })
  return lines
})
</script>

<template>
  <div class="mock-map">
    <svg :viewBox="`0 0 ${W} ${H}`" class="map-svg">
      <defs>
        <linearGradient id="mapBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#eef6f4" />
          <stop offset="100%" stop-color="#e3f0ec" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" :width="W" :height="H" fill="url(#mapBg)" rx="10" />

      <!-- 公园绿地 -->
      <ellipse cx="150" cy="120" rx="86" ry="52" fill="#d7f0d9" opacity="0.7" />
      <ellipse cx="470" cy="270" rx="70" ry="44" fill="#d7f0d9" opacity="0.6" />

      <!-- 河流 -->
      <path
        d="M-20 300 C 120 260, 200 330, 340 300 S 560 280, 640 300"
        fill="none"
        stroke="#b7e0f0"
        stroke-width="10"
        opacity="0.55"
      />

      <!-- 街道网格 -->
      <g v-for="(l, i) in gridLines" :key="i">
        <line
          :x1="l.x1"
          :y1="l.y1"
          :x2="l.x2"
          :y2="l.y2"
          stroke="#ffffff"
          stroke-width="3"
          opacity="0.9"
        />
      </g>
      <path d="M0 60 L600 40" stroke="#fff" stroke-width="4" opacity="0.9" />
      <path d="M0 180 L600 200" stroke="#fff" stroke-width="4" opacity="0.9" />

      <!-- 电子围栏 -->
      <circle
        v-if="showFence && centerPt"
        :cx="centerPt.x"
        :cy="centerPt.y"
        :r="radiusPx"
        fill="rgba(255,107,0,0.10)"
        stroke="#ff6b00"
        stroke-width="1.6"
        stroke-dasharray="6 4"
      />

      <!-- 围栏中心 -->
      <g v-if="showFence && centerPt">
        <line :x1="centerPt.x - 8" :y1="centerPt.y" :x2="centerPt.x + 8" :y2="centerPt.y" stroke="#ff6b00" stroke-width="2" />
        <line :x1="centerPt.x" :y1="centerPt.y - 8" :x2="centerPt.x" :y2="centerPt.y + 8" stroke="#ff6b00" stroke-width="2" />
      </g>

      <!-- 轨迹 -->
      <polyline
        v-if="showTrack && points.length > 1"
        :points="trackPath"
        fill="none"
        stroke="#ff8a3d"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="0.75"
      />

      <!-- 历史采样点 -->
      <g v-for="(p, i) in points" :key="i">
        <circle
          v-if="i < points.length - 1"
          :cx="project(p.lat, p.lng).x"
          :cy="project(p.lat, p.lng).y"
          r="2.6"
          fill="#ff8a3d"
          opacity="0.55"
        />
      </g>

      <!-- 宠物当前位置 -->
      <g v-if="last">
        <circle :cx="last.x" :cy="last.y" r="9" fill="#ff6b00" opacity="0.25">
          <animate attributeName="r" from="6" to="14" dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.4" to="0" dur="1.4s" repeatCount="indefinite" />
        </circle>
        <circle :cx="last.x" :cy="last.y" r="7" fill="#ff6b00" stroke="#fff" stroke-width="2" />
        <text :x="last.x" :y="last.y - 14" text-anchor="middle" font-size="12" fill="#e25f00" font-weight="700">🐾</text>
      </g>
    </svg>

    <div class="map-tip">{{ t('user.location.simulate') }} · {{ t('user.location.coord') }} {{ centerPt ? `(${center?.lat?.toFixed(5)}, ${center?.lng?.toFixed(5)})` : '' }}</div>
  </div>
</template>

<style scoped lang="scss">
.mock-map {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--sp-border);
  background: #eef6f4;
}
.map-svg {
  display: block;
  width: 100%;
  height: auto;
}
.map-tip {
  position: absolute;
  left: 10px;
  bottom: 8px;
  font-size: 11px;
  color: #4b9d8f;
  background: rgba(255, 255, 255, 0.85);
  padding: 3px 8px;
  border-radius: 6px;
}
</style>

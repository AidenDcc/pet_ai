<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getMyPetsApi, type PetJoined } from '@/api/modules/pet'
import { getDeviceListApi, getDeviceTrackApi, commandDeviceApi, type DeviceJoined } from '@/api/modules/device'
import { getHealthSummaryApi, type HealthSummary } from '@/api/modules/health'
import { getFencesApi, type PetFence } from '@/api/modules/fence'
import { getExerciseSummaryApi, type ExerciseState } from '@/api/modules/exercise'
import Amap from '@/components/Amap.vue'
import { SPECIES_ICON, DEVICE_STATUS, COMMAND_FEEDBACK } from '@/utils/consts'
import { petAvatarSrc } from '@/utils/petAvatar'
import { haversineMeters } from '@/utils/geo'

const router = useRouter()
const { t, locale } = useI18n()

const METRICS: { key: string; labelKey: string; unitKey: string; color: string; getValue: (s: HealthSummary) => number | string }[] = [
  // { key: 'temperature', labelKey: 'user.health.temperature', unitKey: 'user.health.degreeC', color: '#ff9f43', getValue: (s) => s.temperature.latest + '°' },
  { key: 'temperature', labelKey: 'user.health.temperature', unitKey: 'user.health.degreeC', color: '#ff9f43', getValue: (s) => s.temperature.latest},
  { key: 'heartRate', labelKey: 'user.health.heartRate', unitKey: 'user.health.bpm', color: '#ff6b6b', getValue: (s) => s.heartRate.latest },
  // { key: 'spo2', labelKey: 'user.health.spo2', unitKey: 'user.health.percent', color: '#00b4a6', getValue: (s) => s.spo2.latest + '%' },
  { key: 'spo2', labelKey: 'user.health.spo2', unitKey: 'user.health.percent', color: '#00b4a6', getValue: (s) => s.spo2.latest },
  { key: 'respiratoryRate', labelKey: 'user.health.respiratory', unitKey: 'user.health.bpm', color: '#5b8ff9', getValue: (s) => s.respiratoryRate.latest },
  { key: 'calorie', labelKey: 'user.health.calorie', unitKey: 'user.health.calorieUnit', color: '#34c759', getValue: (s) => s.calorie.latest },
]

const EXERCISE_METRICS = [
  { key: 'stepFreq', labelKey: 'user.health.stepFreq', unitKey: 'user.health.stepFreqUnit', icon: '👟', color: '#ff9f43' },
  { key: 'stride', labelKey: 'user.health.stride', unitKey: 'user.health.strideUnit', icon: '📏', color: '#5b8ff9' },
  { key: 'gait', labelKey: 'user.health.gait', unitKey: '', icon: '🚶', color: '#00b4a6' },
  { key: 'speed', labelKey: 'user.health.speed', unitKey: 'user.health.speedUnit', icon: '⚡', color: '#ff6b6b' },
]

const pets = ref<PetJoined[]>([])
const activeIndex = ref(0)
const devices = ref<DeviceJoined[]>([])
const summary = ref<HealthSummary | null>(null)
const track = ref<{ points: { lat: number; lng: number; ts: number }[]; center: { lat: number; lng: number }; address: string } | null>(null)
const fences = ref<PetFence[]>([])
const exercise = ref<ExerciseState | null>(null)
const loading = ref(false)

const activePet = computed(() => pets.value[activeIndex.value] ?? null)
const activeDevice = computed(() => devices.value.find((d) => d.boundPetId === activePet.value?.id) ?? null)

/** 已开启的围栏（含固定与动态） */
const enabledFences = computed(() => fences.value.filter((f) => f.enabled))
const deviceOnline = computed(() => activeDevice.value?.status === 'online')
/** 当前位置：取轨迹最后一点 */
const currentPos = computed(() => {
  const pts = track.value?.points
  return pts?.length ? pts[pts.length - 1] : null
})
/**
 * 围栏内外状态（显示在当前物理地址前）：
 * 存在已开启围栏时按当前位置与围栏中心距离判断；仅当「无有效围栏 且 设备离线」时不显示。
 */
const fenceState = computed<'inside' | 'outside' | null>(() => {
  if (!enabledFences.value.length && !deviceOnline.value) return null
  const pos = currentPos.value
  if (!pos) return null
  const inside = enabledFences.value.some((f) => haversineMeters(pos, f.center) <= f.radius)
  return inside ? 'inside' : 'outside'
})

async function loadAll() {
  loading.value = true
  try {
    const [petList, devList] = await Promise.all([
      getMyPetsApi(),
      getDeviceListApi(),
    ])
    pets.value = petList
    devices.value = devList

    if (pets.value.length) {
      await loadPetData()
    }
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function loadPetData() {
  const pet = activePet.value
  if (!pet) return

  const device = activeDevice.value
  const tasks: Promise<unknown>[] = [
    getHealthSummaryApi(pet.id).then((s) => { summary.value = s }).catch(() => { summary.value = null }),
    getFencesApi(pet.id).then((f) => { fences.value = f }).catch(() => { fences.value = [] }),
    getExerciseSummaryApi(pet.id).then((e) => { exercise.value = e }).catch(() => { exercise.value = null }),
  ]

  if (device) {
    tasks.push(
      getDeviceTrackApi(device.id).then((t) => { track.value = t }).catch(() => { track.value = null }),
    )
  } else {
    track.value = null
  }

  await Promise.all(tasks)
}

function onPetSelect(index: number) {
  activeIndex.value = index
  summary.value = null
  track.value = null
  fences.value = []
  exercise.value = null
  loadPetData()
}

function goVitals(metricType: string) {
  const pet = activePet.value
  if (!pet) return
  router.push(`/user/health/vitals/${pet.id}/${metricType}`)
}

function goExerciseTrend() {
  const pet = activePet.value
  if (!pet) return
  router.push('/user/health/exercise')
}

function goFenceManage() {
  const pet = activePet.value
  if (!pet) return
  router.push(`/user/health/fence/${pet.id}`)
}

/** 快捷功能：轨迹 —— 查看宠物历史运动轨迹（默认一天，可选时间区间） */
function goTrack() {
  const pet = activePet.value
  if (!pet) return
  router.push(`/user/health/track/${pet.id}`)
}

/** 快捷功能：问诊 —— 直达选医生界面（可选择医生与宠物发起问诊） */
function goConsult() {
  router.push('/user/consult/doctors')
}

/* ==================== 语音对讲（对讲机形式） ==================== */
const voiceVisible = ref(false)
const talking = ref(false) // 按住录音中
const talkCancelled = ref(false)
const recSeconds = ref(0)
const recSupported = ref(true)
const channelStatus = ref<'idle' | 'talking' | 'incoming'>('idle')

let recTimer: number | undefined
let recChunks: Blob[] = []
let recorder: MediaRecorder | null = null
let mediaStream: MediaStream | null = null
let talkStartPos: { x: number; y: number } | null = null
let unsupportedTold = false

const channelText = computed(() => {
  const map = {
    idle: t('user.health.voiceChannelIdle'),
    talking: t('user.health.voiceChannelTalking'),
    incoming: t('user.health.voiceChannelIncoming'),
  }
  return map[channelStatus.value]
})

/** 模拟对方（项圈 / 宠物）实时讲话 */
function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = locale.value === 'zh-CN' ? 'zh-CN' : 'en-US'
  window.speechSynthesis.speak(u)
}

function triggerPeerReply() {
  channelStatus.value = 'incoming'
  speak(t('user.health.voicePeerReply', { name: activePet.value?.name ?? '' }))
  window.setTimeout(() => {
    if (channelStatus.value === 'incoming') channelStatus.value = 'idle'
  }, 2600)
}

async function startTalk(e: TouchEvent | MouseEvent) {
  e.preventDefault()
  if (!voiceVisible.value || talking.value) return
  if (!activePet.value) {
    showToast(t('user.health.deviceUnbound'))
    return
  }
  talking.value = true
  talkCancelled.value = false
  recSeconds.value = 0
  recChunks = []
  channelStatus.value = 'talking'
  const pt = (e as TouchEvent).touches?.[0]
  talkStartPos = pt ? { x: pt.clientX, y: pt.clientY } : { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }
  // 优先真实录音，失败则退回模拟对讲
  try {
    if (!mediaStream) mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    if (!talking.value) {
      // 用户已松开：本次不录音
      mediaStream.getTracks().forEach((tr) => tr.stop())
      mediaStream = null
      return
    }
    if (mediaStream && window.MediaRecorder) {
      recorder = new MediaRecorder(mediaStream)
      recorder.ondataavailable = (ev) => { if (ev.data.size) recChunks.push(ev.data) }
      recorder.start()
      recSupported.value = true
    } else {
      recSupported.value = false
    }
  } catch {
    recSupported.value = false
  }
  recTimer = window.setInterval(() => { recSeconds.value++ }, 1000)
}

/** 上滑超过阈值则取消发送（松开不发送） */
function onTalkMove(e: TouchEvent) {
  const tch = e.touches?.[0]
  if (!talkStartPos || !tch) return
  if (Math.hypot(tch.clientX - talkStartPos.x, tch.clientY - talkStartPos.y) > 36) {
    talkCancelled.value = true
  }
}

function stopTalk() {
  if (!talking.value) return
  talking.value = false
  if (recTimer) { window.clearInterval(recTimer); recTimer = undefined }
  if (talkCancelled.value) {
    channelStatus.value = 'idle'
    discardRecording()
    showToast(t('user.health.voiceCancelled'))
    return
  }
  const finishSend = () => {
    if (!recSupported.value && !unsupportedTold) {
      unsupportedTold = true
      showToast(t('user.health.voiceMicUnsupported'))
    }
    showToast(t('user.health.voiceSent'))
    // 本地回放自己的录音（确认已发送），随后对方应答
    if (recSupported.value && recChunks.length) {
      const blob = new Blob(recChunks, { type: 'audio/webm;codecs=opus' })
      const url = URL.createObjectURL(blob)
      const au = new Audio(url)
      au.onended = () => URL.revokeObjectURL(url)
      au.play().catch(() => {})
      window.setTimeout(triggerPeerReply, 1200)
    } else {
      window.setTimeout(triggerPeerReply, 400)
    }
  }
  if (recorder && recorder.state !== 'inactive') {
    recorder.onstop = finishSend
    recorder.stop()
  } else {
    finishSend()
  }
  recorder = null
}

function discardRecording() {
  if (recorder && recorder.state !== 'inactive') {
    try { recorder.stop() } catch { /* ignore */ }
  }
  recorder = null
  recChunks = []
}

/** 关闭语音弹层：停止录音并释放麦克风 */
function closeVoice() {
  if (recTimer) { window.clearInterval(recTimer); recTimer = undefined }
  talking.value = false
  channelStatus.value = 'idle'
  discardRecording()
  if (mediaStream) {
    mediaStream.getTracks().forEach((tr) => tr.stop())
    mediaStream = null
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

/* ==================== 远程指令（与设备管理一致） ==================== */
const commandVisible = ref(false)
const cmdSending = ref('')
const COMMAND_ITEMS = [
  { value: 'find', icon: '🔔', labelKey: 'user.devices.cmdFind' },
  { value: 'light', icon: '💡', labelKey: 'user.devices.cmdLight' },
  { value: 'refresh', icon: '🛰️', labelKey: 'user.devices.cmdRefresh' },
]

async function sendCommand(cmd: { value: string }) {
  if (!activeDevice.value) {
    showToast(t('user.health.deviceUnbound'))
    return
  }
  if (activeDevice.value.status !== 'online') {
    showToast(t('user.devices.offlineCmd'))
    return
  }
  if (cmdSending.value) return
  cmdSending.value = cmd.value
  try {
    await commandDeviceApi({ deviceId: activeDevice.value.id, command: cmd.value })
    showToast(t(COMMAND_FEEDBACK[cmd.value] ?? 'user.devices.cmdSent'))
    // 请求定位后刷新轨迹
    if (cmd.value === 'refresh') loadPetData()
  } catch (e) {
    showToast((e as Error).message || t('user.devices.cmdFailed'))
  } finally {
    cmdSending.value = ''
  }
}

function getGaitLabel(gait: string): string {
  const key = `user.health.gaitTypes.${gait}` as any
  return t(key) || gait
}

/** 电量配色：>50 绿、>20 橙、≤20 红 */
function batteryColor(b: number) {
  if (b > 50) return '#4cd964'
  if (b > 20) return '#ff9500'
  return '#ff3b30'
}

loadAll()
</script>

<template>
  <div class="monitor-page">
    <!-- 全屏地图 -->
    <Amap
      v-if="track"
      :points="track.points"
      :center="activeDevice?.geofence?.center ?? track.center"
      :radius="activeDevice?.geofence?.radius ?? 500"
      :show-fence="false"
      :fences="fences"
      fullscreen
    />
    <!-- 无轨迹时仍展示地图（仅围栏） -->
    <Amap
      v-else
      :points="[]"
      :center="null"
      :show-fence="false"
      :fences="fences"
      fullscreen
    />

    <!-- 宠物切换标签（距顶部 100px） -->
    <div v-if="pets.length" class="pet-tabs-bar">
      <div
        v-for="(pet, index) in pets"
        :key="pet.id"
        class="pet-tab"
        :class="{ 'pet-tab--active': index === activeIndex }"
        @click="onPetSelect(index)"
      >
        <img class="pet-tab-avatar" :src="petAvatarSrc(pet.name) || pet.avatar" :alt="pet.name" />
        <span v-if="index === activeIndex" class="pet-tab-name">{{ pet.name }}</span>
      </div>
    </div>

    <!-- 底部信息面板（1/3 屏） -->
    <div v-if="activePet" class="info-panel">
      <!-- 拉手 -->
      <div class="panel-handle">
        <div class="handle-bar" />
      </div>

      <!-- 宠物头部信息 -->
      <div class="panel-pet-header">
        <img class="panel-avatar" :src="petAvatarSrc(activePet.name) || activePet.avatar" :alt="activePet.name" />
        <div class="panel-pet-info">
          <div class="panel-pet-name-row">
            <div class="panel-pet-name">
              {{ SPECIES_ICON[activePet.species] }} {{ activePet.name }}
            </div>
            <!-- 设备信息：昵称右侧，靠右距面板边缘 20px -->
            <div v-if="activeDevice" class="panel-device">
              <span class="dev-name">{{ t('user.sync.collarOf', { name: activePet.name }) }}</span>
              <span class="dev-status" :class="`is-${activeDevice.status}`">
                <i class="dev-dot" />
                {{ t(DEVICE_STATUS[activeDevice.status].labelKey) }}
              </span>
              <span class="dev-battery" :style="{ color: batteryColor(activeDevice.battery) }">
                {{ activeDevice.battery }}%
              </span>
            </div>
            <span v-else class="panel-device panel-device--none">{{ t('user.health.deviceUnbound') }}</span>
          </div>
          <div class="panel-pet-pos">
            <span class="pos-dot" />
            <span v-if="fenceState" class="pos-fence" :class="`is-${fenceState}`">
              {{ t(fenceState === 'inside' ? 'user.health.insideFence' : 'user.health.outsideFence') }}
            </span>
            {{ track ? track.address : t('user.health.positionLoading') }}
          </div>
        </div>
      </div>

      <div class="panel-body">
        <!-- 健康指标 -->
        <div class="section-title">{{ t('user.home.healthOverview') }}</div>
        <div class="metric-grid">
          <div
            v-for="m in METRICS"
            :key="m.key"
            class="metric-item"
            :style="{ '--metric-color': m.color }"
            @click="goVitals(m.key)"
          >
            <div class="metric-item-value" :style="{ color: m.color }">
              {{ summary ? m.getValue(summary) : '--' }}
            </div>
            <div class="metric-item-label">{{ t(m.labelKey) }}</div>
            <div class="metric-item-unit">{{ t(m.unitKey) }}</div>
          </div>
        </div>

        <!-- 运动指标 -->
        <div class="section-title section-title--mt">{{ t('user.health.exercise') }}</div>
        <div class="exercise-row">
          <div
            v-for="em in EXERCISE_METRICS"
            :key="em.key"
            class="exercise-item"
            @click="goExerciseTrend()"
          >
          <!--
            <span class="exercise-icon">{{ em.icon }}</span>
          -->
            <div class="exercise-info">
              <div class="exercise-value" :style="{ color: em.color }">
                <template v-if="exercise">
                  <template v-if="em.key === 'gait'">{{ getGaitLabel(exercise.gait) }}</template>
                  <template v-else-if="em.key === 'stepFreq'">{{ exercise.stepFreq }}</template>
                  <template v-else-if="em.key === 'stride'">{{ exercise.stride }}</template>
                  <template v-else-if="em.key === 'speed'">{{ exercise.speed }}</template>
                </template>
                <template v-else>--</template>
              </div>
              <div class="exercise-label">{{ t(em.labelKey) }}</div>
              <div v-if="em.unitKey" class="exercise-unit">{{ t(em.unitKey) }}</div>
            </div>
          </div>
        </div>

        <!-- 快捷功能：围栏 / 语音 / 问诊 / 指令 -->
        <div class="section-title section-title--mt">{{ t('user.health.quickTools') }}</div>
        <div class="feature-grid">
          <div class="feature-item" @click="goFenceManage">
            <div class="feature-icon" style="--fi-bg: #e0f7f4">📍</div>
            <span class="feature-label">{{ t('user.health.fence') }}</span>
            <span v-if="fences.filter((f) => f.type !== 'dynamic').length" class="feature-badge">{{ fences.filter((f) => f.type !== 'dynamic').length }}</span>
          </div>
          <div class="feature-item" @click="voiceVisible = true">
            <div class="feature-icon" style="--fi-bg: #e8f1fe">🎙️</div>
            <span class="feature-label">{{ t('user.health.voice') }}</span>
          </div>
          <div class="feature-item" @click="goConsult">
            <div class="feature-icon" style="--fi-bg: #ffecec">🩺</div>
            <span class="feature-label">{{ t('user.health.consult') }}</span>
          </div>
          <div class="feature-item" @click="commandVisible = true">
            <div class="feature-icon" style="--fi-bg: #f0eaff">🎛️</div>
            <span class="feature-label">{{ t('user.health.command') }}</span>
          </div>
          <div class="feature-item" @click="goTrack">
            <div class="feature-icon" style="--fi-bg: #fff6e5">🗺️</div>
            <span class="feature-label">{{ t('user.health.track') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 语音对讲弹层（对讲机形式，约 2/5 屏） -->
    <van-popup
      v-model:show="voiceVisible"
      position="bottom"
      round
      :style="{ height: '40%' }"
      class="voice-popup"
      teleport="#phone-teleport"
      @closed="closeVoice"
    >
      <div class="voice-body">
        <div class="voice-header">
          <div class="voice-title">
            <span class="voice-dot" :class="`is-${channelStatus}`" />
            {{ t('user.health.voiceTitle') }}
          </div>
          <span class="voice-channel">{{ channelText }}</span>
        </div>

        <div class="voice-stage">
          <div class="voice-avatar">
            <img :src="petAvatarSrc(activePet?.name ?? '') || activePet?.avatar" alt="" />
          </div>
          <div class="voice-pet">{{ activePet?.name }}</div>

          <!-- 对讲机：按住说话，松开发送；上滑取消 -->
          <div
            class="ptt-btn"
            :class="{ 'is-talking': talking }"
            @touchstart.prevent="startTalk"
            @touchend.prevent="stopTalk"
            @touchcancel.prevent="stopTalk"
            @touchmove.prevent="onTalkMove"
            @mousedown.prevent="startTalk"
            @mouseup.prevent="stopTalk"
            @mouseleave.prevent="stopTalk"
          >
            <span class="ptt-mic">{{ talking ? '🎙️' : '🎤' }}</span>
            <span class="ptt-text">
              {{
                talking
                  ? talkCancelled
                    ? t('user.health.voiceCancelled')
                    : t('user.health.voiceRecording', { s: recSeconds })
                  : t('user.health.voiceHoldTalk')
              }}
            </span>
            <span v-if="talking && !talkCancelled" class="ptt-hint">{{ t('user.health.voiceReleaseHint') }}</span>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 远程指令弹层（约 2/5 屏） -->
    <van-popup
      v-model:show="commandVisible"
      position="bottom"
      round
      :style="{ height: '40%' }"
      class="command-popup"
      teleport="#phone-teleport"
    >
      <div class="command-body">
        <div class="command-title">{{ t('user.health.commandTitle') }}</div>
        <div class="command-desc">{{ t('user.health.commandDesc') }}</div>
        <div class="command-list">
          <div
            v-for="cmd in COMMAND_ITEMS"
            :key="cmd.value"
            class="command-item"
            :class="{ 'is-loading': cmdSending === cmd.value }"
            @click="sendCommand(cmd)"
          >
            <span class="command-icon">{{ cmd.icon }}</span>
            <span class="command-label">{{ t(cmd.labelKey) }}</span>
            <van-loading v-if="cmdSending === cmd.value" size="16" color="#999" />
            <van-icon v-else name="arrow" color="#999" />
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 加载/空状态 -->
    <div v-if="!loading && !pets.length" class="monitor-empty">
      <van-empty :description="t('user.health.noDevice')" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.monitor-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
}

/* ===== 宠物切换标签（距顶部 100px） ===== */
.pet-tabs-bar {
  position: absolute;
  top: 100px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 12px;
  z-index: 100; /* 顶部导航，始终盖在高德地图（含其 Logo/版权）之上 */
  padding: 0 16px;
  pointer-events: none;

  .pet-tab {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 2px 2px 2px;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
    cursor: pointer;
    transition: all 0.25s;

    .pet-tab-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid #fff;
      object-fit: cover;
      flex-shrink: 0;
      background: #eef1f5;
    }

    .pet-tab-name {
      font-size: 14px;
      font-weight: 600;
      margin-right: 6px;
      color: #333;
      white-space: nowrap;
    }

    &--active {
      background: rgba(255, 255, 255, 0.98);
      box-shadow: 0 4px 20px rgba(255, 107, 0, 0.25);
      .pet-tab-avatar {
        border-color: var(--sp-primary, #ff6b00);
      }
    }
  }
}

/* ===== 底部信息面板 ===== */
.info-panel {
  position: absolute;
  bottom: 50px; /* above tabbar */
  left: 0;
  right: 0;
  max-height: 36%;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(16px);
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 100; /* 底部面板，盖在高德版权信息之上 */
}

.panel-handle {
  display: flex;
  justify-content: center;
  padding: 8px 0 2px;
  .handle-bar {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: #d4dae2;
  }
}

.panel-pet-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 16px 10px;
  border-bottom: 1px solid #f0f3f8;

  .panel-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid var(--sp-primary-light);
    object-fit: cover;
    flex-shrink: 0;
    background: #eef1f5;
  }

  .panel-pet-info {
    flex: 1;
    min-width: 0;
  }

  .panel-pet-name-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-right: 4px; /* 面板右内边距 16px + 4px = 距右边缘 20px */
    min-width: 0;
  }

  .panel-pet-name {
    font-size: 16px;
    font-weight: 700;
    color: #333;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 设备信息：设备名 + 状态 + 电量 */
  .panel-device {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    font-size: 10px;

    .dev-name {
      max-width: 88px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #666;
    }

    .dev-status {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;

      .dev-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }

      &.is-online { color: #4cd964; }
      &.is-offline { color: #b0b6bf; }
      &.is-low-power { color: #ff9500; }
      &.is-unbound { color: #ff3b30; }
    }

    .dev-battery {
      font-size: 11px;
      font-weight: 700;
    }

    &--none {
      color: #b0b6bf;
      flex-shrink: 0;
    }
  }

  .panel-pet-pos {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--sp-text-placeholder);
    margin-top: 2px;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;

    .pos-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4cd964;
      flex-shrink: 0;
    }

    /* 围栏内外标签（显示在地址前） */
    .pos-fence {
      flex-shrink: 0;
      padding: 0 7px;
      border-radius: 9px;
      font-size: 10px;
      font-weight: 600;
      line-height: 17px;

      &.is-inside {
        color: #0aa35b;
        background: rgba(74, 217, 100, 0.16);
      }

      &.is-outside {
        color: #ff6b00;
        background: rgba(255, 107, 0, 0.14);
      }
    }
  }
}

.panel-body {
  padding: 10px 16px 16px;
  overflow-y: auto;
  flex: 1;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;

  &--mt {
    margin-top: 12px;
  }
}

/* 健康指标 1x5 网格（体温 / 心率 / 血氧 / 呼吸 / 卡路里） */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;

  .metric-item {
    text-align: center;
    padding: 8px 4px;
    border-radius: 12px;
    background: #f7f9fc;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;

    &:active {
      transform: scale(0.96);
      background: #eef2f8;
    }

    .metric-item-value {
      font-size: 18px;
      font-weight: 800;
      line-height: 1.2;
    }
    .metric-item-label {
      font-size: 10px;
      color: var(--sp-text-secondary);
      margin-top: 2px;
    }
    .metric-item-unit {
      font-size: 9px;
      color: var(--sp-text-placeholder);
    }

    /* 点击提示箭头 */
    &::after {
      content: '';
      position: absolute;
      right: 4px;
      top: 4px;
      width: 0;
      height: 0;
      border-left: 3px solid var(--metric-color, #ff6b00);
      border-bottom: 3px solid transparent;
      border-top: 3px solid transparent;
      opacity: 0.4;
    }
  }
}

/* 运动指标行 */
.exercise-row {
  display: flex;
  gap: 8px;

  .exercise-item {
    flex: 1;
    padding: 8px 6px;
    border-radius: 12px;
    background: #f7f9fc;
    text-align: center;
    cursor: pointer;
    transition: transform 0.2s;

    &:active {
      transform: scale(0.96);
    }

    .exercise-icon {
      font-size: 16px;
      display: block;
      margin-bottom: 2px;
    }
    .exercise-value {
      font-size: 14px;
      font-weight: 700;
      color: #333;
    }
    .exercise-label {
      font-size: 10px;
      color: var(--sp-text-secondary);
    }
    .exercise-unit {
      font-size: 9px;
      color: var(--sp-text-placeholder);
    }
  }
}

/* 快捷功能 2x2 网格（围栏 / 语音 / 问诊 / 指令） */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;

  .feature-item {
    position: relative;
    text-align: center;
    padding: 10px 4px;
    border-radius: 12px;
    background: #f7f9fc;
    cursor: pointer;
    transition: transform 0.2s;

    &:active {
      transform: scale(0.94);
    }

    .feature-icon {
      width: 40px;
      height: 40px;
      margin: 0 auto 6px;
      border-radius: 12px;
      background: var(--fi-bg, #f0f3f8);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .feature-label {
      font-size: 11px;
      font-weight: 600;
      color: #333;
    }

    .feature-badge {
      position: absolute;
      top: 6px;
      right: 8px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: 8px;
      background: var(--sp-primary, #ff6b00);
      color: #fff;
      font-size: 10px;
      line-height: 16px;
      text-align: center;
      box-sizing: border-box;
    }
  }
}

/* ===== 语音对讲弹层 ===== */
.voice-popup {
  overflow: hidden;
}

.voice-body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 14px 16px 20px;
  box-sizing: border-box;
}

.voice-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .voice-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 700;
    color: #333;
  }

  .voice-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #c0c4cc;

    &.is-talking {
      background: #ff3b30;
      animation: voice-blink 1s infinite;
    }

    &.is-incoming {
      background: #4cd964;
      animation: voice-blink 1s infinite;
    }
  }

  .voice-channel {
    font-size: 12px;
    color: var(--sp-text-secondary);
  }
}

.voice-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;

  .voice-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    overflow: hidden;
    background: #eef1f5;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .voice-pet {
    font-size: 13px;
    font-weight: 600;
    color: #666;
  }

  /* 对讲机 PTT 按钮 */
  .ptt-btn {
    width: 118px;
    height: 118px;
    border-radius: 50%;
    border: none;
    background: linear-gradient(145deg, #5b8ff9, #3b6ff0);
    color: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    box-shadow: 0 8px 20px rgba(59, 111, 240, 0.35);
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;

    &.is-talking {
      background: linear-gradient(145deg, #ff5f5f, #ff3b30);
      box-shadow: 0 8px 20px rgba(255, 59, 48, 0.4);
      animation: voice-pulse-ring 1.2s infinite;
    }

    .ptt-mic {
      font-size: 26px;
      line-height: 1;
    }

    .ptt-text {
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      padding: 0 10px;
    }

    .ptt-hint {
      font-size: 10px;
      opacity: 0.85;
    }
  }
}

@keyframes voice-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@keyframes voice-pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.4); }
  70% { box-shadow: 0 0 0 16px rgba(255, 59, 48, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 59, 48, 0); }
}

/* ===== 远程指令弹层 ===== */
.command-popup {
  overflow: hidden;
}

.command-body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px 16px 20px;
  box-sizing: border-box;
}

.command-title {
  font-size: 16px;
  font-weight: 700;
  color: #333;
}

.command-desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--sp-text-secondary);
}

.command-list {
  flex: 1;
  min-height: 0;
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .command-item {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    border-radius: 14px;
    background: #f7f9fc;
    cursor: pointer;
    transition: transform 0.15s, opacity 0.2s;

    &:active {
      transform: scale(0.98);
    }

    &.is-loading {
      opacity: 0.6;
    }

    .command-icon {
      font-size: 22px;
    }

    .command-label {
      flex: 1;
      font-size: 15px;
      font-weight: 600;
      color: #333;
    }
  }
}

.monitor-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sp-bg);
}
</style>

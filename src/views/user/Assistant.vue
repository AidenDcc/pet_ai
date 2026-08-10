<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getMyPetsApi, type PetJoined } from '@/api/modules/pet'
import { chatAssistantApi } from '@/api/modules/assistant'
import { commandDeviceApi } from '@/api/modules/device'
import type { AssistantReply } from '@/types'

const router = useRouter()
const { t, locale } = useI18n()

interface ChatMsg {
  role: 'user' | 'assistant'
  text: string
}

const pets = ref<PetJoined[]>([])
const activeIdx = ref(0)
const messages = ref<ChatMsg[]>([])
const input = ref('')
const sending = ref(false)
const voiceOn = ref(true)
const listening = ref(false)

const activePet = computed(() => pets.value[activeIdx.value] ?? null)

/** 语音播报开关 */
function speak(text: string) {
  if (!voiceOn.value || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = locale.value === 'zh-CN' ? 'zh-CN' : 'en-US'
  window.speechSynthesis.speak(u)
}

function append(role: ChatMsg['role'], text: string) {
  messages.value.push({ role, text })
  // 自动滚动到底部
  requestAnimationFrame(() => {
    const el = document.querySelector('.chat-list')
    if (el) el.scrollTop = el.scrollHeight
  })
}

/** 执行助手下发的动作：设备指令 / 路由跳转 */
async function runAction(reply: AssistantReply) {
  if (!reply.action) return
  if (reply.action.type === 'command' && reply.action.command && reply.action.deviceId) {
    try {
      const res = await commandDeviceApi({ deviceId: reply.action.deviceId, command: reply.action.command })
      showToast(res.message)
    } catch (e) {
      showToast((e as Error).message || t('user.devices.cmdFailed'))
    }
  } else if (reply.action.type === 'route' && reply.action.path) {
    router.push(reply.action.path)
  }
}

async function send(text: string) {
  const content = text.trim()
  if (!content || sending.value) return
  if (!activePet.value) {
    showToast(t('assistant.needPet'))
    return
  }
  append('user', content)
  input.value = ''
  sending.value = true
  try {
    const reply = await chatAssistantApi({ text: content, petId: activePet.value.id, lang: locale.value })
    append('assistant', reply.reply)
    speak(reply.reply)
    await runAction(reply)
  } catch (e) {
    const err = (e as Error).message || t('common.opFailed')
    append('assistant', err)
  } finally {
    sending.value = false
  }
}

/* ---------------- 语音识别（Web Speech API） ---------------- */
let rec: unknown = null

function startListening() {
  if (listening.value) return
  const SR = (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
  const Ctor = SR.SpeechRecognition || SR.webkitSpeechRecognition
  if (!Ctor) {
    showToast(t('user.assistant.micNotSupported'))
    return
  }
  try {
    const recognition = new Ctor() as unknown as {
      lang: string
      interimResults: boolean
      maxAlternatives: number
      onresult: ((ev: { results: Array<Array<{ transcript: string }>> }) => void) | null
      onerror: (() => void) | null
      onend: (() => void) | null
      start: () => void
      stop: () => void
    }
    recognition.lang = locale.value === 'zh-CN' ? 'zh-CN' : 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (ev) => {
      const text = ev.results[0][0].transcript.trim()
      if (text) send(text)
    }
    recognition.onerror = () => showToast(t('user.assistant.micNotSupported'))
    recognition.onend = () => {
      listening.value = false
      rec = null
    }
    rec = recognition
    listening.value = true
    recognition.start()
  } catch {
    showToast(t('user.assistant.micNotSupported'))
  }
}

function stopListening() {
  if (!rec) return
  ;(rec as { stop: () => void }).stop()
  rec = null
}

async function load() {
  try {
    pets.value = await getMyPetsApi()
  } catch {
    /* 忽略 */
  }
  append('assistant', t('user.assistant.greeting'))
}

onMounted(load)
</script>

<template>
  <div class="assistant">
    <!-- 语音播报开关 -->
    <van-cell-group :border="false" inset class="voice-cell">
      <van-cell :title="t('user.assistant.voiceEnabled')">
        <template #right-icon>
          <van-switch v-model="voiceOn" size="22px" />
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 宠物切换 -->
    <van-tabs v-if="pets.length > 1" v-model:active="activeIdx" color="#ff6b00" class="pet-tabs">
      <van-tab v-for="p in pets" :key="p.id" :title="p.name" />
    </van-tabs>

    <van-empty v-if="!pets.length" :description="t('assistant.needPet')">
      <van-button round type="primary" size="small" @click="router.push('/user/devices/bind')">
        {{ t('user.devices.goBind') }}
      </van-button>
    </van-empty>

    <template v-else>
      <!-- 对话区 -->
      <div class="chat-list">
        <div v-for="(m, i) in messages" :key="i" class="msg-row" :class="m.role">
          <div class="bubble">{{ m.text }}</div>
        </div>
        <div v-if="listening" class="msg-row assistant">
          <div class="bubble listening">{{ t('user.assistant.listening') }}</div>
        </div>
      </div>

      <!-- 引导语示例 -->
      <div class="chips">
        <span class="chip" @click="send(t('user.assistant.example1'))">{{ t('user.assistant.example1') }}</span>
        <span class="chip" @click="send(t('user.assistant.example2'))">{{ t('user.assistant.example2') }}</span>
      </div>

      <!-- 输入行 -->
      <div class="input-bar">
        <van-field
          v-model="input"
          :placeholder="t('user.assistant.inputPlaceholder')"
          :border="false"
          class="input-field"
          @keyup.enter="send(input)"
        />
        <van-button size="small" round type="primary" :loading="sending" @click="send(input)">
          {{ t('user.assistant.send') }}
        </van-button>
        <button
          class="mic-btn"
          :class="{ active: listening }"
          @touchstart.prevent="startListening"
          @touchend.prevent="stopListening"
          @mousedown.prevent="startListening"
          @mouseup.prevent="stopListening"
          @mouseleave.prevent="stopListening"
        >
          🎤
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.assistant {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px 14px 0;
  box-sizing: border-box;
}
.voice-cell {
  margin-bottom: 10px;
  --van-cell-label-font-size: 12px;
}
.pet-tabs {
  margin-bottom: 10px;
  background: transparent;
  :deep(.van-tabs__wrap) {
    background: #fff;
    border-radius: 12px;
  }
}
.chat-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 2px;
}
.msg-row {
  display: flex;
  margin-bottom: 12px;
  &.user {
    justify-content: flex-end;
    .bubble {
      background: var(--sp-primary);
      color: #fff;
      border-radius: 12px 12px 2px 12px;
    }
  }
  &.assistant {
    justify-content: flex-start;
    .bubble {
      background: #fff;
      color: var(--sp-text);
      border: 1px solid var(--sp-border);
      border-radius: 12px 12px 12px 2px;
    }
  }
  .bubble {
    max-width: 78%;
    padding: 10px 12px;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    &.listening {
      color: var(--sp-text-secondary);
      animation: pulse 1s infinite;
    }
  }
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 0;
  .chip {
    font-size: 12px;
    color: var(--sp-primary);
    background: rgba(255, 107, 0, 0.08);
    border: 1px solid rgba(255, 107, 0, 0.2);
    border-radius: 14px;
    padding: 4px 12px;
    cursor: pointer;
  }
}
.input-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0 14px;
  .input-field {
    flex: 1;
    background: #fff;
    border-radius: 20px;
    --van-field-input-text-color: var(--sp-text);
  }
  .mic-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: var(--sp-primary);
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    &.active {
      background: var(--sp-danger);
      animation: pulse 1s infinite;
    }
  }
}
</style>

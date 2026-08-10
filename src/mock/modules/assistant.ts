import type { AssistantReply, PetInfo, DeviceInfo } from '@/types'
import { defineMock, requireUser } from '../helper'
import { findPetById, findDeviceById, telemetry, reports } from '../db'
import { RANGES } from './health'
import zhCN from '@/locales/zh-CN'
import enUS from '@/locales/en-US'

type Msgs = typeof zhCN.assistant
const MSGS: Record<string, Msgs> = { 'zh-CN': zhCN.assistant, 'en-US': enUS.assistant }

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => String(vars[k] ?? ''))
}

function msg(lang: string): Msgs {
  return MSGS[lang] ?? MSGS['zh-CN']
}

function noDeviceReply(t: Msgs, pet: PetInfo, lang: string): AssistantReply {
  const reason = lang === 'zh-CN' ? `「${pet.name}」未绑定设备` : `'${pet.name}' has no bound device`
  return { reply: fill(t.cmdFailed, { reason }), action: null, intent: 'none' }
}

function cmdReply(t: Msgs, pet: PetInfo, device: DeviceInfo | null, command: 'find' | 'light', lang: string): AssistantReply {
  if (!device || device.status === 'unbound') return noDeviceReply(t, pet, lang)
  if (device.status !== 'online') {
    const reason = lang === 'zh-CN' ? '设备离线' : 'device is offline'
    return { reply: fill(t.cmdFailed, { reason }), action: null, intent: 'none' }
  }
  const reply = command === 'find' ? fill(t.cmdFind, { name: pet.name }) : fill(t.cmdLight, { name: pet.name })
  return { reply, action: { type: 'command', command, deviceId: device.id }, intent: command }
}

function healthReply(t: Msgs, pet: PetInfo): AssistantReply {
  const data = telemetry[pet.id]
  if (!data || !data.length) {
    return { reply: fill(t.cmdFailed, { reason: 'no data' }), action: null, intent: 'none' }
  }
  const m = data[data.length - 1]
  const abnormal: string[] = []
  if (m.heartRate < RANGES.heartRate.min || m.heartRate > RANGES.heartRate.max) abnormal.push('hr')
  if (m.spo2 < RANGES.spo2.min) abnormal.push('spo2')
  if (m.temperature < RANGES.temperature.min || m.temperature > RANGES.temperature.max) abnormal.push('temp')
  if (m.respiratoryRate < RANGES.respiratoryRate.min || m.respiratoryRate > RANGES.respiratoryRate.max) abnormal.push('rr')
  let reply = fill(t.healthSummary, {
    name: pet.name,
    temp: m.temperature,
    hr: m.heartRate,
    spo2: m.spo2,
    rr: m.respiratoryRate,
    hint: '',
  })
  if (abnormal.length) reply += ' ' + fill(t.healthAbnormal, { name: pet.name, n: abnormal.length })
  return { reply, action: null, intent: 'health' }
}

function reportReply(t: Msgs, pet: PetInfo): AssistantReply {
  const list = reports.filter((r) => r.petId === pet.id).sort((a, b) => b.startAt - a.startAt)
  if (!list.length) return { reply: fill(t.reportNone, { name: pet.name }), action: null, intent: 'report' }
  const r = list[0]
  const status =
    r.doctorReview === 'approved' ? t.reportApproved : r.doctorReview === 'rejected' ? t.reportRejected : t.reportPending
  return { reply: fill(t.reportReply, { name: pet.name, score: r.score, status }), action: null, intent: 'report' }
}

defineMock([
  // 语音助手对话：关键词意图解析 + 双语回复
  {
    method: 'post',
    path: '/assistant/chat',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const { text = '', petId = '', lang = 'zh-CN' } = (ctx.body ?? {}) as {
        text?: string
        petId?: string
        lang?: string
      }
      const t = msg(lang)
      const kw = String(text).toLowerCase()
      const pet = petId ? findPetById(petId) : undefined
      if (!pet || !user.petIds.includes(pet.id)) {
        return { reply: t.needPet, action: null, intent: 'none' } as AssistantReply
      }
      const device = pet.deviceId ? (findDeviceById(pet.deviceId) ?? null) : null

      // 语音指令：响铃找宠
      if (/铃|beep|find|响/.test(kw) && !/不/.test(kw)) return cmdReply(t, pet, device, 'find', lang)
      // 点亮警示灯
      if (/灯|light/.test(kw) && !/不/.test(kw)) return cmdReply(t, pet, device, 'light', lang)
      // 请求定位
      if (/定位|位置|坐标|location|locat/.test(kw)) {
        if (!device || device.status === 'unbound') return noDeviceReply(t, pet, lang)
        const center = device.geofence?.center ?? { lat: 31.2304, lng: 121.4737 }
        return {
          reply: fill(t.locationReply, {
            name: pet.name,
            lat: center.lat.toFixed(4),
            lng: center.lng.toFixed(4),
          }),
          action: { type: 'route', path: '/user/location' },
          intent: 'location',
        } as AssistantReply
      }
      // 健康咨询
      if (/健康|体温|心率|血氧|呼吸|状态|health|temp|spo2|hr|ok|好/.test(kw)) return healthReply(t, pet)
      // 健康报告
      if (/报告|report/.test(kw)) return reportReply(t, pet)
      // 兜底
      return { reply: t.parseFailed, action: null, intent: 'none' } as AssistantReply
    },
  },
])

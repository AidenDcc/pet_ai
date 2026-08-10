import type { DeviceInfo, UploadRecord } from '@/types'
import { defineMock, MockError, requireUser, mockAddress, rand } from '../helper'
import { devices, pets, findDeviceById, findDeviceBySn, findPetById, tracks, telemetry, uploadLogs, pushUpload } from '../db'

export interface DeviceJoined extends DeviceInfo {
  petName: string | null
  ownerName: string | null
}

export interface UploadRecordJoined extends UploadRecord {
  petName: string | null
}

function joinDevice(device: DeviceInfo): DeviceJoined {
  const pet = pets.find((p) => p.id === device.boundPetId)
  return {
    ...device,
    petName: pet?.name ?? null,
    ownerName: device.ownerId ?? null,
  }
}

function joinUpload(record: UploadRecord): UploadRecordJoined {
  const pet = pets.find((p) => p.id === record.petId)
  return { ...record, petName: pet?.name ?? null }
}

const COMMAND_TEXT: Record<string, string> = {
  find: '已向项圈下发蜂鸣指令，正在呼叫宠物',
  light: '项圈警示灯已点亮',
  feed: '自动投喂指令已下发',
  refresh: '已请求刷新最新定位',
}

defineMock([
  // 蓝牙扫描：返回周边未绑定设备（信号强度随机模拟）
  {
    method: 'get',
    path: '/device/bluetooth-scan',
    handler: () => {
      // 取所有未绑定设备作为扫描结果，模拟蓝牙发现的信号强度
      return devices
        .filter((d) => d.status === 'unbound')
        .slice(0, 8)
        .map((d) => ({
          id: d.id,
          name: d.name,
          sn: d.sn,
          model: d.model,
          rssi: Math.floor(Math.random() * 50 - 85), // -85 ~ -35 dBm
          bonded: false,
        }))
    },
  },
  // 设备列表：用户端看自己的，医生/运营看全部
  {
    method: 'get',
    path: '/device/list',
    handler: (ctx) => {
      const user = requireUser(ctx)
      if (user.role === 'user') {
        return devices.filter((d) => d.ownerId === user.id).map(joinDevice)
      }
      return devices.map(joinDevice)
    },
  },
  // 设备详情
  {
    method: 'get',
    path: '/device/:id',
    handler: ({ params }) => {
      const device = findDeviceById(params.id)
      if (!device) throw new MockError('设备不存在', 404)
      return joinDevice(device)
    },
  },
  // 绑定设备
  {
    method: 'post',
    path: '/device/bind',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const { sn, petId } = (ctx.body ?? {}) as { sn?: string; petId?: string }
      if (!sn || !petId) throw new MockError('请填写设备 SN 并选择宠物', 1003)
      const device = findDeviceBySn(sn)
      if (!device) throw new MockError('未找到该 SN 对应的 Pet-S1 设备，请核对后重试', 1004)
      if (device.boundPetId) throw new MockError(`设备 ${device.sn} 已被绑定，请更换设备`, 1005)
      const pet = findPetById(petId)
      if (!pet) throw new MockError('选择的宠物不存在', 404)
      device.boundPetId = pet.id
      device.ownerId = user.id
      device.status = 'online'
      device.activatedAt = new Date().toISOString()
      device.lastSyncAt = new Date().toISOString()
      device.geofence = { center: { lat: 31.2304, lng: 121.4737 }, radius: 500, enabled: true }
      pet.deviceId = device.id
      return joinDevice(device)
    },
  },
  // 解绑设备
  {
    method: 'post',
    path: '/device/unbind/:id',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const device = findDeviceById(ctx.params.id)
      if (!device) throw new MockError('设备不存在', 404)
      if (device.ownerId && device.ownerId !== user.id) throw new MockError('无权解绑该设备', 403)
      const pet = device.boundPetId ? findPetById(device.boundPetId) : undefined
      if (pet) pet.deviceId = null
      device.boundPetId = null
      device.ownerId = null
      device.status = 'unbound'
      device.activatedAt = null
      device.geofence = null
      return { ok: true }
    },
  },
  // 远程指令
  {
    method: 'post',
    path: '/device/command',
    handler: (ctx) => {
      requireUser(ctx)
      const { deviceId, command } = (ctx.body ?? {}) as { deviceId?: string; command?: string }
      const device = findDeviceById(String(deviceId ?? ''))
      if (!device) throw new MockError('设备不存在', 404)
      if (device.status !== 'online') throw new MockError('设备当前离线，指令无法下发', 1006)
      // 刷新定位指令同时模拟一次上报：更新信号 / 电量 / 同步时间
      if (command === 'refresh') {
        device.signal = rand(-85, -40)
        device.battery = Math.max(5, Math.min(100, device.battery + rand(-2, 3)))
        device.lastSyncAt = new Date().toISOString()
      }
      return {
        ok: true,
        message: COMMAND_TEXT[String(command ?? '')] ?? '指令已下发',
      }
    },
  },
  // 更新电子围栏
  {
    method: 'put',
    path: '/device/geofence',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const { deviceId, center, radius, enabled } = (ctx.body ?? {}) as {
        deviceId?: string
        center?: { lat: number; lng: number }
        radius?: number
        enabled?: boolean
      }
      const device = findDeviceById(String(deviceId ?? ''))
      if (!device) throw new MockError('设备不存在', 404)
      if (device.ownerId && device.ownerId !== user.id) throw new MockError('无权操作该设备', 403)
      device.geofence = {
        center: center ?? device.geofence?.center ?? { lat: 31.2304, lng: 121.4737 },
        radius: radius ?? device.geofence?.radius ?? 500,
        enabled: enabled ?? device.geofence?.enabled ?? true,
      }
      return joinDevice(device)
    },
  },
  // 定位轨迹
  {
    method: 'get',
    path: '/device/:id/track',
    handler: ({ params }) => {
      const device = findDeviceById(params.id)
      if (!device) throw new MockError('设备不存在', 404)
      const petId = device.boundPetId
      if (!petId || !tracks[petId]) throw new MockError('暂无轨迹数据', 404)
      const center = device.geofence?.center ?? tracks[petId][tracks[petId].length - 1]
      return { petId, points: tracks[petId], center, address: mockAddress(center.lat, center.lng) }
    },
  },
  // 实时生命体征流
  {
    method: 'get',
    path: '/device/:id/telemetry',
    handler: ({ params }) => {
      const device = findDeviceById(params.id)
      if (!device) throw new MockError('设备不存在', 404)
      const petId = device.boundPetId
      if (!petId || !telemetry[petId]) throw new MockError('暂无实时数据', 404)
      return { petId, points: telemetry[petId] }
    },
  },
  // 体征上报记录（数据同步页）
  {
    method: 'get',
    path: '/device/:id/uploads',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const device = findDeviceById(ctx.params.id)
      if (!device) throw new MockError('设备不存在', 404)
      if (device.ownerId && device.ownerId !== user.id) throw new MockError('无权查看该设备', 403)
      return uploadLogs.filter((r) => r.deviceId === device.id).map(joinUpload)
    },
  },
  // 手动触发体征上传（模拟项圈上报）
  {
    method: 'post',
    path: '/device/:id/upload',
    handler: (ctx) => {
      const user = requireUser(ctx)
      const device = findDeviceById(ctx.params.id)
      if (!device) throw new MockError('设备不存在', 404)
      if (device.ownerId && device.ownerId !== user.id) throw new MockError('无权操作该设备', 403)
      if (device.status === 'unbound' || !device.boundPetId) throw new MockError('设备未绑定宠物，无法上传', 1007)
      return joinUpload(pushUpload(device.id, 'manual'))
    },
  },
])

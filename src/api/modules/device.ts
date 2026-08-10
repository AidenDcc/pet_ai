import request from '../request'
import type { DeviceInfo, Geofence, GeoPoint, HealthMetric, UploadRecord } from '@/types'

export interface UploadRecordJoined extends UploadRecord {
  petName: string | null
}

export interface DeviceJoined extends DeviceInfo {
  petName: string | null
  ownerName: string | null
}

export function getDeviceListApi() {
  return request.get<unknown, DeviceJoined[]>('/device/list')
}

export function getDeviceApi(id: string) {
  return request.get<unknown, DeviceJoined>(`/device/${id}`)
}

/** 蓝牙扫描结果 */
export interface BluetoothDevice {
  id: string
  name: string
  sn: string
  model: string
  rssi: number // 信号强度 dBm
  bonded: boolean // 是否已绑定
}

/** 扫描周边蓝牙设备 */
export function scanBluetoothApi() {
  return request.get<unknown, BluetoothDevice[]>('/device/bluetooth-scan')
}

export function bindDeviceApi(data: { sn: string; petId: string; name?: string }) {
  return request.post<unknown, DeviceJoined>('/device/bind', data)
}

export function unbindDeviceApi(id: string) {
  return request.post<unknown, { ok: boolean }>(`/device/unbind/${id}`)
}

export function commandDeviceApi(data: { deviceId: string; command: string }) {
  return request.post<unknown, { ok: boolean; message: string }>('/device/command', data)
}

export function updateGeofenceApi(data: {
  deviceId: string
  center?: { lat: number; lng: number }
  radius?: number
  enabled?: boolean
}) {
  return request.put<unknown, DeviceJoined>('/device/geofence', data)
}

export function getDeviceTrackApi(id: string) {
  return request.get<unknown, { petId: string; points: GeoPoint[]; center: { lat: number; lng: number } }>(
    `/device/${id}/track`,
  )
}

export function getDeviceTelemetryApi(id: string) {
  return request.get<unknown, { petId: string; points: HealthMetric[] }>(`/device/${id}/telemetry`)
}

/** 体征上报记录（数据同步页） */
export function getUploadLogsApi(deviceId: string) {
  return request.get<unknown, UploadRecordJoined[]>(`/device/${deviceId}/uploads`)
}

/** 手动触发一次体征上报（模拟项圈上传） */
export function uploadDeviceDataApi(deviceId: string) {
  return request.post<unknown, UploadRecordJoined>(`/device/${deviceId}/upload`)
}

export type { Geofence }

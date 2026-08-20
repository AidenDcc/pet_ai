import request from '../request'
import type { DeviceInfo, Geofence, GeoPoint, HealthMetric, UploadRecord } from '@/types'

export interface UploadRecordJoined extends UploadRecord {
  petName: string | null
}

export interface DeviceJoined extends DeviceInfo {
  petName: string | null
  ownerName: string | null
  /** 该型号最新已发布固件版本号（空串表示暂无） */
  latestFirmware: string
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

/** 切换绑定宠物：解绑原宠物并绑定新宠物 */
export function rebindDeviceApi(id: string, petId: string) {
  return request.post<unknown, DeviceJoined>(`/device/${id}/rebind`, { petId })
}

/** 设备固件检查结果 */
export interface DeviceFirmwareInfo {
  current: string
  latest: string
  upgradable: boolean
  latestPackage: {
    version: string
    name: string
    description: string
    releaseDate: string
    fileSize: number
  } | null
}

/** 固件检查 */
export function getDeviceFirmwareApi(id: string) {
  return request.get<unknown, DeviceFirmwareInfo>(`/device/${id}/firmware`)
}

/** 固件升级 */
export function upgradeDeviceFirmwareApi(id: string) {
  return request.post<unknown, { ok: boolean; firmware: string }>(`/device/${id}/firmware/upgrade`)
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
  return request.get<unknown, { petId: string; points: GeoPoint[]; center: { lat: number; lng: number }; address: string }>(
    `/device/${id}/track`,
  )
}

/** 历史轨迹：按 from/to 时间区间（毫秒时间戳）筛选 */
export function getDeviceTrackHistoryApi(id: string, range?: { from: number; to: number }) {
  return request.get<unknown, { petId: string; points: GeoPoint[]; center: { lat: number; lng: number }; address: string }>(
    `/device/${id}/track-history`,
    { params: range },
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

/** 附近可扫描到的 WiFi 热点 */
export interface WifiAp {
  ssid: string
  signal: number // RSSI dBm
  secured: boolean
}

/** 设备当前 WiFi 配置状态 + 附近热点 */
export interface DeviceWifiInfo {
  /** 当前已连接的 WiFi 名称（未配置为 null） */
  ssid: string | null
  connected: boolean
  signal: number
  nearby: WifiAp[]
}

/** 查询设备 WiFi 配置状态与附近热点 */
export function getDeviceWifiApi(id: string) {
  return request.get<unknown, DeviceWifiInfo>(`/device/${id}/wifi`)
}

/** 给设备配置 WiFi（连接指定热点） */
export function configureDeviceWifiApi(id: string, data: { ssid: string; password?: string }) {
  return request.post<unknown, { ok: boolean; ssid: string }>(`/device/${id}/wifi`, data)
}

export type { Geofence }

import request from '../request'
import type { DeviceMaster, FirmwarePackage, PageQuery, PageResult } from '@/types'

/** 设备主档案分页 */
export function getDeviceMastersApi(params: Partial<PageQuery> & { status?: string }) {
  return request.get<unknown, PageResult<DeviceMaster>>('/admin/device-masters', { params })
}

/** 新增设备主档案 */
export function createDeviceMasterApi(data: Partial<DeviceMaster>) {
  return request.post<unknown, DeviceMaster>('/admin/device-masters', data)
}

/** 编辑设备主档案 */
export function updateDeviceMasterApi(id: string, data: Partial<DeviceMaster>) {
  return request.put<unknown, DeviceMaster>(`/admin/device-masters/${id}`, data)
}

/** 失效 / 生效 */
export function updateDeviceMasterStatusApi(id: string, status: DeviceMaster['status']) {
  return request.patch<unknown, DeviceMaster>(`/admin/device-masters/${id}/status`, { status })
}

/** 模拟 Excel 导入 */
export function importDeviceMastersApi() {
  return request.post<unknown, { imported: number }>('/admin/device-masters/import')
}

/** 固件包分页 */
export function getFirmwarePackagesApi(params: Partial<PageQuery> & { status?: string }) {
  return request.get<unknown, PageResult<FirmwarePackage>>('/admin/firmware-packages', { params })
}

/** 上传 / 新增固件包 */
export function createFirmwarePackageApi(data: Partial<FirmwarePackage>) {
  return request.post<unknown, FirmwarePackage>('/admin/firmware-packages', data)
}

/** 编辑固件包 */
export function updateFirmwarePackageApi(id: string, data: Partial<FirmwarePackage>) {
  return request.put<unknown, FirmwarePackage>(`/admin/firmware-packages/${id}`, data)
}

/** 固件包文件信息（模拟下载） */
export function getFirmwareFileApi(id: string) {
  return request.get<unknown, { fileName: string; fileSize: number; url: string }>(`/admin/firmware-packages/${id}/file`)
}

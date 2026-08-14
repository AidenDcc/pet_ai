import { defineMock, MockError, paginate, filterByKeyword, requireRole, uid } from '../helper'
import { deviceMasters, firmwarePackages } from '../db'
import type { DeviceMaster, FirmwarePackage } from '@/types'

/** 模拟 Excel 导入：一次性插入的演示设备数据 */
const IMPORT_SAMPLES: Array<Partial<DeviceMaster>> = [
  {
    sn: 'SX019900101',
    imei: '861234568888101',
    productName: 'Pet-S1 智能项圈',
    brand: '数心科技',
    model: 'Pet-S1',
    assetNo: 'ZC-2024-0201',
    imageUrl: '',
    category1: 'cat1Wearable',
    category2: 'cat2Collar',
    mac: 'A4:6E:8C:IM01:0101:0101',
    hardwareVersion: 'V1.4',
    firmwareVersion: 'v2.5.0',
    commMethods: ['4g', 'ble', 'wifi'],
    macByMethod: { '4g': 'A4:6E:8C:IM01:0101:0101', ble: 'A4:6E:8C:IM01:0101:0101', wifi: 'A4:6E:8C:IM01:0101:0101' },
    protocol: 'MQTT v3.1.1',
    color: 'colorBlack',
    manuDate: '2024-04-02',
    registerDate: '',
    iotDeviceId: '',
    iotToken: '',
    indicators: ['heartRate', 'respiratoryRate', 'spo2', 'temperature', 'activity', 'sleep', 'calorie'],
    status: 'active',
  },
  {
    sn: 'SX019900102',
    imei: '861234568888102',
    productName: 'Pet-S1 智能项圈',
    brand: '数心科技',
    model: 'Pet-S1',
    assetNo: 'ZC-2024-0202',
    imageUrl: '',
    category1: 'cat1Wearable',
    category2: 'cat2Collar',
    mac: 'A4:6E:8C:IM01:0102:0102',
    hardwareVersion: 'V1.4',
    firmwareVersion: 'v2.5.0',
    commMethods: ['ble', 'wifi'],
    macByMethod: { ble: 'A4:6E:8C:IM01:0102:0102', wifi: 'A4:6E:8C:IM01:0102:0102' },
    protocol: 'MQTT v3.1.1',
    color: 'colorPink',
    manuDate: '2024-04-02',
    registerDate: '',
    iotDeviceId: '',
    iotToken: '',
    indicators: ['heartRate', 'spo2', 'temperature', 'activity'],
    status: 'active',
  },
  {
    sn: 'SX019900103',
    imei: '861234568888103',
    productName: 'Pet-S1 智能项圈',
    brand: '数心科技',
    model: 'Pet-S1',
    assetNo: 'ZC-2024-0203',
    imageUrl: '',
    category1: 'cat1Wearable',
    category2: 'cat2Collar',
    mac: 'A4:6E:8C:IM01:0103:0103',
    hardwareVersion: 'V1.4',
    firmwareVersion: 'v2.5.0',
    commMethods: ['4g', 'ble'],
    macByMethod: { '4g': 'A4:6E:8C:IM01:0103:0103', ble: 'A4:6E:8C:IM01:0103:0103' },
    protocol: 'MQTT v3.1.1',
    color: 'colorBlue',
    manuDate: '2024-04-03',
    registerDate: '',
    iotDeviceId: '',
    iotToken: '',
    indicators: ['heartRate', 'temperature', 'activity'],
    status: 'active',
  },
]

defineMock([
  // 设备主档案分页
  {
    method: 'get',
    path: '/admin/device-masters',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const { page = 1, pageSize = 10, keyword = '', status = 'all' } = ctx.query as {
        page?: number
        pageSize?: number
        keyword?: string
        status?: string
      }
      let list = [...deviceMasters]
      if (status !== 'all') list = list.filter((d) => d.status === status)
      list = filterByKeyword(list, String(keyword), ['sn', 'assetNo', 'productName', 'model'])
      return paginate(list, Number(page), Number(pageSize))
    },
  },
  // 新增设备主档案
  {
    method: 'post',
    path: '/admin/device-masters',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const body = (ctx.body ?? {}) as Partial<DeviceMaster>
      const record: DeviceMaster = {
        id: uid('dm'),
        sn: '',
        imei: '',
        productName: '',
        brand: '',
        model: '',
        assetNo: '',
        imageUrl: '',
        category1: '',
        category2: '',
        mac: '',
        hardwareVersion: '',
        firmwareVersion: '',
        commMethods: [],
        macByMethod: {},
        protocol: '',
        color: '',
        manuDate: '',
        registerDate: '',
        iotDeviceId: '',
        iotToken: '',
        indicators: [],
        status: 'active',
        ...body,
      }
      deviceMasters.push(record)
      return record
    },
  },
  // 编辑设备主档案
  {
    method: 'put',
    path: '/admin/device-masters/:id',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const record = deviceMasters.find((d) => d.id === ctx.params.id)
      if (!record) throw new MockError('设备不存在', 404)
      const patch = (ctx.body ?? {}) as Partial<DeviceMaster>
      Object.assign(record, patch)
      return record
    },
  },
  // 失效 / 生效
  {
    method: 'patch',
    path: '/admin/device-masters/:id/status',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const record = deviceMasters.find((d) => d.id === ctx.params.id)
      if (!record) throw new MockError('设备不存在', 404)
      const { status } = (ctx.body ?? {}) as { status?: DeviceMaster['status'] }
      record.status = status === 'inactive' ? 'inactive' : 'active'
      return record
    },
  },
  // 模拟 Excel 导入
  {
    method: 'post',
    path: '/admin/device-masters/import',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const imported = IMPORT_SAMPLES.map((s) => ({ ...s, id: uid('dm') }))
      deviceMasters.push(...(imported as DeviceMaster[]))
      return { imported: imported.length }
    },
  },
  // 固件包分页
  {
    method: 'get',
    path: '/admin/firmware-packages',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const { page = 1, pageSize = 10, keyword = '', status = 'all' } = ctx.query as {
        page?: number
        pageSize?: number
        keyword?: string
        status?: string
      }
      let list = [...firmwarePackages]
      if (status !== 'all') list = list.filter((f) => f.status === status)
      list = filterByKeyword(list, String(keyword), ['name', 'version', 'fileName'])
      return paginate(list, Number(page), Number(pageSize))
    },
  },
  // 上传 / 新增固件包
  {
    method: 'post',
    path: '/admin/firmware-packages',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const body = (ctx.body ?? {}) as Partial<FirmwarePackage>
      const record: FirmwarePackage = {
        id: uid('fw'),
        name: '',
        version: '',
        supportModels: [],
        supportCategories: [],
        releaseDate: '',
        status: 'unpublished',
        fileSize: 0,
        fileName: '',
        upgradedCount: 0,
        description: '',
        ...body,
      }
      firmwarePackages.push(record)
      return record
    },
  },
  // 编辑固件包
  {
    method: 'put',
    path: '/admin/firmware-packages/:id',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const record = firmwarePackages.find((f) => f.id === ctx.params.id)
      if (!record) throw new MockError('固件包不存在', 404)
      const patch = (ctx.body ?? {}) as Partial<FirmwarePackage>
      Object.assign(record, patch)
      return record
    },
  },
  // 固件包文件信息（模拟下载）
  {
    method: 'get',
    path: '/admin/firmware-packages/:id/file',
    handler: (ctx) => {
      requireRole(ctx, 'admin')
      const record = firmwarePackages.find((f) => f.id === ctx.params.id)
      if (!record) throw new MockError('固件包不存在', 404)
      return { fileName: record.fileName, fileSize: record.fileSize, url: `/download/${record.fileName}` }
    },
  },
])

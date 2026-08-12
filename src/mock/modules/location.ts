import { tracks } from '../db'
import { defineMock, randFloat, rand } from '../helper'

/** 模拟手机实时定位（Web demo 无真实 GPS，用一个漂移点模拟用户手机位置） */

let phoneLoc: { lat: number; lng: number } | null = null
let phonePetId: string | null = null

/**
 * 取（并推进）模拟手机定位：
 * 以目标宠物轨迹最新点为锚点初始化（偏移 ~150m），之后每次调用在 ±0.0003°（约 30m）内漂移。
 * 导出供围栏 mock 复用，保证地图上动态围栏中心与距离计算一致。
 */
export function getSimPhoneLoc(petId: string): { lat: number; lng: number } {
  const pts = tracks[petId]
  const anchor = pts?.[pts.length - 1] ?? { lat: 31.2304, lng: 121.4737 }
  if (!phoneLoc || phonePetId !== petId) {
    phoneLoc = { lat: anchor.lat + 0.001, lng: anchor.lng + 0.001 }
    phonePetId = petId
  } else {
    phoneLoc.lat += randFloat(-0.0003, 0.0003, 6)
    phoneLoc.lng += randFloat(-0.0003, 0.0003, 6)
  }
  return phoneLoc
}

defineMock([
  {
    method: 'get',
    path: '/user/location/:petId',
    handler: ({ params }) => {
      const pos = getSimPhoneLoc(params.petId)
      return { lat: pos.lat, lng: pos.lng, accuracy: rand(5, 15), updatedAt: Date.now() }
    },
  },
])

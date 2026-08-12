import type { PetFence } from '@/types'

/** 两点经纬度（近似地球）距离，单位：米 */
export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** 供地图渲染的围栏列表：动态围栏的中心覆盖为手机实时定位 */
export function buildMapFences(
  fences: PetFence[],
  phoneLoc: { lat: number; lng: number } | null,
): PetFence[] {
  if (!phoneLoc) return fences
  return fences.map((f) => (f.type === 'dynamic' ? { ...f, center: phoneLoc } : f))
}

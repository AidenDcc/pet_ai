import request from '../request'

export interface PhoneLocation {
  lat: number
  lng: number
  /** 定位精度（米） */
  accuracy: number
  updatedAt: number
}

/** 获取手机实时定位（mock 模拟：以当前宠物轨迹为锚点缓慢漂移） */
export function getMyLocationApi(petId: string) {
  return request.get<unknown, PhoneLocation>(`/user/location/${petId}`)
}

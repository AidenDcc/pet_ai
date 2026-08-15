import neckRing from '@/asset/image/颈环-1.png'
import collar from '@/asset/image/项圈-2.png'

/**
 * 设备形态 → 本地产品图。
 * 颈环（neckring）→ 颈环-1.png，项圈（collar）→ 项圈-2.png；
 * 未识别形态时回退到项圈图。
 */
const DEVICE_IMAGE_MAP: Record<string, string> = {
  neckring: neckRing,
  collar: collar,
}

export function deviceImageSrc(type?: string | null): string {
  return DEVICE_IMAGE_MAP[type ?? ''] ?? collar
}

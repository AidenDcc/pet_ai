import bdAvatar from '@/asset/image/宠物头像-布丁.png'
import xqAvatar from '@/asset/image/宠物头像-雪球.png'

/**
 * 演示宠物专属头像：按宠物名映射本地图片。
 * 布丁 → 宠物头像-布丁.png，雪球 → 宠物头像-雪球.png；
 * 其余宠物无专属资源，返回 undefined，由调用方回退到宠物自身头像。
 */
const PET_AVATAR_MAP: Record<string, string> = {
  布丁: bdAvatar,
  雪球: xqAvatar,
}

export function petAvatarSrc(name?: string | null): string | undefined {
  if (!name) return undefined
  return PET_AVATAR_MAP[name]
}

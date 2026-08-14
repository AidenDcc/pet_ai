import personalAvatar from '@/asset/image/个人头像.png'

/** 生成内联 SVG 头像 data-URI（自包含，无 defs/渐变，避免 data-URI 陷阱） */
function svgAvatar(bg: string, emoji: string): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="48" fill="${bg}"/><text x="48" y="62" font-size="38" text-anchor="middle">${emoji}</text></svg>`,
  )}`
}

export interface PresetAvatar {
  id: string
  src: string
}

/** 账号信息头像编辑：预设头像宫格 */
export const PRESET_AVATARS: PresetAvatar[] = [
  { id: 'personal', src: personalAvatar },
  { id: 'cat', src: svgAvatar('#ffd54a', '🐱') },
  { id: 'dog', src: svgAvatar('#00b4a6', '🐶') },
  { id: 'paw', src: svgAvatar('#5b8ff9', '🐾') },
  { id: 'heart', src: svgAvatar('#ff9f43', '❤️') },
  { id: 'star', src: svgAvatar('#7d6bff', '⭐') },
]

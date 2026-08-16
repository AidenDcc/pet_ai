<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { getMySubscriptionApi } from '@/api/modules/order'
import { getUnreadCountApi } from '@/api/modules/notification'
import { APP_VERSION } from '@/utils/consts'
import personalAvatar from '@/asset/image/个人头像.png'

const router = useRouter()
const auth = useAuthStore()
const { t } = useI18n()

const subscription = ref<{ plan: { name: string; color: string } | null; expireAt: string | null } | null>(null)

async function load() {
  try {
    subscription.value = await getMySubscriptionApi()
  } catch {
    // 忽略订阅加载失败
  }
}
load()

// 未读消息数：右上角铃铛红点提醒
const unreadCount = ref(0)

async function loadUnread() {
  try {
    unreadCount.value = (await getUnreadCountApi()).total
  } catch {
    // 忽略未读消息加载失败
  }
}
loadUnread()

function switchRole() {
  auth.logout()
  router.push('/')
}

function go(path: string) {
  router.push(path)
}

// 社交统计数据：暂无社区统计模型，先按设计稿静态展示
const STATS = [
  { label: 'user.me.followers', value: 158 },
  { label: 'user.me.following', value: 66 },
  { label: 'user.me.likedCount', value: 3152 },
]

// 四宫格圆形功能按钮
const QUICK = [
  { label: 'user.me.myPets', icon: 'paw', path: '/user/pets' },
  { label: 'user.me.myDevices', icon: 'doc', path: '/user/devices' },
  { label: 'user.me.consultRecords', icon: 'chat', path: '/user/consult' },
  { label: 'user.me.reports', icon: 'heart', path: '/user/reports' },
]

// 列表式功能菜单
const MENU = [
  { label: 'user.me.myPosts', icon: 'plane', path: '/user/myposts' },
  { label: 'user.me.encyclopedia', icon: 'bag', path: '/user/encyclopedia' },
  { label: 'user.me.subscription', icon: 'gift', path: '/user/subscription' },
]

// 顶部右上角：铃铛通知 / 六边形设置
function onBell() {
  go('/user/messages')
}
</script>

<template>
  <div class="me-page">
    <!-- 顶部渐变暖黄头部 -->
    <header class="me-header">
      <!-- 右上角线性小图标：铃铛通知 / 六边形设置 -->
      <div class="me-actions">
        <button class="me-action" type="button" aria-label="notification" @click="onBell">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M24 8c-7 0-11 5.5-11 11 0 5-2.5 8-4 10h30c-1.5-2-4-5-4-10 0-5.5-4-11-11-11z" />
              <path d="M19.5 37a4.5 4.5 0 0 0 9 0" />
            </g>
          </svg>
          <span v-if="unreadCount" class="me-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        </button>
        <button class="me-action" type="button" aria-label="settings" @click="go('/user/settings')">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M24 5 40 14v20L24 43 8 34V14Z" />
              <circle cx="24" cy="24" r="5" />
            </g>
          </svg>
        </button>
      </div>

      <!-- 左侧猫咪头像（戴绿色卡通头套）+ 用户名/签名 -->
      <div class="me-profile">
        <div class="me-avatar">
          <svg class="avatar-ears" viewBox="0 0 120 56" aria-hidden="true">
            <path d="M30 54 C16 34 14 12 32 4 C36 22 36 40 34 54 Z" fill="#66bb6a" />
            <path d="M90 54 C104 34 106 12 88 4 C84 22 84 40 86 54 Z" fill="#66bb6a" />
          </svg>
          <img :src="auth.user?.avatar || personalAvatar" :alt="auth.user?.name" />
        </div>
        <div class="me-user">
          <div class="me-name">
            {{ auth.user?.name }}
            <span v-if="subscription?.plan?.name" class="me-plan" :style="{ color: subscription.plan.color, background: subscription.plan.color + '22' }">
              {{ subscription.plan.name }}
            </span>
          </div>
          <div class="me-sign">{{ t('user.me.signature') }}</div>
        </div>
      </div>
    </header>

    <!-- 数据统计白色圆角卡片 -->
    <section class="me-stats">
      <div v-for="s in STATS" :key="s.label" class="stat">
        <div class="stat-num">{{ s.value }}</div>
        <div class="stat-label">{{ t(s.label) }}</div>
      </div>
    </section>

    <!-- 四宫格圆形功能按钮 -->
    <div class="me-grid">
      <div v-for="item in QUICK" :key="item.icon" class="me-grid-item" @click="go(item.path)">
        <div class="me-grid-icon">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <!-- 爪印 → 我的宠物 -->
            <g v-if="item.icon === 'paw'" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="14" r="3" />
              <circle cx="18" cy="10.5" r="2.6" />
              <circle cx="30" cy="10.5" r="2.6" />
              <circle cx="37" cy="14" r="3" />
              <path d="M14 30c0-5.5 4.5-9 10-9s10 3.5 10 9c0 4-2.8 7-10 7s-10-3-10-7z" />
            </g>
            <!-- 清单文档 → 我的设备 -->
            <g v-else-if="item.icon === 'doc'" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="12" y="9" width="24" height="32" rx="5" />
              <path d="M17 9h14v5h-14z" />
              <path d="M17 24l4 4 7-8" />
              <path d="M17 35h8" />
            </g>
            <!-- 对话框气泡 → 问诊记录 -->
            <g v-else-if="item.icon === 'chat'" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M24 9C15 9 8 15.5 8 23a14.5 14.5 0 0 0 6.5 12L8 39l9-2.8A14.5 14.5 0 0 0 24 37c9 0 16-6.3 16-14S33 9 24 9z" />
              <circle cx="17" cy="23" r="2" fill="currentColor" stroke="none" />
              <circle cx="24" cy="23" r="2" fill="currentColor" stroke="none" />
              <circle cx="31" cy="23" r="2" fill="currentColor" stroke="none" />
            </g>
            <!-- 爱心 → 健康报告 -->
            <g v-else-if="item.icon === 'heart'" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round">
              <path d="M24 40C14 32 6 25 6 16.5 6 11 10.5 7 16 7c4.5 0 8 2.5 8 2.5s3.5-2.5 8-2.5c5.5 0 10 4 10 9.5C42 25 34 32 24 40z" />
            </g>
          </svg>
        </div>
        <span class="me-grid-label">{{ t(item.label) }}</span>
      </div>
    </div>

    <!-- 列表式功能菜单 -->
    <div class="me-menu">
      <div v-for="item in MENU" :key="item.icon" class="me-menu-item" @click="go(item.path)">
        <span class="me-menu-icon">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <!-- 纸飞机 → 我的发布 -->
            <g v-if="item.icon === 'plane'" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 22 42 7 31 42 24 27 6 22z" />
              <path d="M24 27 42 7" />
            </g>
            <!-- 手提宠物包 → 养宠百科 -->
            <g v-else-if="item.icon === 'bag'" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 16h20l2.5 23a5 5 0 0 1-5 5H16.5a5 5 0 0 1-5-5z" />
              <path d="M18 16a6 6 0 0 1 12 0" />
              <circle cx="24" cy="28" r="4.5" />
            </g>
            <!-- 服务礼盒 → 订阅服务 -->
            <g v-else-if="item.icon === 'gift'" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round">
              <rect x="7" y="20" width="34" height="20" rx="4" />
              <path d="M7 20 24 12l17 8" stroke-linecap="round" />
              <path d="M24 12v28" stroke-linecap="round" />
            </g>
          </svg>
        </span>
        <span class="me-menu-text">{{ t(item.label) }}</span>
        <van-icon name="arrow" class="me-menu-arrow" />
      </div>
    </div>

    <!-- 底部：切换角色 / 退出登录 / 版本 -->
    <div class="me-menu me-menu--foot">
      <div class="me-menu-item" @click="switchRole">
        <span class="me-menu-icon">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 10l-6 6 6 6" />
              <path d="M10 16h22" />
              <path d="M32 38l6-6-6-6" />
              <path d="M38 32H16" />
            </g>
          </svg>
        </span>
        <span class="me-menu-text">{{ t('user.me.switchRole') }}</span>
        <van-icon name="arrow" class="me-menu-arrow" />
      </div>
    </div>

    <div class="me-version">{{ t('brand.name') }} · {{ t('brand.platform') }} · v{{ APP_VERSION }}</div>
  </div>
</template>

<style scoped lang="scss">
/* 宠物端「我的」：渐变暖黄头部 + 白色大圆角卡片，扁平萌系、无厚重阴影 */
.me-page {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
  padding-bottom: 84px;
  background: #fbf3e3;
}

/* ---- 顶部渐变暖黄头部 ---- */
.me-header {
  position: relative;
  background: linear-gradient(165deg, #fff6dd 0%, #ffdf7e 55%, #ffc94d 100%);
  border-radius: 0 0 28px 28px;
  padding: 46px 18px 48px;
}

/* 右上角两个线性小图标 */
.me-actions {
  position: absolute;
  top: 40px;
  right: 16px;
  display: flex;
  gap: 14px;

  .me-action {
    position: relative;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.55);
    color: #5a3e0e;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
      width: 21px;
      height: 21px;
    }
  }

  /* 未读消息红点角标 */
  .me-badge {
    position: absolute;
    top: -3px;
    right: -3px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 999px;
    background: #ff4d4f;
    border: 1.5px solid #fff;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    line-height: 16px;
    text-align: center;
    box-sizing: border-box;
  }
}

.me-profile {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 40px;
}

/* 圆形猫咪头像框 + 绿色卡通头套（两只猫耳） */
.me-avatar {
  position: relative;
  width: 78px;
  height: 78px;
  flex-shrink: 0;

  .avatar-ears {
    position: absolute;
    top: -3px;
    left: 50%;
    transform: translateX(-50%);
    width: 96px;
    height: 30px;
    z-index: 0;
  }

  img {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 3px solid #fff;
    background: #e8f5e9;
    object-fit: cover;
    display: block;
  }
}

.me-user {
  flex: 1;
  min-width: 0;

  .me-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 21px;
    font-weight: 800;
    color: #2b2b2b;

    .me-plan {
      flex-shrink: 0;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 9px;
      border-radius: 999px;
    }
  }

  .me-sign {
    margin-top: 6px;
    font-size: 13px;
    color: #8a7a5a;
  }
}

/* ---- 数据统计白色圆角卡片（叠在黄色头部下方） ---- */
.me-stats {
  position: relative;
  z-index: 1;
  display: flex;
  margin: -32px 14px 0;
  background: #fff;
  border-radius: 20px;
  padding: 16px 0;

  .stat {
    flex: 1;
    text-align: center;

    & + .stat {
      border-left: 1px solid #f2ead6;
    }
  }

  .stat-num {
    font-size: 21px;
    font-weight: 800;
    color: #2b2b2b;
  }

  .stat-label {
    margin-top: 4px;
    font-size: 12px;
    color: #8a7a5a;
  }
}

/* ---- 四宫格圆形功能按钮 ---- */
.me-grid {
  display: flex;
  gap: 12px;
  padding: 20px 18px 6px;

  .me-grid-item {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 9px;
    cursor: pointer;
  }

  .me-grid-icon {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    background: #ffd54a;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
      width: 27px;
      height: 27px;
    }
  }

  .me-grid-label {
    font-size: 12px;
    font-weight: 600;
    color: #2b2b2b;
    white-space: nowrap;
  }
}

/* ---- 列表式功能菜单 ---- */
.me-menu {
  background: #fff;
  border-radius: 20px;
  margin: 14px 14px 0;
  overflow: hidden;

  .me-menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    cursor: pointer;

    & + .me-menu-item {
      border-top: 1px solid #f5efdf;
    }
  }

  .me-menu-icon {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: #fff6df;
    color: #e8a21c;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg {
      width: 21px;
      height: 21px;
    }
  }

  .me-menu-text {
    flex: 1;
    font-size: 15px;
    color: #2b2b2b;
  }

  .me-menu-arrow {
    color: #c9b98f;
    font-size: 14px;
  }
}

.me-menu--foot {
  .me-menu-icon {
    background: #fff1e6;
    color: #ff6b00;
  }
}

.me-version {
  margin-top: 16px;
  text-align: center;
  font-size: 11px;
  color: #c4b48c;
}
</style>

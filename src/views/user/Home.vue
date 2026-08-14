<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getMyPetsApi, type PetJoined } from '@/api/modules/pet'
import { SPECIES_ICON } from '@/utils/consts'
import { ageOf } from '@/utils/format'
import petAvatar from '@/asset/image/宠物头像.png'
import { petAvatarSrc } from '@/utils/petAvatar'

const router = useRouter()
const { t } = useI18n()

const pets = ref<PetJoined[]>([])
const activeIndex = ref(0)
const loading = ref(false)

// 洗澡次数：暂无养护记录数据模型，先按设计稿静态展示
const BATH_COUNT = 2
// 驱虫次数：读取宠物档案中的真实驱虫记录数
const dewormCount = computed(() => activePet.value?.dewormings.length ?? 0)
// 疫苗次数：读取宠物档案中的真实疫苗记录数
const vaccineCount = computed(() => activePet.value?.vaccines.length ?? 0)

const activePet = computed(() => pets.value[activeIndex.value] ?? null)

async function loadPets() {
  loading.value = true
  try {
    pets.value = await getMyPetsApi()
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}
loadPets()

function selectPet(i: number) {
  activeIndex.value = i
}

/** 核心宠物信息大卡片：点击进入宠物详情（与「我的宠物」列表详情一致） */
function goPetDetail() {
  const pet = activePet.value
  if (!pet) return
  router.push(`/user/pet/${pet.id}`)
}

/** 顶部汉堡菜单：宠物管理（语言切换已收拢到「设置→系统语言」） */
const showMenu = ref(false)
const menuActions = computed(() => [{ key: 'pets', name: t('user.petList.title') }])
function onMenuSelect(action: { key?: string } | undefined) {
  showMenu.value = false
  if (action?.key === 'pets') router.push('/user/pets')
}
</script>

<template>
  <div class="home-page">
    <!-- 无宠物引导 -->
    <van-empty v-if="!loading && !pets.length" :description="t('user.home.empty')">
      <van-button round type="primary" @click="router.push('/user/pets')">
        {{ t('user.home.goBind') }}
      </van-button>
    </van-empty>

    <template v-else>
      <van-skeleton v-if="loading" title :row="5" class="mt-16" />

      <template v-else>
        <!-- 顶部：标题 + 汉堡菜单 -->
        <header class="home-header">
          <h1 class="home-title">{{ t('user.home.myPets') }}</h1>
          <button class="home-menu" type="button" aria-label="menu" @click="showMenu = true">
            <svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true">
              <g stroke="#2b2b2b" stroke-width="3.5" stroke-linecap="round">
                <line x1="8" y1="12" x2="40" y2="12" />
                <line x1="8" y1="24" x2="40" y2="24" />
                <line x1="8" y1="36" x2="40" y2="36" />
              </g>
            </svg>
          </button>
        </header>

        <!-- 宠物头像栏 -->
        <div class="avatar-rail">
          <div
            v-for="(p, i) in pets"
            :key="p.id"
            class="avatar-item"
            :class="{ 'avatar-item--active': i === activeIndex }"
            @click="selectPet(i)"
          >
            <div class="avatar-ring">
              <img :src="petAvatarSrc(p.name) || p.avatar" :alt="p.name" />
            </div>
            <span class="avatar-name">{{ p.name }}</span>
          </div>
          <div v-if="pets.length < 3" class="avatar-item" @click="router.push('/user/pets/add')">
            <div class="avatar-ring avatar-ring--add">
              <span class="avatar-plus">+</span>
            </div>
            <span class="avatar-name">{{ t('user.petList.add') }}</span>
          </div>
        </div>

        <!-- 核心宠物信息大卡片：点击查看宠物详情 -->
        <section v-if="activePet" class="hero-card" @click="goPetDetail">
          <span class="hero-more">
            {{ t('nav.petProfile') }}
            <van-icon name="arrow" size="12" />
          </span>
          <div class="hero-main">
            <div class="hero-info">
              <div class="hero-name">
                {{ SPECIES_ICON[activePet.species] }} {{ activePet.name }}
                <span class="hero-gender">{{ activePet.gender === 'male' ? '♂' : '♀' }}</span>
              </div>
              <div class="hero-age">{{ t('common.yearsOld', { n: ageOf(activePet.birthDate) }) }}</div>
              <span class="hero-tag">{{ activePet.breed }}</span>
            </div>

            <!-- 宠物头像图片：布丁/雪球用专属头像，其余回退到通用头像 -->
            <img class="hero-pet" :src="petAvatarSrc(activePet.name) || petAvatar" alt="" aria-hidden="true" />
          </div>

          <!-- 卡片内横向功能栏 -->
          <div class="hero-cells">
            <div class="hero-cell">
              <div class="cell-num">{{ activePet.weight }}<span class="cell-unit">kg</span></div>
              <div class="cell-label">{{ t('user.home.weight') }}</div>
            </div>
            
            <div class="hero-cell">
              <div class="cell-num">{{ BATH_COUNT }}</div>
              <div class="cell-label">{{ t('user.home.bath') }}</div>
            </div>
            <div class="hero-cell">
              <div class="cell-num">{{ dewormCount }}</div>
              <div class="cell-label">{{ t('user.home.deworm') }}</div>
            </div>
            <div class="hero-cell">
              <div class="cell-num">{{ vaccineCount }}</div>
              <div class="cell-label">{{ t('user.home.vaccine') }}</div>
            </div>
          </div>
        </section>

        <!-- 2×2 功能宫格 -->
        <div class="module-grid">
          <div class="module module--album" @click="router.push('/user/album')">
            <div class="module-title">{{ t('nav.album') }}</div>
            <div class="module-sub">{{ t('user.home.albumSub') }}</div>
          </div>

          

          <div class="module module--green" @click="router.push('/user/todo')">
            <div class="module-icon">
              <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
                <g stroke="#2f5d3a" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="8" y="8" width="24" height="32" rx="4" fill="#fff" />
                  <path d="M12 24 l4 4 l7 -8" stroke-width="2.5" />
                  <path d="M14 14 h12" stroke-width="2" />
                  <path d="M14 34 h8" stroke-width="2" />
                </g>
                <g stroke="#7a4e12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 42 L42 22 L46 26 L26 46 Z" fill="#f5a623" />
                  <path d="M25 45 L22 42 L21 47 Z" fill="#2f5d3a" />
                </g>
              </svg>
            </div>
            <div class="module-title">{{ t('nav.todo') }}</div>
            <div class="module-sub">{{ t('user.home.todoSub') }}</div>
          </div>
        </div>

        <!-- 底部功能导航按钮 -->
        <div class="action-bar">
          <div class="action-item" @click="router.push('/user/consult')">
            <div class="action-icon">
              <svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true">
                <g stroke="#2b2b2b" stroke-width="3.5" stroke-linecap="round">
                  <path d="M24 10 V38 M10 24 H38" />
                </g>
              </svg>
            </div>
            <span class="action-label">{{ t('nav.consult') }}</span>
          </div>

          <div class="action-item" @click="router.push('/user/assistant')">
            <div class="action-icon">
              <svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true">
                <g fill="none" stroke="#2b2b2b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M24 7 C17 7 13 13 13 19 a10 10 0 0 0 5 8.6 V33 h12 v-5.4 A10 10 0 0 0 35 19 C35 13 31 7 24 7 Z" fill="#fff" />
                  <path d="M18 38 h12" stroke-width="3" />
                  <path d="M20 42 h8" stroke-width="2" />
                </g>
              </svg>
            </div>
            <span class="action-label">{{ t('user.home.aiAssistant') }}</span>
          </div>

          <div class="action-item" @click="router.push('/user/recipes')">
            <div class="action-icon">
              <svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true">
                <g fill="none" stroke="#2b2b2b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 34 V26 a7 7 0 0 1 9 -6.6 a8 8 0 0 1 16 0 a7 7 0 0 1 9 6.6 V34" />
                  <path d="M12 38 H36" />
                </g>
                <path
                  d="M24 25 c-3.2 -3.2 -6 -2 -6 0.5 c0 2.6 6 5 6 5 s6 -2.4 6 -5 c0 -2.5 -2.8 -3.7 -6 -0.5"
                  fill="#ff6b6b"
                />
              </svg>
            </div>
            <span class="action-label">{{ t('nav.recipes') }}</span>
          </div>

          <div class="action-item" @click="router.push('/user/translate')">
            <div class="action-icon">
              <svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true">
                <g fill="none" stroke="#2b2b2b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 26 Q14 12 24 12 Q34 12 34 26 V32 Q24 40 14 32 Z" fill="#fff" />
                  <path d="M15 14 L10 4 L20 10 Z" fill="#fff" />
                  <path d="M33 14 L38 4 L28 10 Z" fill="#fff" />
                  <circle cx="20" cy="24" r="2" fill="#2b2b2b" stroke="none" />
                  <circle cx="28" cy="24" r="2" fill="#2b2b2b" stroke="none" />
                  <path d="M23 29 L25 31 L21 31 Z" fill="#ffb300" stroke="none" />
                  <path d="M10 23 L3 21" />
                  <path d="M10 28 L3 29" />
                  <path d="M38 23 L45 21" />
                  <path d="M38 28 L45 29" />
                </g>
                <g fill="none" stroke="#2b2b2b" stroke-width="2.5" stroke-linecap="round">
                  <path d="M40 9 q5 5 0 10" />
                  <path d="M44 5 q8 9 0 18" />
                </g>
              </svg>
            </div>
            <span class="action-label">{{ t('nav.translate') }}</span>
          </div>

          <div class="action-item" @click="router.push('/user/selfcheck')">
            <div class="action-icon">
              <svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true">
                <g fill="#fff" stroke="#2b2b2b" stroke-width="2.5" stroke-linejoin="round">
                  <rect x="10" y="16" width="28" height="22" rx="4" />
                  <path d="M18 12 h12 v4 h-12 z" />
                  <path d="M24 21 v12 M18 27 h12" stroke-width="3" fill="none" />
                </g>
              </svg>
            </div>
            <span class="action-label">{{ t('nav.selfcheck') }}</span>
          </div>
        </div>
      </template>
    </template>

    <!-- 汉堡菜单 -->
    <van-action-sheet
      v-model:show="showMenu"
      :actions="menuActions"
      :cancel-text="t('common.cancel')"
      @select="onMenuSelect"
    />
  </div>
</template>

<style scoped lang="scss">
/* 暖黄治愈系卡通风格：浅米白底、扁平圆角、无阴影 */
.home-page {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
  padding: 42px 14px 70px;
  background: #fbf3e3;
}

/* ---- 顶部 ---- */
.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 16px;

  .home-title {
    margin: 0;
    font-size: 24px;
    font-weight: 800;
    color: #2b2b2b;
  }

  .home-menu {
    width: 38px;
    height: 38px;
    border: none;
    border-radius: 50%;
    background: #fff6df;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
}

/* ---- 宠物头像栏 ---- */
.avatar-rail {
  display: flex;
  gap: 22px;
  padding: 2px 4px 18px;
  overflow-x: auto;
}

.avatar-item {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;

  .avatar-ring {
    width: 58px;
    height: 58px;
    border-radius: 50%;
    padding: 4px;
    box-sizing: border-box;
    background: #ffd54a;
    border: 3px solid #ffd54a;

    img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }
  }

  .avatar-name {
    font-size: 11px;
    color: #8a7a5a;
    max-width: 62px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &--active {
    .avatar-ring {
      border-color: #f08c00;
    }
    .avatar-name {
      color: #2b2b2b;
      font-weight: 700;
    }
  }
}

.avatar-ring--add {
  background: #fff6df !important;
  border-color: #fff6df !important;

  .avatar-plus {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #ffe9a8;
    color: #7a6a52;
    font-size: 24px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

/* ---- 亮黄大卡片 ---- */
.hero-card {
  position: relative;
  background: #ffd54a;
  border-radius: 22px;
  padding: 16px 14px 12px;
  cursor: pointer;
}

/* 右上角「宠物档案」入口提示 */
.hero-more {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
  font-weight: 600;
  color: #7a5a12;
  background: rgba(255, 255, 255, 0.65);
  border-radius: 999px;
  padding: 3px 9px;
}

.hero-main {
  position: relative;
  display: flex;
  align-items: flex-end;
  min-height: 118px;
}

.hero-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .hero-name {
    font-size: 20px;
    font-weight: 800;
    color: #2b2b2b;
  }

  .hero-gender {
    font-size: 13px;
    color: #f08c00;
  }

  .hero-age {
    font-size: 14px;
    font-weight: 700;
    color: #2b2b2b;
  }

  .hero-tag {
    align-self: flex-start;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    background: #2b2b2b;
    border-radius: 8px;
    padding: 3px 10px;
  }
}

/* 宠物头像：图片替换原柴犬插画 */
.hero-pet {
  flex-shrink: 0;
  width: 118px;
  height: 110px;
  object-fit: contain;
  pointer-events: none;
  border-radius: 16px;
}

/* ---- 卡片内横向功能栏 ---- */
.hero-cells {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: center;
  margin-top: 12px;
  background: rgba(255, 255, 255, 0.55);
  border-radius: 16px;
  padding: 10px 4px;
}

.hero-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;

  .cell-num {
    font-size: 17px;
    font-weight: 800;
    color: #2b2b2b;
  }

  .cell-unit {
    font-size: 11px;
    font-weight: 700;
    margin-left: 1px;
  }

  .cell-label {
    font-size: 11px;
    color: #7a5a12;
  }
}

/* ---- 2×2 功能宫格 ---- */
.module-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 14px;
}

.module {
  position: relative;
  border-radius: 18px;
  padding: 14px;
  min-height: 118px;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 4px;

  .module-title {
    font-size: 15px;
    font-weight: 800;
  }

  .module-sub {
    font-size: 11px;
  }

  .module-icon {
    position: absolute;
    top: 12px;
    right: 12px;
  }
}

.module--album {
  background-image: url('@/asset/image/宠物相册.png');
  background-size: cover;
  background-position: center;
  color: #fff;

  .module-title {
    color: #fff;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
  }

  .module-sub {
    color: #fff;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
  }
}

.module--yellow {
  background: #ffe9a8;
  color: #5a3e0e;

  .module-sub {
    color: #8a6a2a;
  }
}

.module--green {
  background: #dff2dd;
  color: #2f5d3a;

  .module-sub {
    color: #5a8a5a;
  }
}

.module--empty {
  background: #f7edd6;
  cursor: default;
}

/* ---- 底部 4 个圆形功能按钮 ---- */
.action-bar {
  display: flex;
  justify-content: space-around;
  margin-top: 22px;
  padding: 0 4px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;

  .action-icon {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #ffd54a;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .action-label {
    font-size: 12px;
    font-weight: 600;
    color: #2b2b2b;
  }
}

.mt-16 {
  margin-top: 16px;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getMyPetsApi, type PetJoined } from '@/api/modules/pet'
import {
  getDoctorsApi,
  getMyConsultationsApi,
  pushConsultationApi,
  type ConsultationMine,
} from '@/api/modules/consultation'
import { formatDateTime } from '@/utils/format'
import { petAvatarSrc } from '@/utils/petAvatar'
import type { DoctorBrief } from '@/types'

const router = useRouter()
const { t } = useI18n()

/* ---------- 医生列表 ---------- */
const doctors = ref<DoctorBrief[]>([])
const loading = ref(false)
const keyword = ref('')
const activeDept = ref('')

/** 科室模块：浅底色方块 + 圆形实拍图（emoji 占位）+ 科室名 */
const DEPARTMENTS = [
  { key: 'dental', labelKey: 'user.consult.dental', color: '#fff3c4', emoji: '🦷' },
  { key: 'eye', labelKey: 'user.consult.eye', color: '#e3f2dd', emoji: '🐱' },
  { key: 'internal', labelKey: 'user.consult.internal', color: '#e0ecf7', emoji: '👂' },
] as const
type DeptKey = (typeof DEPARTMENTS)[number]['key']

/** 由医生接诊方向推断所属科室（用于列表筛选与卡片展示） */
function deptKeyOf(d: DoctorBrief): DeptKey {
  const s = d.specialty
  if (/牙|口腔|齿/.test(s)) return 'dental'
  if (/眼/.test(s)) return 'eye'
  return 'internal'
}

const filteredDoctors = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return doctors.value.filter((d) => {
    const matchKw = !kw || d.name.toLowerCase().includes(kw) || d.hospital.toLowerCase().includes(kw)
    const matchDept = !activeDept.value || deptKeyOf(d) === activeDept.value
    return matchKw && matchDept
  })
})

function toggleDept(key: DeptKey) {
  activeDept.value = activeDept.value === key ? '' : key
}

async function loadDoctors() {
  loading.value = true
  try {
    doctors.value = await getDoctorsApi()
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}
loadDoctors()

/* ---------- 马上咨询：选择宠物并推送健康数据 ---------- */
const pets = ref<PetJoined[]>([])
const activeDoctor = ref<DoctorBrief | null>(null)
const selectedPet = ref('')
const petPickerVisible = ref(false)
const pushing = ref(false)

async function openPush(d: DoctorBrief) {
  activeDoctor.value = d
  if (!pets.value.length) {
    try {
      pets.value = await getMyPetsApi()
    } catch (e) {
      showToast((e as Error).message || t('common.loadFailed'))
      return
    }
  }
  if (!pets.value.length) {
    showToast(t('user.consult.noPet'))
    router.push('/user/pets')
    return
  }
  selectedPet.value = pets.value[0]?.id ?? ''
  petPickerVisible.value = true
}

async function doPush() {
  if (!activeDoctor.value || !selectedPet.value) return
  pushing.value = true
  try {
    await pushConsultationApi({ petId: selectedPet.value, doctorId: activeDoctor.value.id })
    showToast(t('user.profile.pushSuccess', { doctor: activeDoctor.value.name }))
    petPickerVisible.value = false
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  } finally {
    pushing.value = false
  }
}

/* ---------- 我的问诊记录（搜索栏右上角气泡） ---------- */
const consultsVisible = ref(false)
const consults = ref<ConsultationMine[]>([])
const consultsLoading = ref(false)

async function openMyConsults() {
  consultsVisible.value = true
  consultsLoading.value = true
  try {
    consults.value = await getMyConsultationsApi()
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    consultsLoading.value = false
  }
}
</script>

<template>
  <div class="consult-page">
    <!-- 顶部搜索栏：浅黄描边圆角输入框 + 右上角对话气泡 -->
    <div class="search-bar">
      <svg class="search-icon" viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
        <g fill="none" stroke="#f0a500" stroke-width="4" stroke-linecap="round">
          <circle cx="20" cy="20" r="12" />
          <line x1="29" y1="29" x2="40" y2="40" />
        </g>
      </svg>
      <input
        v-model="keyword"
        class="search-input"
        type="search"
        :placeholder="t('user.consult.searchPlaceholder')"
      />
      <button class="msg-btn" type="button" :aria-label="t('user.consult.myConsults')" @click="openMyConsults">
        <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
          <path
            d="M24 6 C14.2 6 7 13.2 7 21 a14 14 0 0 0 6.4 11.5 V41 a2 2 0 0 0 3.3 1.5 L20.8 39 a17 17 0 0 0 3.2 0 c9.8 0 17 -7.2 17 -18 C41 13.2 33.8 6 24 6 Z"
            fill="#2b2b2b"
          />
          <g fill="#fff">
            <circle cx="17" cy="21" r="2.6" />
            <circle cx="24" cy="21" r="2.6" />
            <circle cx="31" cy="21" r="2.6" />
          </g>
        </svg>
      </button>
    </div>

    <!-- 科室分类：横向滑动 -->
    <div class="dept-row">
      <div
        v-for="dept in DEPARTMENTS"
        :key="dept.key"
        class="dept-item"
        :class="{ 'is-active': activeDept === dept.key }"
        @click="toggleDept(dept.key)"
      >
        <div class="dept-block" :style="{ background: dept.color }">
          <span class="dept-photo">{{ dept.emoji }}</span>
        </div>
        <span class="dept-name">{{ t(dept.labelKey) }}</span>
      </div>
    </div>

    <!-- 医生推荐 -->
    <div class="doctor-section">
      <div class="section-title">{{ t('user.consult.doctorRec') }}</div>

      <van-skeleton v-if="loading" title :row="3" class="mt-12" />

      <template v-else-if="filteredDoctors.length">
        <div v-for="d in filteredDoctors" :key="d.id" class="doctor-card">
          <div class="doc-avatar">
            <img :src="d.avatar" :alt="d.name" />
            <span class="doc-badge">🩺</span>
          </div>
          <div class="doc-main">
            <div class="doc-name-row">
              <span class="doc-name">{{ d.name }}</span>
              <span class="doc-title">{{ d.title }}</span>
            </div>
            <div class="doc-info">{{ d.hospital }} · {{ t(`user.consult.${deptKeyOf(d)}`) }}</div>
            <div class="doc-foot">
              <span class="doc-price">¥{{ d.consultPrice }}</span>
              <button class="doc-btn" type="button" @click="openPush(d)">{{ t('user.consult.consultNow') }}</button>
            </div>
          </div>
        </div>
      </template>

      <van-empty v-else :description="t('user.consult.noResult')" />
    </div>

    <!-- 选择宠物并推送 -->
    <van-popup
      v-model:show="petPickerVisible"
      position="bottom"
      round
      safe-area-inset-bottom
      class="picker-popup"
    >
      <div class="popup-title">{{ t('user.consult.selectPet') }}</div>
      <div class="popup-list">
        <div
          v-for="p in pets"
          :key="p.id"
          class="popup-item"
          :class="{ active: selectedPet === p.id }"
          @click="selectedPet = p.id"
        >
          <van-image round width="40" height="40" :src="petAvatarSrc(p.name) || p.avatar" />
          <div class="popup-name">
            <div>{{ p.name }}</div>
            <div class="popup-sub">{{ p.breed }} · {{ p.weight }}kg</div>
          </div>
          <van-icon v-if="selectedPet === p.id" name="success" color="#ffb300" />
        </div>
      </div>
      <div class="popup-foot">
        <van-button
          round
          block
          color="#ffd54a"
          :loading="pushing"
          @click="doPush"
        >
          <span class="btn-text">{{ t('common.confirm') }}</span>
        </van-button>
      </div>
    </van-popup>

    <!-- 我的问诊记录 -->
    <van-popup
      v-model:show="consultsVisible"
      position="bottom"
      round
      safe-area-inset-bottom
      class="consults-popup"
    >
      <div class="popup-title">{{ t('user.consult.myConsults') }}</div>
      <van-skeleton v-if="consultsLoading" :row="4" class="mt-8" />
      <template v-else>
        <div v-for="c in consults" :key="c.id" class="cons-item">
          <van-image round width="36" height="36" :src="petAvatarSrc(c.pet?.name) || c.pet?.avatar || ''" />
          <div class="cons-main">
            <div class="cons-name">{{ c.pet?.name ?? '-' }}</div>
            <div class="cons-sub">{{ c.vetName ?? '-' }} · {{ formatDateTime(c.pushedAt) }}</div>
          </div>
          <van-tag round :type="c.status === 'active' ? 'primary' : 'default'">
            {{ c.status === 'active' ? t('user.consult.statusActive') : t('user.consult.statusClosed') }}
          </van-tag>
        </div>
        <van-empty v-if="!consults.length" :description="t('user.consult.noConsults')" />
      </template>
    </van-popup>
  </div>
</template>

<style scoped lang="scss">
/* 问诊首页：纯白背景、大圆角卡片、暖黄点缀（扁平无阴影） */
.consult-page {
  padding: 16px 14px 24px;
  background: #fff;
  min-height: 100%;
  box-sizing: border-box;
}

/* ---- 搜索栏 ---- */
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 2px solid #ffd54a;
  border-radius: 999px;
  background: #fffdf2;
  padding: 9px 6px 9px 14px;

  .search-icon {
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    color: #2b2b2b;

    &::placeholder {
      color: #b6ad98;
    }
  }

  .msg-btn {
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 50%;
    background: #fff6df;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
}

/* ---- 科室分类 ---- */
.dept-row {
  display: flex;
  gap: 16px;
  padding: 16px 4px 6px;
  overflow-x: auto;
}

.dept-item {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;

  .dept-block {
    width: 62px;
    height: 62px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid transparent;
  }

  .dept-photo {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
  }

  .dept-name {
    font-size: 13px;
    font-weight: 700;
    color: #2b2b2b;
  }

  &.is-active {
    .dept-block {
      border-color: #ffb300;
    }
  }
}

/* ---- 医生推荐 ---- */
.doctor-section {
  margin-top: 12px;

  .section-title {
    font-size: 17px;
    font-weight: 800;
    color: #2b2b2b;
    padding: 8px 2px 12px;
  }
}

.doctor-card {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid #f0ead9;
  background: #fff;
  margin-bottom: 12px;

  .doc-avatar {
    position: relative;
    flex-shrink: 0;
    width: 64px;
    height: 64px;
    border-radius: 14px;
    background: #fff3c4;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .doc-badge {
      position: absolute;
      right: 2px;
      bottom: 2px;
      font-size: 12px;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
    }
  }

  .doc-main {
    flex: 1;
    min-width: 0;
  }

  .doc-name-row {
    display: flex;
    align-items: center;
    gap: 8px;

    .doc-name {
      font-size: 16px;
      font-weight: 800;
      color: #2b2b2b;
    }

    .doc-title {
      font-size: 11px;
      color: #b08a4a;
      background: #fff6df;
      border-radius: 8px;
      padding: 2px 8px;
    }
  }

  .doc-info {
    margin-top: 5px;
    font-size: 12px;
    color: #8a7a5a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .doc-foot {
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .doc-price {
      font-size: 18px;
      font-weight: 800;
      color: #ff4d4f;
    }

    .doc-btn {
      border: none;
      border-radius: 999px;
      background: #ffd54a;
      color: #2b2b2b;
      font-size: 13px;
      font-weight: 700;
      padding: 7px 18px;
      cursor: pointer;
    }
  }
}

/* ---- 弹层通用 ---- */
.popup-title {
  font-size: 16px;
  font-weight: 700;
  color: #2b2b2b;
  margin-bottom: 8px;
}

.picker-popup {
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
  max-height: 70%;
  overflow-y: auto;
}

.popup-list {
  max-height: 46vh;
  overflow-y: auto;
}

.popup-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid #f0ead9;
  cursor: pointer;

  &.active {
    background: rgba(255, 213, 74, 0.08);
    border-radius: 12px;
  }

  .popup-name {
    flex: 1;
    min-width: 0;
    font-size: 15px;
    font-weight: 600;
    color: #2b2b2b;

    .popup-sub {
      margin-top: 2px;
      font-size: 12px;
      font-weight: 400;
      color: #8a7a5a;
    }
  }
}

.popup-foot {
  margin-top: 14px;
}

.btn-text {
  color: #2b2b2b;
  font-weight: 700;
}

.consults-popup {
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
  max-height: 70%;
  overflow-y: auto;
}

.cons-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 2px;
  border-bottom: 1px solid #f5f0e3;

  .cons-main {
    flex: 1;
    min-width: 0;
  }

  .cons-name {
    font-size: 15px;
    font-weight: 600;
    color: #2b2b2b;
  }

  .cons-sub {
    margin-top: 2px;
    font-size: 11px;
    color: #8a7a5a;
  }
}

.mt-12 {
  margin-top: 12px;
}

.mt-8 {
  margin-top: 8px;
}
</style>

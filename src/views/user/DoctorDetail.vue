<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getMyPetsApi, type PetJoined } from '@/api/modules/pet'
import { getDoctorDetailApi } from '@/api/modules/consultation'
import { relativeTime } from '@/utils/format'
import { petAvatarSrc } from '@/utils/petAvatar'
import type { VetInfo } from '@/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const doctorId = String(route.params.id ?? '')
const doctor = ref<VetInfo | null>(null)
const loading = ref(false)

function speciesLabel(s: 'dog' | 'cat'): string {
  return s === 'dog' ? t('species.dog') : t('species.cat')
}

async function load() {
  if (!doctorId) {
    router.replace('/user/consult/doctors')
    return
  }
  loading.value = true
  try {
    doctor.value = await getDoctorDetailApi(doctorId)
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
    router.replace('/user/consult/doctors')
  } finally {
    loading.value = false
  }
}
load()

/* ---------- 问医生：选择宠物后跳转咨询界面 ---------- */
const pets = ref<PetJoined[]>([])
const selectedPet = ref('')
const petPickerVisible = ref(false)

async function onAsk() {
  if (!doctor.value) return
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

function goCompose() {
  if (!doctor.value || !selectedPet.value) return
  petPickerVisible.value = false
  router.push({ path: '/user/consult/compose', query: { doctorId: doctor.value.id, petId: selectedPet.value } })
}
</script>

<template>
  <div class="doctor-detail-page">
    <van-skeleton v-if="loading" title :row="8" class="mt-16" />

    <template v-else-if="doctor">
      <!-- 基本信息 -->
      <section class="card head-card">
        <div class="head-top">
          <div class="doc-avatar">
            <img :src="doctor.avatar" :alt="doctor.name" />
          </div>
          <div class="head-main">
            <div class="head-name">
              <span class="doc-name">{{ doctor.name }}</span>
              <span class="doc-title">{{ doctor.title }}</span>
            </div>
            <div class="head-hospital">{{ doctor.hospital }}</div>
            <div class="head-meta">
              {{ t('user.consult.department') }}：{{ doctor.department }}
              <span class="meta-dot">·</span>
              {{ t('user.consult.licenseNo') }}：{{ doctor.certNo }}
            </div>
          </div>
        </div>

        <div class="tag-row">
          <span v-for="s in doctor.species" :key="s" class="tag">{{ speciesLabel(s) }}</span>
          <span v-for="h in doctor.honors" :key="h" class="tag">{{ h }}</span>
        </div>

        <div class="desc-block">
          <div class="desc-label">{{ t('user.consult.specialtyLabel') }}</div>
          <div class="desc-text">{{ doctor.specialtyDesc }}</div>
        </div>

        <div v-if="doctor.bio" class="desc-block">
          <div class="desc-label">{{ t('user.consult.bioLabel') }}</div>
          <div class="desc-text">{{ doctor.bio }}</div>
        </div>
      </section>

      <!-- 评分 / 频率 / 时间 -->
      <section class="card">
        <div class="section-title">{{ t('user.consult.scoreTitle') }}</div>
        <div class="stats-grid">
          <div class="stat-cell">
            <div class="stat-value stat-score">
              <van-icon name="star" size="16" color="#ff9500" />
              <em>{{ doctor.score.toFixed(1) }}</em>
            </div>
            <div class="stat-label">{{ t('user.consult.scoreLabel') }}</div>
          </div>
          <div class="stat-cell">
            <div class="stat-value">{{ doctor.rating }}<span class="stat-unit">%</span></div>
            <div class="stat-label">{{ t('user.consult.ratingLabel') }}</div>
          </div>
          <div class="stat-cell">
            <div class="stat-value">{{ doctor.consultCount }}</div>
            <div class="stat-label">{{ t('user.consult.consultCount') }}</div>
          </div>
          <div class="stat-cell">
            <div class="stat-value">{{ doctor.avgWaitTime }}<span class="stat-unit">{{ t('user.consult.minutes') }}</span></div>
            <div class="stat-label">{{ t('user.consult.avgWaitTime') }}</div>
          </div>
          <div class="stat-cell">
            <div class="stat-value">{{ doctor.monthlyAnswers }}</div>
            <div class="stat-label">{{ t('user.consult.monthlyAnswers') }}</div>
          </div>
          <div class="stat-cell">
            <div class="stat-value">{{ doctor.monthlyPrescriptions }}</div>
            <div class="stat-label">{{ t('user.consult.monthlyPrescriptions') }}</div>
          </div>
        </div>
      </section>

      <!-- 宠主评价 -->
      <section class="card">
        <div class="section-title">
          {{ t('user.consult.reviewsTitle') }}
          <span class="review-count">{{ doctor.reviews.length }}</span>
        </div>

        <template v-if="doctor.reviews.length">
          <div v-for="r in doctor.reviews" :key="r.id" class="review-item">
            <div class="review-head">
              <img class="review-avatar" :src="r.avatar" :alt="r.userName" />
              <div class="review-main">
                <div class="review-name">{{ r.userName }}</div>
                <div class="review-score">
                  <van-icon name="star" size="13" color="#ff9500" />
                  <em>{{ r.score.toFixed(1) }}</em>
                </div>
              </div>
              <span class="review-time">{{ relativeTime(r.createdAt) }}</span>
            </div>
            <div class="review-content">{{ r.content }}</div>
            <div v-if="r.tags.length" class="review-tags">
              <span v-for="tag in r.tags" :key="tag" class="rtag">{{ tag }}</span>
            </div>
          </div>
        </template>

        <div v-else class="review-empty">{{ t('user.consult.reviewEmpty') }}</div>
      </section>

      <!-- 底部：服务收费 + 问医生 -->
      <div class="ask-bar">
        <div class="ask-prices">
          <span class="price-item">{{ t('user.consult.textConsult') }}<b>¥{{ doctor.priceText }}</b></span>
          <span class="price-item">{{ t('user.consult.phoneConsult') }}<b>¥{{ doctor.pricePhone }}</b></span>
        </div>
        <button class="ask-btn" type="button" @click="onAsk">{{ t('user.consult.askDoctor') }}</button>
      </div>
    </template>

    <!-- 选择宠物 -->
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
        <van-button round block color="#ffd54a" @click="goCompose">
          <span class="btn-text">{{ t('common.confirm') }}</span>
        </van-button>
      </div>
    </van-popup>
  </div>
</template>

<style scoped lang="scss">
/* 医生详情：浅灰底 + 纯白无边框卡片（与推荐列表同风格） */
.doctor-detail-page {
  padding: 14px 14px calc(80px + env(safe-area-inset-bottom));
  background: #f5f6f8;
  min-height: 100%;
  box-sizing: border-box;
}

.card {
  padding: 16px 14px;
  border-radius: 16px;
  background: #fff;
  margin-bottom: 12px;
  box-shadow: 0 2px 10px rgba(17, 24, 39, 0.04);
}

.section-title {
  font-size: 15px;
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 12px;

  .review-count {
    display: inline-block;
    margin-left: 4px;
    font-size: 12px;
    font-weight: 700;
    color: #ff9500;
    background: #fff4e0;
    border-radius: 999px;
    padding: 1px 8px;
    vertical-align: 2px;
  }
}

/* ---- 基本信息 ---- */
.head-card {
  .head-top {
    display: flex;
    gap: 12px;
  }

  .doc-avatar {
    flex-shrink: 0;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #f2f3f5;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  .head-main {
    flex: 1;
    min-width: 0;
  }

  .head-name {
    display: flex;
    align-items: baseline;
    gap: 8px;

    .doc-name {
      font-size: 20px;
      font-weight: 800;
      color: #1a1a1a;
    }

    .doc-title {
      font-size: 13px;
      font-weight: 400;
      color: #8a8a8f;
    }
  }

  .head-hospital {
    margin-top: 3px;
    font-size: 13px;
    font-weight: 500;
    color: #4b5563;
  }

  .head-meta {
    margin-top: 4px;
    font-size: 12px;
    color: #9aa0a6;
    line-height: 1.5;

    .meta-dot {
      margin: 0 6px;
      color: #d0d3d8;
    }
  }

  .tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 14px;

    .tag {
      font-size: 11px;
      color: #6b7280;
      background: #f2f3f5;
      border-radius: 6px;
      padding: 3px 10px;
      line-height: 1.4;
    }
  }

  .desc-block {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid #f0f1f3;

    .desc-label {
      font-size: 13px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 6px;
    }

    .desc-text {
      font-size: 13px;
      color: #6b7280;
      line-height: 1.7;
    }
  }
}

/* ---- 评分 / 频率 / 时间 ---- */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;

  .stat-cell {
    padding: 12px 6px;
    border-radius: 12px;
    background: #fafafb;
    text-align: center;

    .stat-value {
      font-size: 18px;
      font-weight: 800;
      color: #1a1a1a;
      white-space: nowrap;

      .stat-unit {
        margin-left: 2px;
        font-size: 11px;
        font-weight: 400;
        color: #b0b4ba;
      }
    }

    .stat-score {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      color: #ff9500;

      em {
        font-style: normal;
        font-weight: 800;
      }
    }

    .stat-label {
      margin-top: 4px;
      font-size: 11px;
      color: #8a8a8f;
    }
  }
}

/* ---- 宠主评价 ---- */
.review-item {
  padding: 14px 0;
  border-top: 1px solid #f0f1f3;

  &:first-of-type {
    border-top: none;
    padding-top: 0;
  }

  .review-head {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .review-avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #f2f3f5;
    object-fit: cover;
  }

  .review-main {
    flex: 1;
    min-width: 0;
  }

  .review-name {
    font-size: 13px;
    font-weight: 700;
    color: #2b2b2b;
  }

  .review-score {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    margin-top: 2px;
    font-size: 12px;
    color: #ff9500;

    em {
      font-style: normal;
      font-weight: 700;
    }
  }

  .review-time {
    flex-shrink: 0;
    font-size: 11px;
    color: #b0b4ba;
  }

  .review-content {
    margin-top: 8px;
    font-size: 13px;
    line-height: 1.7;
    color: #4b5563;
    word-break: break-word;
  }

  .review-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;

    .rtag {
      font-size: 11px;
      color: #ff9500;
      background: #fff4e0;
      border-radius: 6px;
      padding: 2px 8px;
      line-height: 1.4;
    }
  }
}

.review-empty {
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: #b0b4ba;
}

/* ---- 底部悬浮：收费 + 问医生 ---- */
.ask-bar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 100%;
  max-width: 480px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #f0f1f3;
  box-sizing: border-box;

  .ask-prices {
    display: flex;
    gap: 16px;

    .price-item {
      font-size: 12px;
      color: #8a8a8f;

      b {
        font-weight: 700;
        color: #1a1a1a;
        margin-left: 2px;
      }
    }
  }

  .ask-btn {
    border: none;
    border-radius: 999px;
    background: #ffd54a;
    color: #2b2b2b;
    font-size: 15px;
    font-weight: 700;
    padding: 10px 28px;
    cursor: pointer;
  }
}

/* ---- 选择宠物弹层 ---- */
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

.mt-16 {
  margin-top: 16px;
}
</style>

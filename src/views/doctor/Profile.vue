<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { getDoctorMeApi } from '@/api/modules/consultation'
import { SPECIES_LABEL } from '@/utils/consts'
import type { VetInfo } from '@/types'
import personalAvatar from '@/asset/image/个人头像.png'

const { t } = useI18n()
const auth = useAuthStore()

const vet = ref<VetInfo | null>(null)

const displayName = computed(() => vet.value?.name ?? auth.user?.name ?? t('role.doctor'))
const displayAvatar = computed(() => vet.value?.avatar ?? auth.user?.avatar ?? personalAvatar)

/** 机构 + 科室 + 职称 */
const orgLine = computed(() => {
  if (!vet.value) return ''
  return [vet.value.hospital, vet.value.department, vet.value.title].filter(Boolean).join(' · ')
})

const STATS = computed(() => [
  { labelKey: 'doctor.profile.rating', value: `${vet.value?.rating ?? 0}%` },
  { labelKey: 'doctor.profile.consultCount', value: vet.value?.consultCount ?? 0 },
  { labelKey: 'doctor.profile.monthlyAnswers', value: vet.value?.monthlyAnswers ?? 0 },
  { labelKey: 'doctor.profile.monthlyPrescriptions', value: vet.value?.monthlyPrescriptions ?? 0 },
  { labelKey: 'doctor.profile.avgWaitTime', value: `${vet.value?.avgWaitTime ?? 0}${t('doctor.profile.minute')}` },
])

const speciesLabels = computed(() => (vet.value?.species ?? []).map((s) => t(SPECIES_LABEL[s])))

async function load() {
  try {
    vet.value = await getDoctorMeApi()
  } catch {
    // 忽略档案加载失败，回退到登录态基本信息
  }
}
load()
</script>

<template>
  <div class="profile">
    <!-- 头部卡片 -->
    <header class="profile-head">
      <div class="profile-top">
        <van-image round width="72" height="72" :src="displayAvatar" class="profile-avatar" />
        <div class="profile-user">
          <div class="profile-name">{{ displayName }}</div>
          <div v-if="orgLine" class="profile-org">{{ orgLine }}</div>
          <div v-if="vet?.specialty" class="profile-specialty">{{ t('doctor.profile.specialty') }}：{{ vet.specialty }}</div>
        </div>
      </div>
      <div v-if="speciesLabels.length" class="profile-species">
        <van-tag v-for="s in speciesLabels" :key="s" round plain color="#00b4a6">{{ s }}</van-tag>
      </div>
    </header>

    <!-- 数据统计 -->
    <section class="profile-stats">
      <div v-for="s in STATS" :key="s.labelKey" class="stat">
        <div class="stat-num">{{ s.value }}</div>
        <div class="stat-label">{{ t(s.labelKey) }}</div>
      </div>
    </section>

    <!-- 详细信息 -->
    <div class="profile-menu">
      <div v-if="vet?.bio" class="info-block">
        <div class="info-title">{{ t('doctor.profile.bio') }}</div>
        <div class="info-body">{{ vet.bio }}</div>
      </div>

      <div v-if="vet?.specialtyDesc" class="info-block">
        <div class="info-title">{{ t('doctor.profile.specialtyDesc') }}</div>
        <div class="info-body">{{ vet.specialtyDesc }}</div>
      </div>

      <div v-if="vet?.honors?.length" class="info-block">
        <div class="info-title">{{ t('doctor.profile.honors') }}</div>
        <div class="info-tags">
          <van-tag v-for="h in vet.honors" :key="h" round color="#e0f5f2" text-color="#00b4a6">{{ h }}</van-tag>
        </div>
      </div>

      <div v-if="vet?.certNo" class="info-block">
        <div class="info-title">{{ t('doctor.profile.certNo') }}</div>
        <div class="info-body">{{ vet.certNo }}</div>
      </div>

      <div v-if="vet?.priceText || vet?.pricePhone" class="info-block">
        <div class="info-title">{{ t('doctor.profile.consultPrice') }}</div>
        <div class="info-body">
          <span v-if="vet.priceText">{{ t('doctor.profile.priceText') }}：¥{{ vet.priceText }}</span>
          <span v-if="vet.pricePhone" class="info-price-gap">{{ t('doctor.profile.pricePhone') }}：¥{{ vet.pricePhone }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.profile {
  min-height: 100%;
  box-sizing: border-box;
  padding-bottom: 32px;
  background: #eef7f6;
}

.profile-head {
  background: linear-gradient(165deg, #d6f5f1 0%, #7fdcd4 55%, #3ec6bb 100%);
  border-radius: 0 0 28px 28px;
  padding: 30px 18px 52px;
}

.profile-top {
  display: flex;
  align-items: center;
  gap: 15px;

  .profile-avatar {
    flex-shrink: 0;
    border: 3px solid #fff;
    background: #e8f5e9;
  }

  .profile-user {
    flex: 1;
    min-width: 0;

    .profile-name {
      font-size: 21px;
      font-weight: 800;
      color: #14403c;
    }

    .profile-org {
      margin-top: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #1d6a63;
    }

    .profile-specialty {
      margin-top: 3px;
      font-size: 12px;
      color: #2c7c75;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.profile-species {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.profile-stats {
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
      border-left: 1px solid #e6f2f0;
    }
  }

  .stat-num {
    font-size: 18px;
    font-weight: 800;
    color: #14403c;
  }

  .stat-label {
    margin-top: 4px;
    font-size: 11px;
    color: #5e8580;
  }
}

.profile-menu {
  background: #fff;
  border-radius: 20px;
  margin: 14px 14px 0;
  padding: 4px 16px 8px;
  overflow: hidden;
}

.info-block {
  padding: 14px 0;
  border-bottom: 1px solid #f0f6f5;

  &:last-child {
    border-bottom: none;
  }
}

.info-title {
  font-size: 13px;
  font-weight: 700;
  color: #5e8580;
  margin-bottom: 8px;
}

.info-body {
  font-size: 14px;
  line-height: 1.8;
  color: #1f2d3d;
  word-break: break-word;
}

.info-price-gap {
  margin-left: 16px;
}

.info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>

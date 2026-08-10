<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getMyPetsApi, type PetJoined } from '@/api/modules/pet'
import { getHealthSummaryApi, type HealthSummary } from '@/api/modules/health'
import { SPECIES_ICON, DEVICE_STATUS, toVantTagType } from '@/utils/consts'
import { relativeTime } from '@/utils/format'

const router = useRouter()
const { t } = useI18n()

const pets = ref<PetJoined[]>([])
const activePet = ref<PetJoined | null>(null)
const summary = ref<HealthSummary | null>(null)
const loading = ref(false)
const activeIndex = ref(0)

async function loadPets() {
  loading.value = true
  try {
    pets.value = await getMyPetsApi()
    if (pets.value.length) {
      activePet.value = pets.value[0]
      await loadSummary()
    }
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function loadSummary() {
  if (!activePet.value) return
  summary.value = await getHealthSummaryApi(activePet.value.id)
}

function onPetChange(index: number) {
  activePet.value = pets.value[index] ?? null
  summary.value = null
  if (activePet.value) loadSummary().catch((e) => showToast((e as Error).message))
}

const quickActions = computed(() => [
  { title: t('nav.healthReport'), desc: t('nav.aiAnalysis'), icon: '📋', path: '/user/reports' },
  { title: t('nav.realtimeLoc'), desc: t('user.home.quickFence'), icon: '📍', path: '/user/location' },
  { title: t('user.home.dataSync'), desc: t('user.home.quickUpload'), icon: '🔄', path: '/user/sync' },
  { title: t('user.home.voiceAssistant'), desc: t('user.home.quickVoice'), icon: '🎤', path: '/user/assistant' },
  { title: t('nav.deviceManage'), desc: t('user.home.quickDevice'), icon: '📟', path: '/user/devices' },
  { title: t('nav.subscription'), desc: t('user.home.quickRenew'), icon: '💳', path: '/user/subscription' },
])

loadPets()
</script>

<template>
  <div class="home">
    <!-- 无宠物引导 -->
    <van-empty v-if="!loading && !pets.length" :description="t('user.home.empty')">
      <van-button round type="primary" @click="router.push('/user/pets')">
        {{ t('user.home.goBind') }}
      </van-button>
    </van-empty>

    <template v-else>
      <van-skeleton :loading="loading" title :row="5" class="mt-16" />

      <!-- 宠物切换 -->
      <van-tabs v-if="pets.length > 1" v-model:active="activeIndex" color="#ff6b00" class="pet-tabs" @change="onPetChange">
        <van-tab v-for="p in pets" :key="p.id" :title="p.name" />
      </van-tabs>

      <div v-if="activePet" class="hero sp-card">
        <div class="hero-top">
          <img class="pet-avatar" :src="activePet.avatar" :alt="activePet.name" />
          <div class="pet-meta">
            <div class="pet-name">
              {{ SPECIES_ICON[activePet.species] }} {{ activePet.name }}
              <span class="pet-gender">{{ activePet.gender === 'male' ? '♂' : '♀' }}</span>
            </div>
            <div class="pet-breed">
              {{ activePet.breed }} · {{ activePet.weight }}{{ t('user.profile.weightUnit') }}
              <van-tag
                v-if="activePet.device"
                round
                :type="toVantTagType(DEVICE_STATUS[activePet.device.status].tag)"
                class="ml-8"
              >
                {{ t(DEVICE_STATUS[activePet.device.status].labelKey) }}
              </van-tag>
              <van-tag v-else round type="warning">{{ t('user.profile.noDevice') }}</van-tag>
            </div>
          </div>
          <van-button size="mini" round plain type="primary" @click="router.push(`/user/pet/${activePet.id}`)">
            {{ t('user.home.profile') }}
          </van-button>
        </div>

        <div class="hero-body" v-if="summary">
          <div class="activity-ring" :style="{ background: `conic-gradient(var(--sp-primary) ${summary.activity.percent * 3.6}deg, #eef1f5 0deg)` }">
            <div class="ring-inner">
              <div class="ring-value">{{ summary.activity.percent }}%</div>
              <div class="ring-label">{{ t('user.home.todayActivity') }}</div>
            </div>
          </div>
          <div class="vitals">
            <div class="vital">
              <div class="vital-value">{{ summary.temperature.latest }}°</div>
              <div class="vital-label">{{ t('user.health.temperature') }} <span class="unit">{{ t('user.health.degreeC') }}</span></div>
            </div>
            <div class="vital">
              <div class="vital-value">{{ summary.heartRate.latest }}</div>
              <div class="vital-label">{{ t('user.health.heartRate') }} <span class="unit">bpm</span></div>
            </div>
            <div class="vital">
              <div class="vital-value">{{ summary.spo2.latest }}</div>
              <div class="vital-label">{{ t('user.health.spo2') }} <span class="unit">{{ t('user.health.percent') }}</span></div>
            </div>
            <div class="vital">
              <div class="vital-value">{{ summary.respiratoryRate.latest }}</div>
              <div class="vital-label">{{ t('user.health.respiratory') }} <span class="unit">{{ t('user.health.bpm') }}</span></div>
            </div>
          </div>
        </div>

        <div v-if="activePet.device" class="hero-foot">
          <span class="foot-text">{{ t('user.home.lastSync') }}: {{ relativeTime(activePet.device.lastSyncAt) }} · {{ t('user.sync.battery', { n: activePet.device.battery }) }}</span>
          <van-button size="mini" round plain type="primary" icon="location-o" @click="router.push('/user/location')">
            {{ t('user.home.viewLocation') }}
          </van-button>
        </div>
      </div>

      <!-- 快捷入口 -->
      <div class="quick-grid mt-16">
        <div v-for="q in quickActions" :key="q.path" class="quick-item sp-card" @click="router.push(q.path)">
          <div class="quick-icon">{{ q.icon }}</div>
          <div class="quick-title">{{ q.title }}</div>
          <div class="quick-desc">{{ q.desc }}</div>
        </div>
      </div>

      <!-- 今日健康概览 -->
      <div v-if="summary" class="section sp-card mt-16">
        <div class="section-head">
          <span class="section-title">{{ t('user.home.healthOverview') }}</span>
          <span class="section-more" @click="router.push('/user/health')">{{ t('common.more') }} →</span>
        </div>
        <van-progress :percentage="summary.activity.percent" color="#ff6b00" stroke-width="10" track-color="#eef1f5" />
        <div class="progress-label">
          <span>{{ t('user.home.activitySteps', { n: summary.activity.steps.toLocaleString() }) }}</span>
          <span>{{ t('user.home.activityGoal', { n: 8000 }) }}</span>
        </div>
        <van-cell-group :border="false" inset>
          <van-cell :title="t('user.home.avgHr')" :value="t('user.home.bpm', { n: summary.heartRate.avg })" />
          <van-cell :title="t('user.home.sleepHours')" :value="t('user.home.hours', { n: summary.sleep.hours })" />
          <van-cell :title="t('user.health.respiratory')" :value="t('user.home.bpm', { n: summary.respiratoryRate.avg })" />
          <van-cell :title="t('user.home.overall')" :value="t('user.home.good')" value-class="text-success" />
        </van-cell-group>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.home {
  padding: 16px 14px;
  padding-top: 0;
}
.pet-tabs {
  margin-bottom: 12px;
  background: transparent;
  :deep(.van-tabs__wrap) {
    background: #fff;
    border-radius: 12px;
  }
}
.hero {
  padding: 16px;
}
.hero-top {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pet-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid var(--sp-primary-light);
  object-fit: cover;
  background: #eef1f5;
}
.pet-meta {
  flex: 1;
  .pet-name {
    font-size: 18px;
    font-weight: 700;
  }
  .pet-gender {
    font-size: 13px;
    color: var(--sp-primary);
  }
  .pet-breed {
    margin-top: 4px;
    font-size: 13px;
    color: var(--sp-text-secondary);
  }
}
.hero-body {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 16px;
}
.activity-ring {
  width: 104px;
  height: 104px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  .ring-inner {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    .ring-value {
      font-size: 20px;
      font-weight: 800;
      color: var(--sp-primary-dark);
    }
    .ring-label {
      font-size: 11px;
      color: var(--sp-text-secondary);
    }
  }
}
.vitals {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 8px;
  .vital-value {
    font-size: 20px;
    font-weight: 700;
  }
  .vital-label {
    font-size: 12px;
    color: var(--sp-text-secondary);
    .unit {
      font-size: 10px;
    }
  }
}
.hero-foot {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--sp-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  .foot-text {
    font-size: 12px;
    color: var(--sp-text-secondary);
  }
}
.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  .quick-item {
    padding: 14px;
    cursor: pointer;
    .quick-icon {
      font-size: 24px;
    }
    .quick-title {
      margin-top: 8px;
      font-weight: 600;
      font-size: 14px;
    }
    .quick-desc {
      margin-top: 2px;
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
  }
}
.section {
  padding: 16px;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  .section-title {
    font-size: 15px;
    font-weight: 700;
  }
  .section-more {
    font-size: 12px;
    color: var(--sp-primary);
  }
}
.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--sp-text-secondary);
  margin: 8px 0 12px;
}
.ml-8 {
  margin-left: 8px;
}
</style>

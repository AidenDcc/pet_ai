<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getDoctorPatientsApi, getPetDetailApi, type PatientRow, type PetDetail } from '@/api/modules/pet'
import { getDoctorConsultationsApi, type ConsultationJoined } from '@/api/modules/consultation'
import { SPECIES_ICON, GENDER_LABEL, DEVICE_STATUS, toVantTagType } from '@/utils/consts'
import { ageOf, formatDateTime } from '@/utils/format'

const router = useRouter()
const { t } = useI18n()

const tab = ref(0)

/* ---------- 全部患者（列表分页） ---------- */
const list = ref<PatientRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const keyword = ref('')
const loading = ref(false)
const finished = ref(false)

const popupVisible = ref(false)
const detail = ref<PetDetail | null>(null)
const detailLoading = ref(false)

/* ---------- 问诊宠物 ---------- */
const consults = ref<ConsultationJoined[]>([])
const consultLoading = ref(false)

async function onLoad() {
  if (finished.value) return
  loading.value = true
  try {
    const res = await getDoctorPatientsApi({ page: page.value, pageSize: pageSize.value, keyword: keyword.value })
    list.value = page.value === 1 ? res.list : [...list.value, ...res.list]
    total.value = res.total
    finished.value = list.value.length >= res.total
    page.value += 1
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

function onSearch() {
  page.value = 1
  finished.value = false
  list.value = []
  onLoad()
}

async function onTabChange(index: number) {
  tab.value = index
  if (index === 1 && !consults.value.length) await loadConsults()
}

async function loadConsults() {
  consultLoading.value = true
  try {
    consults.value = await getDoctorConsultationsApi()
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    consultLoading.value = false
  }
}

async function openDetail(row: PatientRow) {
  popupVisible.value = true
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await getPetDetailApi(row.id)
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    detailLoading.value = false
  }
}
</script>

<template>
  <div class="patients">
    <van-tabs v-model:active="tab" color="#00b4a6" class="top-tabs" @change="onTabChange">
      <!-- 全部患者 -->
      <van-tab :title="t('doctor.patients.all')">
        <van-search v-model="keyword" :placeholder="t('doctor.patients.searchPlaceholder')" @search="onSearch" @clear="onSearch" />
        <div class="count-line">{{ t('doctor.patients.total', { n: total }) }}</div>

        <van-list
          v-model:loading="loading"
          :finished="finished"
          :finished-text="list.length ? t('common.noMore') : ''"
          @load="onLoad"
        >
          <div v-for="p in list" :key="p.id" class="patient-card sp-card" @click="openDetail(p)">
            <van-image round width="44" height="44" :src="p.avatar" />
            <div class="patient-main">
              <div class="patient-name">
                {{ SPECIES_ICON[p.species] }} {{ p.name }}
                <van-tag round :type="toVantTagType(DEVICE_STATUS[p.device?.status ?? 'offline'].tag)">
                  {{ t(DEVICE_STATUS[p.device?.status ?? 'offline'].labelKey) }}
                </van-tag>
              </div>
              <div class="patient-sub">
                {{ p.breed }} · {{ t(GENDER_LABEL[p.gender]) }} · {{ t('common.yearsOld', { n: ageOf(p.birthDate) }) }} · {{ p.weight }} kg
              </div>
              <div class="patient-chip">
                {{ t('doctor.patients.chip') }} {{ p.microchip }} · {{ t('doctor.patients.owner') }} {{ p.ownerName }}
              </div>
            </div>
            <van-icon name="arrow" color="#c0c4cc" />
          </div>
        </van-list>

        <van-empty v-if="!loading && finished && !list.length" :description="t('common.empty')" />
      </van-tab>

      <!-- 问诊宠物 -->
      <van-tab :title="t('doctor.patients.consultations')">
        <van-skeleton :loading="consultLoading" :row="5" class="mt-8" />

        <div v-for="c in consults" :key="c.id" class="consult-card sp-card" @click="router.push(`/doctor/pet/${c.petId}`)">
          <div class="consult-head">
            <van-image round width="44" height="44" :src="c.pet.avatar" />
            <div class="consult-main">
              <div class="consult-name">
                {{ SPECIES_ICON[c.pet.species] }} {{ c.pet.name }}
                <van-tag round type="primary" class="ml-8">{{ t('doctor.patients.consultations') }}</van-tag>
              </div>
              <div class="consult-sub">
                {{ c.pet.breed }} · {{ t(GENDER_LABEL[c.pet.gender]) }} · {{ t('common.yearsOld', { n: ageOf(c.pet.birthDate) }) }}
              </div>
              <div class="consult-owner">
                {{ t('doctor.patients.owner') }}：{{ c.owner?.name ?? '-' }} · {{ c.owner?.phone ?? '-' }}
              </div>
            </div>
            <van-icon name="arrow" color="#c0c4cc" />
          </div>

          <div v-if="c.note" class="consult-note">
            <span class="note-label">{{ t('doctor.patients.consultationNote') }}</span>
            {{ c.note }}
          </div>

          <div v-if="c.latest" class="consult-vitals">
            <span>🌡️ {{ c.latest.temperature.toFixed(1) }}°C</span>
            <span>❤️ {{ c.latest.heartRate }}</span>
            <span>🫁 {{ c.latest.spo2 }}%</span>
          </div>

          <div class="consult-foot">
            <span class="consult-time">{{ t('doctor.patients.pushedAt', { time: formatDateTime(c.pushedAt) }) }}</span>
            <van-button size="mini" round plain type="primary">{{ t('doctor.patients.viewHealth') }}</van-button>
          </div>
        </div>

        <van-empty v-if="!consultLoading && !consults.length" :description="t('doctor.patients.noConsult')" />
      </van-tab>
    </van-tabs>

    <!-- 患者档案弹层 -->
    <van-popup
      v-model:show="popupVisible"
      position="bottom"
      round
      closeable
      safe-area-inset-bottom
      class="patient-detail"
    >
      <van-skeleton :loading="detailLoading" :row="6" />
      <template v-if="detail">
        <div class="drawer-head">
          <van-image round width="56" height="56" :src="detail.avatar" />
          <div>
            <div class="fs-18 fw-700">{{ SPECIES_ICON[detail.species] }} {{ detail.name }}</div>
            <div class="text-secondary fs-12">
              {{ detail.breed }} · {{ t(GENDER_LABEL[detail.gender]) }} · {{ t('common.yearsOld', { n: ageOf(detail.birthDate) }) }}
            </div>
          </div>
        </div>

        <div class="block-title">{{ t('user.profile.basicInfo') }}</div>
        <div class="bio-card sp-card">
          <van-cell-group :border="false">
            <van-cell :title="t('user.profile.weight')" :value="`${detail.weight} kg`" />
            <van-cell :title="t('user.profile.sterilized')" :value="detail.sterilized ? t('common.sterilizedY') : t('common.sterilizedN')" />
            <van-cell :title="t('user.profile.microchip')" :value="detail.microchip" />
            <van-cell :title="t('user.profile.createdAt')" :value="detail.createdAt?.slice(0, 10) ?? '--'" />
          </van-cell-group>
        </div>

        <div class="block-title">{{ t('nav.deviceManage') }}</div>
        <div v-if="detail.device" class="bio-card sp-card">
          <van-cell-group :border="false">
            <van-cell :title="t('admin.common.sn')" :value="detail.device.sn" />
            <van-cell :title="t('admin.common.battery')" :value="`${detail.device.battery}%`" />
            <van-cell :title="t('common.status')">
              <template #value>
                <van-tag round :type="toVantTagType(DEVICE_STATUS[detail.device.status].tag)">
                  {{ t(DEVICE_STATUS[detail.device.status].labelKey) }}
                </van-tag>
              </template>
            </van-cell>
            <van-cell :title="t('admin.common.firmware')" :value="detail.device.firmware" />
          </van-cell-group>
        </div>
        <div v-else class="no-device sp-card">
          <van-tag round type="warning">{{ t('user.profile.noDevice') }}</van-tag>
        </div>

        <div class="block-title">{{ t('doctor.patients.owner') }}</div>
        <div v-if="detail.owner" class="owner-card sp-card">
          <van-image round width="40" height="40" :src="detail.owner.avatar" />
          <div>
            <div class="fw-600">{{ detail.owner.name }}</div>
            <div class="text-secondary fs-12">{{ detail.owner.phone }}</div>
          </div>
        </div>
      </template>
    </van-popup>
  </div>
</template>

<style scoped lang="scss">
.patients {
  padding: 0 14px 16px;
}
.top-tabs {
  background: #fff;
  margin: 0 -14px;
  padding: 0 14px;
}
.count-line {
  margin: 4px 2px 10px;
  font-size: 12px;
  color: var(--sp-text-placeholder);
}
.patient-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 10px;
  .patient-main {
    flex: 1;
    min-width: 0;
  }
  .patient-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
  }
  .patient-sub {
    margin-top: 4px;
    font-size: 12px;
    color: var(--sp-text-secondary);
  }
  .patient-chip {
    margin-top: 3px;
    font-size: 11px;
    color: var(--sp-text-placeholder);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.consult-card {
  padding: 12px;
  margin-top: 10px;
  .consult-head {
    display: flex;
    align-items: center;
    gap: 12px;
    .consult-main {
      flex: 1;
      min-width: 0;
    }
    .consult-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 600;
    }
    .consult-sub {
      margin-top: 3px;
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
    .consult-owner {
      margin-top: 2px;
      font-size: 11px;
      color: var(--sp-text-placeholder);
    }
  }
  .consult-note {
    margin-top: 10px;
    font-size: 13px;
    color: var(--sp-text);
    background: var(--sp-bg);
    border-radius: 8px;
    padding: 8px 10px;
    .note-label {
      color: var(--sp-primary);
      font-weight: 600;
      margin-right: 4px;
    }
  }
  .consult-vitals {
    margin-top: 8px;
    display: flex;
    gap: 14px;
    font-size: 12px;
    color: var(--sp-text-secondary);
  }
  .consult-foot {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed var(--sp-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    .consult-time {
      font-size: 11px;
      color: var(--sp-text-placeholder);
    }
  }
}
.ml-8 {
  margin-left: 8px;
}

.patient-detail {
  padding: 20px 16px calc(20px + env(safe-area-inset-bottom));
  max-height: 80%;
  overflow-y: auto;
}
.drawer-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}
.block-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--sp-text-secondary);
  margin: 16px 0 8px;
}
.bio-card {
  padding: 4px 8px;
  :deep(.van-cell) {
    padding: 10px 4px;
  }
}
.no-device {
  padding: 12px;
}
.owner-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
}
</style>

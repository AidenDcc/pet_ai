<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getPetApi, updatePetApi, type PetJoined } from '@/api/modules/pet'
import {
  getDoctorsApi,
  pushConsultationApi,
  getMyConsultationsApi,
  type ConsultationMine,
} from '@/api/modules/consultation'
import { SPECIES_ICON, GENDER_LABEL, DEVICE_STATUS, toVantTagType } from '@/utils/consts'
import { ageOf, formatDate, formatDateTime } from '@/utils/format'
import { petAvatarSrc } from '@/utils/petAvatar'
import type { DoctorBrief, PetInfo } from '@/types'
import PetAvatarUploader from '@/components/PetAvatarUploader.vue'
import PetCareSections from '@/components/PetCareSections.vue'

const route = useRoute()
const petId = route.params.id as string
const { t } = useI18n()

const pet = ref<PetJoined | null>(null)
const form = ref<{
  name: string
  weight: number
  gender: 'male' | 'female'
  sterilized: boolean
  isPregnant: boolean
  isLactating: boolean
  avatar: string
  vaccines: PetInfo['vaccines']
  dewormings: PetInfo['dewormings']
  personalityTags: PetInfo['personalityTags']
}>({
  name: '',
  weight: 0,
  gender: 'male',
  sterilized: false,
  isPregnant: false,
  isLactating: false,
  avatar: '',
  vaccines: [],
  dewormings: [],
  personalityTags: [],
})
const saving = ref(false)

const doctors = ref<DoctorBrief[]>([])
const selectedDoctor = ref('')
const pushNote = ref('')
const pushVisible = ref(false)
const pushing = ref(false)
const pushed = ref<ConsultationMine | null>(null)

async function load() {
  try {
    pet.value = await getPetApi(petId)
    form.value = {
      name: pet.value.name,
      weight: pet.value.weight,
      gender: pet.value.gender,
      sterilized: pet.value.sterilized,
      isPregnant: pet.value.isPregnant,
      isLactating: pet.value.isLactating,
      avatar: pet.value.avatar,
      vaccines: [...(pet.value.vaccines ?? [])],
      dewormings: [...(pet.value.dewormings ?? [])],
      personalityTags: [...(pet.value.personalityTags ?? [])],
    }
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  }
}

async function save() {
  if (!form.value.name) {
    showToast(t('user.profile.nameRequired'))
    return
  }
  saving.value = true
  try {
    pet.value = await updatePetApi(petId, form.value)
    showToast(`${t('user.profile.saveSuccess')} ✅`)
  } catch (e) {
    showToast((e as Error).message || t('common.saveFailed'))
  } finally {
    saving.value = false
  }
}

/** 我的问诊记录：判断当前宠物是否已推送 */
async function loadPushed() {
  try {
    const mine = await getMyConsultationsApi()
    pushed.value = mine.find((m) => m.petId === petId && m.status === 'active') ?? null
  } catch {
    pushed.value = null
  }
}

async function openPush() {
  pushVisible.value = true
  if (!doctors.value.length) {
    try {
      doctors.value = await getDoctorsApi()
    } catch (e) {
      showToast((e as Error).message || t('common.loadFailed'))
    }
  }
  if (pushed.value) {
    selectedDoctor.value = pushed.value.doctorId
    pushNote.value = pushed.value.note ?? ''
  } else {
    selectedDoctor.value = doctors.value[0]?.id ?? ''
    pushNote.value = ''
  }
}

async function doPush() {
  if (!selectedDoctor.value) {
    showToast(t('user.profile.chooseDoctor'))
    return
  }
  const doctor = doctors.value.find((d) => d.id === selectedDoctor.value)
  pushing.value = true
  try {
    await pushConsultationApi({ petId, doctorId: selectedDoctor.value, note: pushNote.value.trim() || undefined })
    showToast(t('user.profile.pushSuccess', { doctor: doctor?.name ?? '' }))
    pushVisible.value = false
    await loadPushed()
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  } finally {
    pushing.value = false
  }
}

load()
loadPushed()
</script>

<template>
  <div v-if="pet" class="profile">
    <!-- 档案头 -->
    <div class="profile-head sp-card">
      <img class="pet-avatar" :src="petAvatarSrc(pet.name) || pet.avatar" :alt="pet.name" />
      <div class="pet-name">{{ SPECIES_ICON[pet.species] }} {{ pet.name }}</div>
      <div class="pet-desc">{{ pet.breed }} · {{ t(GENDER_LABEL[pet.gender]) }} · {{ t('common.yearsOld', { n: ageOf(pet.birthDate) }) }}</div>
      <div class="pet-chip">
        <van-tag v-if="pet.device" round :type="toVantTagType(DEVICE_STATUS[pet.device.status].tag)">
          {{ t(DEVICE_STATUS[pet.device.status].labelKey) }} · {{ t('user.profile.boundDevice') }}
        </van-tag>
        <van-tag v-else round type="warning">{{ t('user.profile.noDevice') }}</van-tag>
      </div>
    </div>

    <!-- 问诊推送：将健康数据推送给医生 -->
    <div class="push-card sp-card mt-16">
      <div v-if="pushed && pushed.vetName" class="pushed-row">
        <van-icon name="success" color="#07c160" size="18" />
        <div class="pushed-info">
          <div class="pushed-title">{{ t('user.profile.pushedTo', { doctor: pushed.vetName }) }}</div>
          <div class="pushed-sub">{{ t('user.profile.pushedAt', { time: formatDateTime(pushed.pushedAt) }) }}</div>
        </div>
        <van-button size="small" round plain type="primary" @click="openPush">{{ t('common.edit') }}</van-button>
      </div>
      <van-button v-else block round type="primary" plain icon="service-o" @click="openPush">
        {{ t('user.profile.pushDoctor') }}
      </van-button>
    </div>

    <!-- 编辑表单 -->
    <div class="form sp-card mt-16">
      <div class="form-title">{{ t('user.profile.editTitle') }}</div>
      <div class="field-block">
        <span class="field-label">{{ t('user.petCare.avatar') }}</span>
        <PetAvatarUploader v-model="form.avatar" />
      </div>
      <van-field
        v-model="form.name"
        label-align="left"
        input-align="right"
        :label="t('user.profile.nickname')"
        :placeholder="t('user.profile.nicknamePlaceholder')"
      />
      <van-field
        v-model="form.weight"
        type="number"
        label-align="left"
        input-align="right"
        :label="`${t('user.profile.weight')} (${t('user.profile.weightUnit')})`"
        :placeholder="t('user.profile.weightUnit')"
      />
      <div class="field-block">
        <span class="field-label">{{ t('user.profile.gender') }}</span>
        <van-radio-group v-model="form.gender" direction="horizontal">
          <van-radio name="male">{{ t('gender.male') }}</van-radio>
          <van-radio name="female">{{ t('gender.female') }}</van-radio>
        </van-radio-group>
      </div>
      <div class="field-block">
        <span class="field-label">{{ t('user.profile.sterilized') }}</span>
        <van-switch v-model="form.sterilized" size="22px" color="#ff6b00" />
      </div>
      <div class="field-block">
        <span class="field-label">{{ t('user.profile.isPregnant') }}</span>
        <van-switch v-model="form.isPregnant" size="22px" color="#ff6b00" />
      </div>
      <div class="field-block">
        <span class="field-label">{{ t('user.profile.isLactating') }}</span>
        <van-switch v-model="form.isLactating" size="22px" color="#ff6b00" />
      </div>
      <van-cell :title="t('user.profile.microchip')" :value="pet.microchip" />
      <van-cell :title="t('user.profile.createdAt')" :value="formatDate(pet.createdAt)" />
    </div>

    <!-- 疫苗 / 驱虫 / 性格标签维护 -->
    <div class="care-sections mt-16">
      <PetCareSections
        v-model:vaccines="form.vaccines"
        v-model:dewormings="form.dewormings"
        v-model:personalityTags="form.personalityTags"
      />
    </div>

    <div class="save-bar">
      <van-button block round type="primary" size="large" :loading="saving" @click="save">
        {{ t('user.profile.save') }}
      </van-button>
    </div>

    <!-- 推送健康数据给医生（teleport 进手机外壳内） -->
    <van-popup
      v-model:show="pushVisible"
      position="bottom"
      round
      closeable
      safe-area-inset-bottom
      teleport="#phone-teleport"
      class="push-popup"
    >
      <div class="push-title">{{ t('user.profile.pushTitle') }}</div>
      <div class="push-hint">{{ t('user.profile.pushHint', { name: pet.name }) }}</div>
      <div class="push-label">{{ t('user.profile.chooseDoctor') }}</div>
      <van-radio-group v-model="selectedDoctor" class="doctor-list">
        <van-cell v-for="d in doctors" :key="d.id" clickable :title="`${d.name} · ${d.hospital}`" :label="`${d.title} · ${d.specialty}`">
          <template #icon>
            <van-image round width="36" height="36" :src="d.avatar" class="doctor-avatar" />
          </template>
          <template #right-icon>
            <van-radio :name="d.id" />
          </template>
        </van-cell>
      </van-radio-group>
      <van-field
        v-model="pushNote"
        type="textarea"
        rows="2"
        autosize
        :maxlength="100"
        show-word-limit
        :placeholder="t('user.profile.notePlaceholder')"
        class="push-note"
      />
      <van-button block round type="primary" :loading="pushing" class="push-btn" @click="doPush">
        {{ t('user.profile.pushBtn') }}
      </van-button>
    </van-popup>
  </div>
</template>

<style scoped lang="scss">
.profile {
  padding: 16px 14px;
  padding-bottom: 90px;
}
.profile-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 22px 16px;
  .pet-avatar {
    width: 76px;
    height: 76px;
    border-radius: 50%;
    border: 3px solid var(--sp-primary-light);
  }
  .pet-name {
    margin-top: 12px;
    font-size: 20px;
    font-weight: 800;
  }
  .pet-desc {
    margin-top: 4px;
    font-size: 13px;
    color: var(--sp-text-secondary);
  }
  .pet-chip {
    margin-top: 10px;
  }
}
.form {
  padding: 16px;
  .form-title {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 10px;
  }
  .field-block {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    .field-label {
      font-size: 14px;
      color: var(--sp-text);
    }
  }
}
.save-bar {
  margin-top: 20px;
}
.push-card {
  padding: 14px;
}
.pushed-row {
  display: flex;
  align-items: center;
  gap: 10px;
  .pushed-info {
    flex: 1;
    min-width: 0;
    .pushed-title {
      font-size: 14px;
      font-weight: 600;
      color: #07c160;
    }
    .pushed-sub {
      margin-top: 3px;
      font-size: 12px;
      color: var(--sp-text-placeholder);
    }
  }
}
.push-popup {
  padding: 20px 16px calc(20px + env(safe-area-inset-bottom));
  max-height: 78%;
  overflow-y: auto;
  .push-title {
    font-size: 17px;
    font-weight: 700;
  }
  .push-hint {
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--sp-text-secondary);
  }
  .push-label {
    margin: 16px 0 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--sp-text-secondary);
  }
  .doctor-list {
    .van-cell {
      align-items: center;
    }
    .doctor-avatar {
      margin-right: 12px;
      flex-shrink: 0;
    }
  }
  .push-note {
    margin-top: 14px;
    background: var(--sp-bg);
    border-radius: 10px;
    padding: 6px 12px;
  }
  .push-btn {
    margin-top: 16px;
  }
}
</style>

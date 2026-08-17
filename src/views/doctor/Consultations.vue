<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import {
  getDoctorConsultationsApi,
  replyConsultationApi,
  type ConsultationJoined,
} from '@/api/modules/consultation'
import { SPECIES_ICON, GENDER_LABEL } from '@/utils/consts'
import { ageOf, formatDateTime } from '@/utils/format'
import { petAvatarSrc } from '@/utils/petAvatar'
import type { ConsultationMedicine } from '@/types'

const router = useRouter()
const { t } = useI18n()

const consults = ref<ConsultationJoined[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    consults.value = await getDoctorConsultationsApi()
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}
load()

/* ---------- 回复问诊 ---------- */
const replyVisible = ref(false)
const replyTarget = ref<ConsultationJoined | null>(null)
const replyContent = ref('')
const replyMedicines = ref<ConsultationMedicine[]>([])
const replySending = ref(false)

function openReply(c: ConsultationJoined) {
  replyTarget.value = c
  replyContent.value = ''
  replyMedicines.value = []
  replyVisible.value = true
}

function addMedicine() {
  replyMedicines.value.push({ name: '', usage: '' })
}

function removeMedicine(i: number) {
  replyMedicines.value.splice(i, 1)
}

async function submitReply() {
  if (!replyTarget.value) return
  if (!replyContent.value.trim()) {
    showToast(t('doctor.patients.replyEmpty'))
    return
  }
  replySending.value = true
  try {
    await replyConsultationApi(replyTarget.value.id, {
      content: replyContent.value.trim(),
      medicines: replyMedicines.value.filter((m) => m.name.trim()),
    })
    showToast(t('doctor.patients.replySuccess'))
    replyVisible.value = false
    await load()
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  } finally {
    replySending.value = false
  }
}
</script>

<template>
  <div class="consultations">
    <van-skeleton :loading="loading" :row="5" class="mt-8" />

    <template v-if="!loading">
      <div v-for="c in consults" :key="c.id" class="consult-card sp-card" @click="router.push(`/doctor/pet/${c.petId}`)">
        <div class="consult-head">
          <van-image round width="44" height="44" :src="petAvatarSrc(c.pet.name) || c.pet.avatar" />
          <div class="consult-main">
            <div class="consult-name">
              {{ SPECIES_ICON[c.pet.species] }} {{ c.pet.name }}
              <van-tag v-if="c.replies.length" round plain type="success" class="ml-8">{{ t('doctor.patients.replied') }}</van-tag>
              <van-tag v-else round type="warning" class="ml-8">{{ t('doctor.consultations.pending') }}</van-tag>
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
          <van-button size="mini" round plain type="primary" @click.stop="openReply(c)">
            {{ t('doctor.patients.reply') }}
          </van-button>
        </div>
      </div>

      <van-empty v-if="!consults.length" :description="t('doctor.patients.noConsult')" />
    </template>

    <!-- 回复问诊弹层 -->
    <van-popup
      v-model:show="replyVisible"
      position="bottom"
      round
      safe-area-inset-bottom
      class="reply-popup"
    >
      <template v-if="replyTarget">
        <div class="reply-head">
          <div class="reply-title">{{ t('doctor.patients.reply') }}</div>
          <div class="reply-pet">
            {{ SPECIES_ICON[replyTarget.pet.species] }} {{ replyTarget.pet.name }}
            <span class="reply-owner">· {{ replyTarget.owner?.name ?? '-' }}</span>
          </div>
        </div>

        <div v-if="replyTarget.note" class="reply-note">
          <span class="note-label">{{ t('doctor.patients.consultationContent') }}</span>
          {{ replyTarget.note }}
        </div>

        <div class="reply-field-title">{{ t('doctor.patients.replyContent') }} <span class="required">*</span></div>
        <van-field
          v-model="replyContent"
          type="textarea"
          rows="4"
          autosize
          maxlength="500"
          show-word-limit
          class="reply-textarea"
          :placeholder="t('doctor.patients.replyContentPlaceholder')"
        />

        <div class="reply-field-title">{{ t('doctor.patients.medicine') }}</div>
        <div v-for="(m, i) in replyMedicines" :key="i" class="med-row">
          <van-field v-model="m.name" :placeholder="t('doctor.patients.medicineNamePlaceholder')" class="med-name" />
          <van-field v-model="m.usage" :placeholder="t('doctor.patients.medicineUsagePlaceholder')" class="med-usage" />
          <van-icon name="delete-o" color="#f56c6c" class="med-del" @click="removeMedicine(i)" />
        </div>
        <van-button size="small" plain round icon="plus" class="med-add" @click="addMedicine">
          {{ t('doctor.patients.addMedicine') }}
        </van-button>

        <van-button
          round
          block
          type="primary"
          color="#00b4a6"
          class="reply-submit"
          :loading="replySending"
          @click="submitReply"
        >
          {{ t('common.submit') }}
        </van-button>
      </template>
    </van-popup>
  </div>
</template>

<style scoped lang="scss">
.consultations {
  padding: 0 14px 16px;
  min-height: 100%;
  box-sizing: border-box;
  background: #eef7f6;
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

/* ---- 回复问诊弹层 ---- */
.reply-popup {
  padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
  max-height: 85%;
  overflow-y: auto;

  .reply-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    .reply-title {
      font-size: 16px;
      font-weight: 700;
    }

    .reply-pet {
      font-size: 13px;
      color: var(--sp-text-secondary);

      .reply-owner {
        color: var(--sp-text-placeholder);
      }
    }
  }

  .reply-note {
    font-size: 13px;
    color: var(--sp-text);
    background: var(--sp-bg);
    border-radius: 8px;
    padding: 8px 10px;
    margin-bottom: 12px;

    .note-label {
      color: var(--sp-primary);
      font-weight: 600;
      margin-right: 4px;
    }
  }

  .reply-field-title {
    font-size: 13px;
    font-weight: 600;
    margin: 12px 0 6px;

    .required {
      color: #f56c6c;
    }
  }

  .reply-textarea {
    background: var(--sp-bg);
    border-radius: 8px;
  }

  .med-row {
    display: flex;
    align-items: center;
    gap: 8px;

    .med-name {
      flex: 2;
      background: var(--sp-bg);
      border-radius: 8px;
    }

    .med-usage {
      flex: 3;
      background: var(--sp-bg);
      border-radius: 8px;
    }

    .med-del {
      flex-shrink: 0;
      padding: 6px;
    }
  }

  .med-add {
    margin-top: 8px;
    color: var(--sp-primary);
    border-color: var(--sp-primary);
  }

  .reply-submit {
    margin-top: 16px;
  }
}
</style>

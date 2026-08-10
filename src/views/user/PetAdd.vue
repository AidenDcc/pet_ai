<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { createPetApi } from '@/api/modules/pet'
import PetAvatarUploader from '@/components/PetAvatarUploader.vue'
import PetCareSections from '@/components/PetCareSections.vue'
import type { VaccineRecord, DewormRecord } from '@/types'

const router = useRouter()
const { t } = useI18n()

const dogBreeds = ['柯基', '金毛', '边牧', '柴犬', '泰迪', '哈士奇', '萨摩耶', '拉布拉多']
const catBreeds = ['布偶猫', '英短', '美短', '橘猫', '蓝猫', '暹罗猫', '狸花猫', '中华田园猫']

const form = ref<{
  avatar: string
  name: string
  species: 'dog' | 'cat' | ''
  breed: string
  gender: 'male' | 'female' | ''
  birthDate: string
  weight?: number
  sterilized: boolean
  vaccines: VaccineRecord[]
  dewormings: DewormRecord[]
  personalityTags: string[]
}>({
  avatar: '',
  name: '',
  species: '',
  breed: '',
  gender: '',
  birthDate: '',
  weight: undefined,
  sterilized: false,
  vaccines: [],
  dewormings: [],
  personalityTags: [],
})

const breedOptions = computed(() => {
  if (form.value.species === 'dog') return dogBreeds
  if (form.value.species === 'cat') return catBreeds
  return []
})

const breedPickerVisible = ref(false)
const breedPickerColumns = computed(() => breedOptions.value.map((b) => ({ text: b, value: b })))

const saving = ref(false)

function onSpeciesChange() {
  form.value.breed = ''
}

function onBreedConfirm({ selectedOptions }: { selectedOptions: { text: string; value: string }[] }) {
  form.value.breed = selectedOptions[0]?.value ?? ''
  breedPickerVisible.value = false
}

async function doSave() {
  if (!form.value.name.trim()) {
    showToast(t('user.petAdd.nameRequired'))
    return
  }
  if (!form.value.species) {
    showToast(t('user.petAdd.speciesRequired'))
    return
  }

  saving.value = true
  try {
    await createPetApi({
      name: form.value.name.trim(),
      species: form.value.species,
      breed: form.value.breed || (form.value.species === 'dog' ? '柯基' : '布偶猫'),
      gender: form.value.gender || 'male',
      birthDate: form.value.birthDate || new Date().toISOString(),
      weight: form.value.weight ?? 0,
      sterilized: form.value.sterilized,
      avatar: form.value.avatar || undefined,
      vaccines: form.value.vaccines,
      dewormings: form.value.dewormings,
      personalityTags: form.value.personalityTags,
    })
    showToast(t('user.petAdd.addSuccess'))
    router.replace('/user/pets')
  } catch (e) {
    showToast((e as Error).message || t('user.petAdd.addFailed'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="pet-add">
    <div class="form sp-card mt-16 mx-14">
      <!-- 头像 -->
      <div class="field-block">
        <span class="field-label">{{ t('user.petCare.avatar') }}</span>
        <PetAvatarUploader v-model="form.avatar" />
      </div>

      <van-field
        v-model="form.name"
        :label="t('user.profile.nickname')"
        :placeholder="t('user.petAdd.nicknamePlaceholder')"
        maxlength="20"
      />

      <!-- 物种选择 -->
      <div class="field-block">
        <span class="field-label">{{ t('user.profile.species') }}</span>
        <van-radio-group v-model="form.species" direction="horizontal" @change="onSpeciesChange">
          <van-radio name="dog">🐶 {{ t('species.dog') }}</van-radio>
          <van-radio name="cat">🐱 {{ t('species.cat') }}</van-radio>
        </van-radio-group>
      </div>

      <!-- 品种选择 -->
      <van-field
        v-model="form.breed"
        is-link
        readonly
        :label="t('user.profile.breed')"
        :placeholder="t('user.petAdd.breedPlaceholder')"
        :disabled="!breedOptions.length"
        @click="breedOptions.length && (breedPickerVisible = true)"
      />

      <!-- 性别 -->
      <div class="field-block">
        <span class="field-label">{{ t('user.profile.gender') }}</span>
        <van-radio-group v-model="form.gender" direction="horizontal">
          <van-radio name="male">{{ t('gender.male') }}</van-radio>
          <van-radio name="female">{{ t('gender.female') }}</van-radio>
        </van-radio-group>
      </div>

      <!-- 出生日期 -->
      <van-field
        v-model="form.birthDate"
        type="date"
        :label="t('user.profile.birth')"
      />

      <!-- 体重 -->
      <van-field
        v-model.number="form.weight"
        type="number"
        :label="`${t('user.profile.weight')} (${t('user.profile.weightUnit')})`"
        :placeholder="t('user.profile.weightUnit')"
      />

      <!-- 绝育 -->
      <div class="field-block">
        <span class="field-label">{{ t('user.profile.sterilized') }}</span>
        <van-switch v-model="form.sterilized" size="22px" color="#ff6b00" />
      </div>
    </div>

    <!-- 疫苗 / 驱虫 / 性格标签 -->
    <div class="care-sections mt-16 mx-14">
      <PetCareSections
        v-model:vaccines="form.vaccines"
        v-model:dewormings="form.dewormings"
        v-model:personalityTags="form.personalityTags"
      />
    </div>

    <div class="save-bar">
      <van-button block round type="primary" size="large" :loading="saving" @click="doSave">
        {{ t('common.save') }}
      </van-button>
    </div>

    <!-- 品种选择器弹窗 -->
    <van-popup v-model:show="breedPickerVisible" position="bottom" round>
      <van-picker
        :columns="breedPickerColumns"
        :default-index="0"
        @confirm="onBreedConfirm"
        @cancel="breedPickerVisible = false"
      />
    </van-popup>
  </div>
</template>

<style scoped lang="scss">
.pet-add {
  padding-bottom: 90px;
}
.form {
  padding: 8px 0;
  overflow: visible;

  .field-block {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    min-height: 48px;

    .field-label {
      font-size: 14px;
      color: var(--sp-text);
      flex-shrink: 0;
      width: 5em;
    }
    .field-hint {
      font-size: 13px;
      color: var(--sp-text-placeholder);
    }
  }
}
.save-bar {
  padding: 24px 14px;
}
.mx-14 {
  margin-left: 14px;
  margin-right: 14px;
}
.mt-16 {
  margin-top: 16px;
}
</style>

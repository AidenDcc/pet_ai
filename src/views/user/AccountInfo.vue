<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getProfileApi, updateProfileApi } from '@/api/modules/settings'
import { PRESET_AVATARS } from '@/utils/presetAvatars'
import { USER_REGIONS } from '@/utils/consts'
import { useAuthStore } from '@/stores/auth'
import personalAvatar from '@/asset/image/个人头像.png'

const router = useRouter()
const { t, locale } = useI18n()
const auth = useAuthStore()

const form = ref({
  avatar: '',
  name: '',
  gender: 'male' as 'male' | 'female',
  birthday: '',
  region: '',
  bio: '',
})
/** 只读字段：注册账号 / 用户ID */
const account = ref('')
const userId = ref('')

const loading = ref(false)
const saving = ref(false)

const avatarVisible = ref(false)
const birthdayVisible = ref(false)
const regionVisible = ref(false)

const regionColumns = computed(() =>
  USER_REGIONS.map((r) => ({
    text: locale.value === 'zh-CN' ? r.name : r.nameEn,
    value: r.name,
  })),
)

async function load() {
  loading.value = true
  try {
    const p = await getProfileApi()
    account.value = p.account
    userId.value = p.id
    form.value.avatar = p.avatar ?? ''
    form.value.name = p.name ?? ''
    form.value.gender = p.gender ?? 'male'
    form.value.birthday = p.birthday ?? ''
    form.value.region = p.region ?? ''
    form.value.bio = p.bio ?? ''
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}
onMounted(load)

function selectAvatar(src: string) {
  form.value.avatar = src
  avatarVisible.value = false
}

function onBirthdayConfirm({ selectedValues }: { selectedValues: string[] }) {
  form.value.birthday = selectedValues[0] ?? ''
  birthdayVisible.value = false
}

function onRegionConfirm({ selectedOptions }: { selectedOptions: Array<{ text: string; value: string }> }) {
  form.value.region = selectedOptions[0]?.value ?? form.value.region
  regionVisible.value = false
}

async function doSave() {
  if (!form.value.name.trim()) {
    showToast(t('user.account.namePlaceholder'))
    return
  }
  saving.value = true
  try {
    const res = await updateProfileApi({
      name: form.value.name.trim(),
      avatar: form.value.avatar || undefined,
      gender: form.value.gender,
      birthday: form.value.birthday || undefined,
      region: form.value.region || undefined,
      bio: form.value.bio || undefined,
    })
    auth.setUser({
      name: res.name,
      avatar: res.avatar,
      gender: res.gender,
      birthday: res.birthday,
      region: res.region,
      bio: res.bio,
    })
    showToast(t('user.account.saveSuccess'))
    setTimeout(() => router.back(), 500)
  } catch (e) {
    showToast((e as Error).message || t('common.saveFailed'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="account-page">
    <van-skeleton v-if="loading" :title="false" :row="8" />

    <template v-else>
      <!-- 头像（点击弹宫格选择） -->
      <div class="avatar-card">
        <div class="avatar-card__pic" @click="avatarVisible = true">
          <img :src="form.avatar || personalAvatar" alt="avatar" />
          <span class="avatar-card__edit"><van-icon name="photograph" /></span>
        </div>
        <div class="avatar-card__hint">{{ t('user.account.avatarSelect') }}</div>
      </div>

      <!-- 昵称 -->
      <div class="sp-card field-card">
        <van-field
          v-model="form.name"
          :label="t('user.account.name')"
          :placeholder="t('user.account.namePlaceholder')"
          maxlength="20"
          clearable
        />
      </div>

      <!-- 注册账号 / 用户ID（只读） -->
      <div class="sp-card field-card">
        <div class="readonly-row">
          <span class="readonly-row__label">{{ t('user.account.account') }}</span>
          <span class="readonly-row__value">{{ account }}</span>
        </div>
        <div class="readonly-row">
          <span class="readonly-row__label">{{ t('user.account.userId') }}</span>
          <span class="readonly-row__value">{{ userId }}</span>
        </div>
      </div>

      <!-- 性别 / 生日 / 地区 -->
      <div class="sp-card field-card">
        <div class="field-block">
          <span class="field-block__label">{{ t('user.account.gender') }}</span>
          <van-radio-group v-model="form.gender" direction="horizontal">
            <van-radio name="male">{{ t('user.account.genderMale') }}</van-radio>
            <van-radio name="female">{{ t('user.account.genderFemale') }}</van-radio>
          </van-radio-group>
        </div>
        <van-field
          :model-value="form.birthday"
          is-link
          readonly
          :label="t('user.account.birthday')"
          :placeholder="t('user.account.birthdaySelect')"
          @click="birthdayVisible = true"
        />
        <van-field
          :model-value="form.region"
          is-link
          readonly
          :label="t('user.account.region')"
          :placeholder="t('user.account.regionPlaceholder')"
          @click="regionVisible = true"
        />
      </div>

      <!-- 个人简介 -->
      <div class="sp-card textarea-card">
        <div class="textarea-card__label">{{ t('user.account.bio') }}</div>
        <van-field
          v-model="form.bio"
          type="textarea"
          rows="3"
          autosize
          maxlength="100"
          show-word-limit
          :placeholder="t('user.account.bioPlaceholder')"
        />
      </div>

      <div class="save-bar">
        <van-button block round type="primary" size="large" :loading="saving" @click="doSave">
          {{ t('common.save') }}
        </van-button>
      </div>
    </template>

    <!-- 预设头像宫格 -->
    <van-popup v-model:show="avatarVisible" position="bottom" round>
      <div class="avatar-popup">
        <div class="avatar-popup__title">{{ t('user.account.avatarSelect') }}</div>
        <div class="avatar-grid">
          <div
            v-for="a in PRESET_AVATARS"
            :key="a.id"
            class="avatar-grid__item"
            :class="{ 'avatar-grid__item--active': form.avatar === a.src }"
            @click="selectAvatar(a.src)"
          >
            <img :src="a.src" :alt="a.id" />
          </div>
        </div>
        <van-button class="avatar-popup__close" block round size="small" @click="avatarVisible = false">
          {{ t('common.cancel') }}
        </van-button>
      </div>
    </van-popup>

    <!-- 生日日期选择 -->
    <van-popup v-model:show="birthdayVisible" position="bottom" round>
      <van-date-picker
        :model-value="form.birthday ? [form.birthday] : undefined"
        :min-date="new Date(1940, 0, 1)"
        :max-date="new Date()"
        :title="t('user.account.birthdaySelect')"
        @confirm="onBirthdayConfirm"
        @cancel="birthdayVisible = false"
      />
    </van-popup>

    <!-- 地区选择 -->
    <van-popup v-model:show="regionVisible" position="bottom" round>
      <van-picker
        :columns="regionColumns"
        :title="t('user.account.regionPlaceholder')"
        @confirm="onRegionConfirm"
        @cancel="regionVisible = false"
      />
    </van-popup>
  </div>
</template>

<style scoped lang="scss">
.account-page {
  min-height: 100%;
  box-sizing: border-box;
  padding: 16px 14px 96px;
  background: #fbf3e3;
}

/* ---- 头像卡 ---- */
.avatar-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0 6px;

  &__pic {
    position: relative;
    width: 84px;
    height: 84px;
    cursor: pointer;

    img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 3px solid #fff;
      background: #e8f5e9;
      object-fit: cover;
      display: block;
    }
  }

  &__edit {
    position: absolute;
    right: -2px;
    bottom: -2px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #ff6b00;
    color: #fff;
    border: 2px solid #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__hint {
    margin-top: 10px;
    font-size: 12px;
    color: #8a7a5a;
  }
}

/* ---- 字段卡 ---- */
.field-card {
  padding: 4px 0;
  margin-top: 14px;
  overflow: hidden;

  .readonly-row {
    display: flex;
    align-items: center;
    padding: 13px 16px;
    font-size: 14px;

    & + .readonly-row {
      border-top: 1px solid #f5efdf;
    }

    &__label {
      width: 5em;
      flex-shrink: 0;
      color: #2b2b2b;
    }

    &__value {
      flex: 1;
      color: #8a7a5a;
    }
  }

  .field-block {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 13px 16px;

    &__label {
      font-size: 14px;
      color: #2b2b2b;
      flex-shrink: 0;
    }
  }
}

/* ---- 简介卡 ---- */
.textarea-card {
  margin-top: 14px;
  padding: 14px 0;

  &__label {
    padding: 0 16px;
    font-size: 14px;
    color: #2b2b2b;
  }
}

.save-bar {
  padding: 24px 14px;
}

/* ---- 头像宫格弹窗 ---- */
.avatar-popup {
  padding: 20px 16px calc(20px + env(safe-area-inset-bottom));

  &__title {
    text-align: center;
    font-size: 16px;
    font-weight: 700;
    color: #2b2b2b;
    margin-bottom: 16px;
  }
}

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  justify-items: center;
  margin-bottom: 18px;

  &__item {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    padding: 3px;
    cursor: pointer;

    img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }

    &--active {
      outline: 3px solid #ff6b00;
    }
  }
}

.avatar-popup__close {
  --van-button-default-color: #8a7a5a;
}
</style>

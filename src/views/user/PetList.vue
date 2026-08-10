<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast, showDialog } from 'vant'
import { getMyPetsApi, deletePetApi, type PetJoined } from '@/api/modules/pet'
import { SPECIES_ICON, GENDER_LABEL, DEVICE_STATUS, toVantTagType } from '@/utils/consts'
import { ageOf } from '@/utils/format'

const router = useRouter()
const { t } = useI18n()

const pets = ref<PetJoined[]>([])
const loading = ref(false)
const deleting = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    pets.value = await getMyPetsApi()
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

function goEdit(id: string) {
  router.push(`/user/pet/${id}`)
}

async function doDelete(pet: PetJoined) {
  try {
    await showDialog({
      title: t('common.confirmDelete'),
      message: t('user.petList.deleteConfirm', { name: pet.name }),
      confirmButtonText: t('common.delete'),
      cancelButtonText: t('common.cancel'),
      confirmButtonColor: '#ff6b6b',
    })
  } catch {
    return // cancelled
  }
  deleting.value = pet.id
  try {
    await deletePetApi(pet.id)
    pets.value = pets.value.filter((p) => p.id !== pet.id)
    showToast(t('user.petList.deleteSuccess'))
  } catch (e) {
    showToast((e as Error).message || t('user.petList.deleteFailed'))
  } finally {
    deleting.value = null
  }
}

load()
</script>

<template>
  <div class="pet-list">
    <van-nav-bar
      :title="t('user.petList.title')"
      fixed
      placeholder
      left-arrow
      @click-left="router.back"
    />

    <!-- 数量统计 -->
    <div v-if="pets.length" class="total-row">
      {{ t('user.petList.total', { n: pets.length }) }}
    </div>

    <!-- 加载骨架 -->
    <van-skeleton v-if="loading" :row="4" title avatar class="mt-16 mx-14" />

    <!-- 空状态 -->
    <van-empty
      v-if="!loading && !pets.length"
      image="search"
      :description="t('user.petList.empty')"
    >
      <van-button round type="primary" @click="router.push('/user/pets/add')">
        {{ t('user.petList.add') }}
      </van-button>
    </van-empty>

    <!-- 宠物卡片列表 -->
    <template v-else>
      <van-swipe-cell v-for="pet in pets" :key="pet.id">
        <div class="pet-card sp-card" @click="goEdit(pet.id)">
          <img class="pet-avatar" :src="pet.avatar" :alt="pet.name" />
          <div class="pet-info">
            <div class="pet-name">
              {{ SPECIES_ICON[pet.species] }} {{ pet.name }}
              <span class="pet-gender">{{ pet.gender === 'male' ? '♂' : '♀' }}</span>
            </div>
            <div class="pet-detail">
              {{ pet.breed }} · {{ t(GENDER_LABEL[pet.gender]) }} · {{ t('common.yearsOld', { n: ageOf(pet.birthDate) }) }}
            </div>
            <div class="pet-meta">
              <span class="pet-weight">{{ pet.weight }}kg</span>
              <van-tag
                v-if="pet.device"
                round
                :type="toVantTagType(DEVICE_STATUS[pet.device.status].tag)"
              >
                {{ t(DEVICE_STATUS[pet.device.status].labelKey) }}
              </van-tag>
              <van-tag v-else round type="warning">
                {{ t('user.profile.noDevice') }}
              </van-tag>
            </div>
          </div>
          <van-icon name="arrow" class="pet-arrow" />
        </div>

        <template #right>
          <div class="swipe-actions">
            <van-button
              square
              class="swipe-btn edit-btn"
              icon="edit"
              @click="goEdit(pet.id)"
            />
            <van-button
              square
              class="swipe-btn del-btn"
              icon="delete-o"
              :loading="deleting === pet.id"
              @click="doDelete(pet)"
            />
          </div>
        </template>
      </van-swipe-cell>
    </template>

    <!-- 底部添加按钮 -->
    <div v-if="pets.length" class="add-bar">
      <van-button block round type="primary" icon="plus" @click="router.push('/user/pets/add')">
        {{ t('user.petList.add') }}
      </van-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pet-list {
  padding-bottom: 90px;
}
.total-row {
  padding: 12px 16px 4px;
  font-size: 12px;
  color: var(--sp-text-placeholder);
}
.pet-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 10px 14px;
  padding: 14px 16px;
  cursor: pointer;

  .pet-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: 2px solid var(--sp-primary-light);
    object-fit: cover;
    flex-shrink: 0;
    background: #eef1f5;
  }
  .pet-info {
    flex: 1;
    min-width: 0;
    .pet-name {
      font-size: 16px;
      font-weight: 700;
      .pet-gender {
        font-size: 13px;
        color: var(--sp-primary);
        margin-left: 4px;
      }
    }
    .pet-detail {
      margin-top: 3px;
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
    .pet-meta {
      margin-top: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
      .pet-weight {
        font-size: 12px;
        font-weight: 600;
        color: var(--sp-text-secondary);
      }
    }
  }
  .pet-arrow {
    color: var(--sp-text-placeholder);
    flex-shrink: 0;
  }
}

.swipe-actions {
  display: flex;
  height: 100%;
  margin: 10px 0;
  .swipe-btn {
    width: 56px;
    height: 100%;
    border: none;
    color: #fff;
    font-size: 18px;
    border-radius: 0;
    &.edit-btn {
      background: var(--sp-primary);
    }
    &.del-btn {
      background: #ff6b6b;
    }
  }
}

.add-bar {
  padding: 20px 14px;
}

.mx-14 {
  margin-left: 14px;
  margin-right: 14px;
}
.mt-16 {
  margin-top: 16px;
}
</style>

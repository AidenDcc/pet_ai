<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAdminPetsApi, type PetJoined } from '@/api/modules/pet'
import { SPECIES_ICON, SPECIES_LABEL, GENDER_LABEL, DEVICE_STATUS } from '@/utils/consts'
import { ageOf, formatDate } from '@/utils/format'

const { t } = useI18n()

const list = ref<PetJoined[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const species = ref('all')
const keyword = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await getAdminPetsApi({ page: page.value, pageSize: pageSize.value, keyword: keyword.value, species: species.value })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  load()
}

// 详情
const detailVisible = ref(false)
const detailRow = ref<PetJoined | null>(null)

function openDetail(row: PetJoined) {
  detailRow.value = row
  detailVisible.value = true
}

onMounted(load)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">{{ t('nav.admin.petArchive') }}</div>
      <div class="page-desc">{{ t('admin.pets.desc') }}</div>
    </div>

    <el-card shadow="never">
      <div class="filter-bar">
        <el-select v-model="species" style="width: 150px" @change="search">
          <el-option :label="t('common.all')" value="all" />
          <el-option :label="t('species.dog')" value="dog" />
          <el-option :label="t('species.cat')" value="cat" />
        </el-select>
        <el-input v-model="keyword" :placeholder="t('admin.pets.searchPh')" style="width: 240px" clearable @keyup.enter="search" @clear="search">
          <template #append><el-button icon="Search" @click="search" /></template>
        </el-input>
      </div>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column :label="t('admin.common.pet')" min-width="160">
          <template #default="{ row }">
            <div class="flex gap-8">
              <el-avatar :src="row.avatar" :size="34" />
              <div>
                <div class="fw-600">{{ SPECIES_ICON[(row as PetJoined).species] }} {{ row.name }}</div>
                <div class="text-secondary fs-12">{{ row.breed }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="t('user.profile.species')" width="80">
          <template #default="{ row }">{{ t(SPECIES_LABEL[(row as PetJoined).species]) }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.common.age')" width="80">
          <template #default="{ row }">{{ t('common.yearsOld', { n: ageOf(row.birthDate) }) }}</template>
        </el-table-column>
        <el-table-column :label="t('user.profile.gender')" width="80">
          <template #default="{ row }">{{ t(GENDER_LABEL[(row as PetJoined).gender]) }}</template>
        </el-table-column>
        <el-table-column :label="t('user.profile.weight')" width="90">
          <template #default="{ row }">{{ row.weight }} {{ t('user.profile.weightUnit') }}</template>
        </el-table-column>
        <el-table-column prop="ownerName" :label="t('admin.common.owner')" width="110" />
        <el-table-column :label="t('admin.common.device')" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.device" size="small" :type="DEVICE_STATUS[row.device.status].tag">
              {{ t(DEVICE_STATUS[row.device.status].labelKey) }}
            </el-tag>
            <el-tag v-else size="small" type="info">{{ t('user.profile.noDevice') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.common.sn')" width="140">
          <template #default="{ row }">{{ row.device?.sn ?? '-' }}</template>
        </el-table-column>
        <el-table-column :label="t('common.action')" width="100" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="openDetail(row as PetJoined)">{{ t('admin.common.viewDetail') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="load"
          @size-change="search"
        />
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" :title="t('admin.common.viewDetail')" width="560px" destroy-on-close>
      <el-descriptions v-if="detailRow" :column="2" border>
        <el-descriptions-item :label="t('admin.pets.detail.id')">
          {{ detailRow.id }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('user.profile.nickname')">
          {{ SPECIES_ICON[detailRow.species] }} {{ detailRow.name }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('user.profile.species')">
          {{ t(SPECIES_LABEL[detailRow.species]) }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('user.profile.breed')">
          {{ detailRow.breed || '-' }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('user.profile.gender')">
          {{ t(GENDER_LABEL[detailRow.gender]) }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('user.profile.birth')">
          {{ formatDate(detailRow.birthDate) }}（{{ t('common.yearsOld', { n: ageOf(detailRow.birthDate) }) }}）
        </el-descriptions-item>
        <el-descriptions-item :label="t('user.profile.weight')">
          {{ detailRow.weight }} {{ t('user.profile.weightUnit') }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('user.profile.sterilized')">
          {{ t(detailRow.sterilized ? 'common.sterilizedY' : 'common.sterilizedN') }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('user.profile.microchip')">
          {{ detailRow.microchip || '-' }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('admin.common.owner')">
          {{ detailRow.ownerName }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('user.profile.device')">
          <template v-if="detailRow.device">
            <el-tag size="small" :type="DEVICE_STATUS[detailRow.device.status].tag">
              {{ t(DEVICE_STATUS[detailRow.device.status].labelKey) }}
            </el-tag>
            <span class="detail-device">{{ detailRow.device.sn }}</span>
          </template>
          <el-tag v-else size="small" type="info">{{ t('user.profile.noDevice') }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item :label="t('admin.pets.detail.ownerId')">
          {{ detailRow.ownerId }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('admin.pets.detail.deviceId')">
          {{ detailRow.deviceId ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('user.profile.createdAt')">
          {{ formatDate(detailRow.createdAt) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.detail-device {
  margin-left: 6px;
}
</style>

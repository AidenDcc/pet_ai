<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAdminPetsApi, type PetJoined } from '@/api/modules/pet'
import { SPECIES_ICON, SPECIES_LABEL, GENDER_LABEL, DEVICE_STATUS } from '@/utils/consts'
import { ageOf } from '@/utils/format'

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

onMounted(load)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">{{ t('nav.admin.pets') }}</div>
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
</style>

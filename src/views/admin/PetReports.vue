<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { getAdminPetsApi, type PetJoined } from '@/api/modules/pet'
import { getAdminReportsApi, generateReportApi, type ReportJoined } from '@/api/modules/report'
import { SPECIES_ICON } from '@/utils/consts'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const { t } = useI18n()

const list = ref<ReportJoined[]>([])
const loading = ref(false)

// 宠物筛选
const pets = ref<PetJoined[]>([])
const filterPetId = ref('')

// 手动生成
const genVisible = ref(false)
const genPetId = ref('')
const generating = ref(false)

const genPetName = computed(() => pets.value.find((p) => p.id === genPetId.value)?.name ?? '')

async function load() {
  loading.value = true
  try {
    list.value = await getAdminReportsApi(filterPetId.value ? { petId: filterPetId.value } : undefined)
  } catch (e) {
    ElMessage.error((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function loadPets() {
  const res = await getAdminPetsApi({ page: 1, pageSize: 100 })
  pets.value = res.list
}

function onFilterChange() {
  load()
}

function reviewTag(row: ReportJoined): { type: 'success' | 'danger' | 'warning' | 'info'; label: string } {
  if (row.doctorReview === 'approved') return { type: 'success', label: t('status.approved') }
  if (row.doctorReview === 'rejected') return { type: 'danger', label: t('status.rejected') }
  if (row.doctorReview === 'pending') return { type: 'warning', label: t('status.pendingReview') }
  return { type: 'info', label: t('user.reports.ai') }
}

function openGenerate() {
  genPetId.value = ''
  genVisible.value = true
}

async function doGenerate() {
  if (!genPetId.value) {
    ElMessage.warning(t('admin.petReports.selectPet'))
    return
  }
  generating.value = true
  try {
    await generateReportApi(genPetId.value)
    ElMessage.success(t('admin.petReports.generated'))
    genVisible.value = false
    load()
  } catch (e) {
    ElMessage.error((e as Error).message || t('common.opFailed'))
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  load()
  loadPets()
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">{{ t('nav.admin.petReports') }}</div>
      <div class="page-desc">{{ t('admin.petReports.desc') }}</div>
    </div>

    <el-card shadow="never">
      <div class="filter-bar">
        <el-select
          v-model="filterPetId"
          filterable
          clearable
          :placeholder="t('admin.petReports.selectPet')"
          style="width: 260px"
          @change="onFilterChange"
          @clear="onFilterChange"
        >
          <el-option v-for="p in pets" :key="p.id" :value="p.id" :label="p.name">
            <span>{{ SPECIES_ICON[p.species] }} {{ p.name }}</span>
            <span class="opt-sub">{{ p.breed }}</span>
          </el-option>
        </el-select>
        <div class="spacer" />
        <el-button type="primary" icon="Plus" @click="openGenerate">{{ t('admin.petReports.generate') }}</el-button>
      </div>

      <el-table v-loading="loading" :data="list" stripe :empty-text="t('admin.petReports.noData')">
        <el-table-column :label="t('admin.common.pet')" min-width="160">
          <template #default="{ row }">
            <div class="flex gap-8">
              <el-avatar :size="30" :src="row.petAvatar" />
              <div>
                <div class="fw-600">{{ SPECIES_ICON[(row as ReportJoined).species] }} {{ row.petName }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="period" :label="t('admin.petReports.period')" min-width="150" />
        <el-table-column :label="t('admin.petReports.score')" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.score < 85 ? 'warning' : 'success'">{{ row.score }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.petReports.abnormal')" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.abnormal.length ? 'warning' : 'success'">{{ row.abnormal.length }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('common.status')" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="reviewTag(row as ReportJoined).type">{{ reviewTag(row as ReportJoined).label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.common.createdAt')" min-width="150">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.action')" width="100" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="router.push(`/admin/pets/reports/${row.id}`)">
              {{ t('admin.common.viewDetail') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="genVisible" :title="t('admin.petReports.generate')" width="420px" destroy-on-close>
      <el-select v-model="genPetId" filterable :placeholder="t('admin.petReports.selectPet')" style="width: 100%">
        <el-option v-for="p in pets" :key="p.id" :value="p.id" :label="p.name">
          <span>{{ SPECIES_ICON[p.species] }} {{ p.name }}</span>
          <span class="opt-sub">{{ p.breed }}</span>
        </el-option>
      </el-select>
      <p v-if="genPetId" class="gen-hint">{{ t('admin.petReports.generateConfirm', { name: genPetName }) }}</p>
      <template #footer>
        <el-button @click="genVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="generating" @click="doGenerate">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.spacer {
  flex: 1;
}
.opt-sub {
  float: right;
  color: var(--sp-text-placeholder);
  font-size: 12px;
  margin-left: 12px;
}
.gen-hint {
  margin-top: 12px;
  font-size: 13px;
  color: var(--sp-text-secondary);
  line-height: 1.6;
}
</style>

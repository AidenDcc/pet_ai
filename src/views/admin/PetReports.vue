<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { getAdminPetsApi, type PetJoined } from '@/api/modules/pet'
import { getAdminReportsApi, generateAiReportApi, type ReportJoined } from '@/api/modules/report'
import { SPECIES_ICON } from '@/utils/consts'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const { t } = useI18n()

const DAY = 86400000

const list = ref<ReportJoined[]>([])
const loading = ref(false)

// 宠物筛选
const pets = ref<PetJoined[]>([])
const filterPetId = ref('')

// 手动生成
const genVisible = ref(false)
const genPetId = ref('')
/** 时间段：本周 / 本月 / 自定义 */
const genRangeType = ref<'week' | 'month' | 'custom'>('week')
const genCustomRange = ref<[Date, Date] | null>(null)
const generating = ref(false)

const genPetName = computed(() => pets.value.find((p) => p.id === genPetId.value)?.name ?? '')

/** 禁止选择未来日期（自定义时间段） */
function disabledDate(date: Date) {
  return date.getTime() > Date.now()
}

/** 解析当前选择的时间段，返回时间戳范围与粒度；无效返回 null */
function resolveRange(): { startAt: number; endAt: number; timeRange: 'day' | 'week' | 'month' } | null {
  const now = Date.now()
  if (genRangeType.value === 'week') {
    return { startAt: now - 6 * DAY, endAt: now, timeRange: 'week' }
  }
  if (genRangeType.value === 'month') {
    return { startAt: now - 29 * DAY, endAt: now, timeRange: 'month' }
  }
  const [s, e] = genCustomRange.value ?? []
  if (!s || !e) return null
  const startAt = s.getTime()
  const endAt = Math.min(e.getTime() + DAY - 1, now)
  const days = (endAt - startAt) / DAY
  const timeRange = days <= 1.5 ? 'day' : days <= 10 ? 'week' : 'month'
  return { startAt, endAt, timeRange }
}

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
  genRangeType.value = 'week'
  genCustomRange.value = null
  genVisible.value = true
}

async function doGenerate() {
  if (!genPetId.value) {
    ElMessage.warning(t('admin.petReports.selectPet'))
    return
  }
  const range = resolveRange()
  if (!range) {
    ElMessage.warning(t('admin.petReports.selectTimeRange'))
    return
  }
  if ((range.endAt - range.startAt) / DAY > 30) {
    ElMessage.warning(t('admin.petReports.rangeTooLong'))
    return
  }
  generating.value = true
  try {
    const report = await generateAiReportApi(genPetId.value, range)
    ElMessage.success(t('admin.petReports.generated'))
    genVisible.value = false
    load()
    router.push(`/admin/pets/reports/${report.id}`)
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
            <div class="opt-main">
              <div class="opt-name">
                {{ SPECIES_ICON[p.species] }} {{ p.name }}
                <span class="opt-sub">{{ p.breed }}</span>
              </div>
              <div class="opt-owner">{{ p.ownerName }} · {{ p.ownerId }}</div>
            </div>
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
        <el-table-column :label="t('admin.common.owner')" min-width="170">
          <template #default="{ row }">
            <div class="flex gap-8">
              <el-avatar :size="30" :src="(row as ReportJoined).ownerAvatar">{{ (row as ReportJoined).ownerName?.slice(0, 1) }}</el-avatar>
              <div>
                <div class="fw-600">{{ (row as ReportJoined).ownerName || '-' }}</div>
                <div class="text-secondary fs-12">{{ (row as ReportJoined).ownerId }}</div>
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

    <el-dialog v-model="genVisible" :title="t('admin.petReports.generate')" width="460px" destroy-on-close>
      <div class="gen-field">
        <div class="gen-label">{{ t('admin.petReports.selectPet') }}</div>
        <el-select v-model="genPetId" filterable :placeholder="t('admin.petReports.selectPet')" style="width: 100%">
          <el-option v-for="p in pets" :key="p.id" :value="p.id" :label="p.name">
            <div class="opt-main">
              <div class="opt-name">
                {{ SPECIES_ICON[p.species] }} {{ p.name }}
                <span class="opt-sub">{{ p.breed }}</span>
              </div>
              <div class="opt-owner">{{ p.ownerName }} · {{ p.ownerId }}</div>
            </div>
          </el-option>
        </el-select>
      </div>
      <div class="gen-field">
        <div class="gen-label">{{ t('admin.petReports.timeRange') }}</div>
        <el-radio-group v-model="genRangeType" class="gen-range">
          <el-radio-button value="week">{{ t('admin.petReports.thisWeek') }}</el-radio-button>
          <el-radio-button value="month">{{ t('admin.petReports.thisMonth') }}</el-radio-button>
          <el-radio-button value="custom">{{ t('admin.petReports.custom') }}</el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-if="genRangeType === 'custom'"
          v-model="genCustomRange"
          type="daterange"
          :start-placeholder="t('admin.petReports.customStart')"
          :end-placeholder="t('admin.petReports.customEnd')"
          :disabled-date="disabledDate"
          style="width: 100%; margin-top: 10px"
        />
      </div>
      <p class="gen-hint">{{ t('admin.petReports.rangeHint') }}</p>
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
.opt-main {
  min-width: 0;
}
.opt-name {
  font-size: 13px;
}
.opt-sub {
  color: var(--sp-text-placeholder);
  font-size: 12px;
  margin-left: 8px;
}
.opt-owner {
  margin-top: 2px;
  font-size: 12px;
  color: var(--sp-text-placeholder);
}
.gen-field {
  margin-bottom: 16px;
}
.gen-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--sp-text-secondary);
  margin-bottom: 8px;
}
.gen-range {
  display: flex;
}
.gen-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--sp-text-placeholder);
  line-height: 1.6;
}
</style>

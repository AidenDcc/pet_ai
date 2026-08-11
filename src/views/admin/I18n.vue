<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18nStore } from '@/stores/i18n'
import type { I18nEntry } from '@/types'

const { t } = useI18n()
const i18nStore = useI18nStore()

interface Row extends I18nEntry {
  isNew: boolean
}

const rows = ref<Row[]>([])
const keyword = ref('')
const loading = ref(false)

/** 分页 */
const page = ref(1)
const pageSize = ref(20)

/** 从 store 重建表格行（isOverride 由 overrides 集合判定） */
function buildRows() {
  const all = i18nStore.entries
  const over = i18nStore.overrides
  const list: Row[] = Object.entries(all).map(([key, v]) => ({
    key,
    zh: v.zh,
    en: v.en,
    isOverride: key in over,
    isNew: false,
  }))
  list.sort((a, b) => a.key.localeCompare(b.key))
  rows.value = list
}

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return rows.value
  return rows.value.filter(
    (r) => r.key.toLowerCase().includes(kw) || r.zh.includes(kw) || r.en.toLowerCase().includes(kw),
  )
})

/** 当前页数据 */
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

const overrideCount = computed(() => rows.value.filter((r) => r.isOverride).length)

// 搜索词变化回到第一页
watch(keyword, () => {
  page.value = 1
})

// 列表变短（删除/搜索）时钳制页码，避免停留在空页
watch(filtered, (list) => {
  const max = Math.max(1, Math.ceil(list.length / pageSize.value))
  if (page.value > max) page.value = max
})

function onPageSizeChange() {
  page.value = 1
}

async function load() {
  loading.value = true
  try {
    await i18nStore.loadOverrides()
    buildRows()
  } finally {
    loading.value = false
  }
}

function addEntry() {
  page.value = 1
  rows.value.unshift({ key: '', zh: '', en: '', isOverride: false, isNew: true })
}

async function saveRow(row: Row) {
  const key = row.key.trim()
  if (!key) {
    ElMessage.warning(t('admin.i18n.keyRequired'))
    return
  }
  try {
    await i18nStore.saveEntry({ key, zh: row.zh, en: row.en })
    ElMessage.success(t('admin.i18n.saveSuccess'))
    buildRows()
  } catch {
    ElMessage.error(t('common.saveFailed'))
  }
}

async function deleteRow(row: Row) {
  if (row.isNew) {
    rows.value = rows.value.filter((r) => r !== row)
    return
  }
  try {
    await ElMessageBox.confirm(t('admin.i18n.deleteConfirm'), t('common.confirm'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
    })
    await i18nStore.removeEntry(row.key)
    ElMessage.success(t('common.opSuccess'))
    buildRows()
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') ElMessage.error(t('common.opFailed'))
  }
}

onMounted(load)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">{{ t('admin.i18n.title') }}</div>
      <div class="page-desc">{{ t('admin.i18n.hint') }}</div>
    </div>

    <el-card shadow="never">
      <div class="toolbar">
        <el-input
          v-model="keyword"
          :placeholder="t('admin.i18n.search')"
          style="width: 260px"
          clearable
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <div class="spacer" />
        <el-button icon="Refresh" @click="load">{{ t('admin.i18n.refresh') }}</el-button>
        <el-button type="primary" icon="Plus" @click="addEntry">{{ t('admin.i18n.addEntry') }}</el-button>
      </div>

      <div class="stat-line">
        <span>{{ t('admin.i18n.total', { n: filtered.length }) }}</span>
        <el-tag size="small" type="warning" effect="light">
          {{ t('admin.i18n.override') }} × {{ overrideCount }}
        </el-tag>
      </div>

      <el-table v-loading="loading" :data="paged" stripe size="small">
        <el-table-column :label="t('admin.i18n.key')" min-width="200">
          <template #default="{ row }">
            <el-input v-model="row.key" :disabled="!row.isNew" size="small" />
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.i18n.zh')" min-width="220">
          <template #default="{ row }">
            <el-input v-model="row.zh" size="small" />
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.i18n.en')" min-width="220">
          <template #default="{ row }">
            <el-input v-model="row.en" size="small" />
          </template>
        </el-table-column>
        <el-table-column :label="t('common.status')" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.isOverride" size="small" type="warning" effect="light">{{ t('admin.i18n.override') }}</el-tag>
            <el-tag v-else size="small" type="info" effect="plain">{{ t('admin.i18n.base') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('common.action')" width="150">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="saveRow(row as Row)">{{ t('admin.i18n.save') }}</el-button>
            <el-button
              v-if="row.isOverride || row.isNew"
              size="small"
              type="danger"
              link
              @click="deleteRow(row as Row)"
            >
              {{ t('admin.i18n.delete') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && filtered.length === 0" :description="t('admin.i18n.empty')" :image-size="80" />

      <div v-if="filtered.length > 0" class="pager">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="filtered.length"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          background
          @size-change="onPageSizeChange"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.spacer {
  flex: 1;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.stat-line {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--sp-text-2, #8a94a6);
  margin-bottom: 12px;
}
</style>

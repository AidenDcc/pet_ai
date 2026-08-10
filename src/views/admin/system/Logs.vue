<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getSystemLogsApi,
  deleteSystemLogApi,
  clearSystemLogsApi,
} from '@/api/modules/system'
import type { LoginLog } from '@/types'
import { formatDateTime } from '@/utils/format'

const { t } = useI18n()

const list = ref<LoginLog[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const status = ref('all')
const keyword = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await getSystemLogsApi({
      page: page.value,
      pageSize: pageSize.value,
      status: status.value,
      keyword: keyword.value,
    })
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

async function remove(row: LoginLog) {
  try {
    await ElMessageBox.confirm(t('admin.logs.deleteConfirm'), t('common.confirm'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
    })
    await deleteSystemLogApi(row.id)
    ElMessage.success(t('common.opSuccess'))
    load()
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') ElMessage.error((e as Error)?.message || t('common.opFailed'))
  }
}

async function clearAll() {
  try {
    await ElMessageBox.confirm(t('admin.logs.clearConfirm'), t('common.confirm'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
    })
    await clearSystemLogsApi()
    ElMessage.success(t('common.opSuccess'))
    search()
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') ElMessage.error((e as Error)?.message || t('common.opFailed'))
  }
}

onMounted(load)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">{{ t('nav.admin.logs') }}</div>
      <div class="page-desc">{{ t('admin.logs.desc') }}</div>
    </div>

    <el-card shadow="never">
      <div class="filter-bar">
        <el-select v-model="status" style="width: 150px" @change="search">
          <el-option :label="t('common.all')" value="all" />
          <el-option :label="t('status.success')" value="success" />
          <el-option :label="t('status.failed')" value="failed" />
        </el-select>
        <el-input
          v-model="keyword"
          :placeholder="t('admin.logs.searchPh')"
          style="width: 240px"
          clearable
          @keyup.enter="search"
          @clear="search"
        >
          <template #append><el-button icon="Search" @click="search" /></template>
        </el-input>
        <div class="spacer" />
        <el-button icon="Refresh" @click="load">{{ t('common.refresh') }}</el-button>
        <el-button type="danger" icon="Delete" :disabled="total === 0" @click="clearAll">{{ t('admin.logs.clear') }}</el-button>
      </div>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="username" :label="t('admin.logs.username')" min-width="120">
          <template #default="{ row }">{{ row.username || '-' }}</template>
        </el-table-column>
        <el-table-column prop="ip" :label="t('admin.logs.ip')" width="140" />
        <el-table-column prop="location" :label="t('admin.logs.location')" width="130">
          <template #default="{ row }">{{ row.location || '-' }}</template>
        </el-table-column>
        <el-table-column prop="browser" :label="t('admin.logs.browser')" min-width="120">
          <template #default="{ row }">{{ row.browser || '-' }}</template>
        </el-table-column>
        <el-table-column prop="os" :label="t('admin.logs.os')" min-width="120">
          <template #default="{ row }">{{ row.os || '-' }}</template>
        </el-table-column>
        <el-table-column :label="t('common.status')" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 'success' ? 'success' : 'danger'">
              {{ row.status === 'success' ? t('status.success') : t('status.failed') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.logs.message')" min-width="140">
          <template #default="{ row }">{{ row.message || '-' }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.logs.loginAt')" min-width="150">
          <template #default="{ row }">{{ formatDateTime(row.loginAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.action')" width="80" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="danger" link @click="remove(row as LoginLog)">{{ t('common.delete') }}</el-button>
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
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>

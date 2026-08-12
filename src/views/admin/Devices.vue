<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAdminDevicesApi, type AdminDeviceRow } from '@/api/modules/admin'
import { DEVICE_STATUS } from '@/utils/consts'
import { formatDateTime } from '@/utils/format'

const { t } = useI18n()

const list = ref<AdminDeviceRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const status = ref('all')
const keyword = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await getAdminDevicesApi({ page: page.value, pageSize: pageSize.value, status: status.value, keyword: keyword.value })
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

function batteryColor(b: number) {
  if (b > 50) return '#72d1a8'
  if (b > 20) return '#ff9500'
  return '#ff3b30'
}

// 详情
const detailVisible = ref(false)
const detailRow = ref<AdminDeviceRow | null>(null)

function openDetail(row: AdminDeviceRow) {
  detailRow.value = row
  detailVisible.value = true
}

onMounted(load)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">{{ t('nav.admin.devices') }}</div>
      <div class="page-desc">{{ t('admin.devices.desc') }}</div>
    </div>

    <el-card shadow="never">
      <div class="filter-bar">
        <el-select v-model="status" style="width: 150px" @change="search">
          <el-option :label="t('common.all')" value="all" />
          <el-option :label="t('status.online')" value="online" />
          <el-option :label="t('status.offline')" value="offline" />
          <el-option :label="t('status.lowPower')" value="low-power" />
          <el-option :label="t('status.unbound')" value="unbound" />
        </el-select>
        <el-input v-model="keyword" :placeholder="t('admin.devices.searchPh')" style="width: 240px" clearable @keyup.enter="search" @clear="search">
          <template #append><el-button icon="Search" @click="search" /></template>
        </el-input>
      </div>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="sn" :label="t('admin.common.sn')" width="140" />
        <el-table-column prop="imei" label="IMEI" min-width="170" />
        <el-table-column :label="t('admin.common.status')" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="DEVICE_STATUS[row.status].tag">{{ t(DEVICE_STATUS[row.status].labelKey) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.common.battery')" width="140">
          <template #default="{ row }">
            <el-progress :percentage="row.battery" :color="batteryColor(row.battery)" :stroke-width="8" :show-text="true" :format="() => `${row.battery}%`" />
          </template>
        </el-table-column>
        <el-table-column prop="firmware" :label="t('admin.common.firmware')" width="90" />
        <el-table-column :label="t('admin.common.boundPet')" width="100">
          <template #default="{ row }">{{ row.petName ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="ownerName" :label="t('admin.common.owner')" width="100">
          <template #default="{ row }">{{ row.ownerName ?? '-' }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.common.activatedAt')" min-width="150">
          <template #default="{ row }">{{ row.activatedAt ? formatDateTime(row.activatedAt) : '-' }}</template>
        </el-table-column>
        <el-table-column :label="t('common.action')" width="100" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="openDetail(row as AdminDeviceRow)">{{ t('admin.common.viewDetail') }}</el-button>
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
        <el-descriptions-item :label="t('admin.devices.detail.name')">
          {{ detailRow.name || '-' }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('admin.devices.detail.model')">
          {{ detailRow.model || '-' }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('admin.devices.detail.id')">
          {{ detailRow.id }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('admin.common.sn')">
          {{ detailRow.sn }}
        </el-descriptions-item>
        <el-descriptions-item :label="'IMEI'">
          {{ detailRow.imei }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('admin.common.status')">
          <el-tag size="small" :type="DEVICE_STATUS[detailRow.status].tag">
            {{ t(DEVICE_STATUS[detailRow.status].labelKey) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item :label="t('admin.common.battery')">
          {{ detailRow.battery }}%
        </el-descriptions-item>
        <el-descriptions-item :label="t('admin.common.firmware')">
          {{ detailRow.firmware || '-' }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('admin.common.boundPet')">
          {{ detailRow.petName ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('admin.common.owner')">
          {{ detailRow.ownerName ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('admin.common.activatedAt')">
          {{ detailRow.activatedAt ? formatDateTime(detailRow.activatedAt) : '-' }}
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
</style>

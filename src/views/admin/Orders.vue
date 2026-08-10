<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAdminOrdersApi } from '@/api/modules/admin'
import type { OrderItem } from '@/types'
import { ORDER_STATUS } from '@/utils/consts'
import { formatDateTime } from '@/utils/format'

const { t } = useI18n()

const list = ref<OrderItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const status = ref('all')
const keyword = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await getAdminOrdersApi({ page: page.value, pageSize: pageSize.value, status: status.value, keyword: keyword.value })
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
      <div class="page-title">{{ t('nav.admin.orders') }}</div>
      <div class="page-desc">{{ t('admin.orders.desc') }}</div>
    </div>

    <el-card shadow="never">
      <div class="filter-bar">
        <el-select v-model="status" style="width: 150px" @change="search">
          <el-option :label="t('common.all')" value="all" />
          <el-option :label="t('status.pending')" value="pending" />
          <el-option :label="t('status.paid')" value="paid" />
          <el-option :label="t('status.refunded')" value="refunded" />
        </el-select>
        <el-input v-model="keyword" :placeholder="t('admin.orders.searchPh')" style="width: 240px" clearable @keyup.enter="search" @clear="search">
          <template #append><el-button icon="Search" @click="search" /></template>
        </el-input>
      </div>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="orderNo" :label="t('admin.common.orderNo')" min-width="180" />
        <el-table-column prop="planName" :label="t('admin.common.planName')" width="100" />
        <el-table-column prop="userName" :label="t('admin.common.user')" width="100" />
        <el-table-column :label="t('admin.common.amount')" width="110">
          <template #default="{ row }"><span class="fw-600">¥{{ row.amount.toFixed(2) }}</span></template>
        </el-table-column>
        <el-table-column :label="t('admin.common.status')" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="ORDER_STATUS[row.status].tag">{{ t(ORDER_STATUS[row.status].labelKey) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="payMethod" :label="t('admin.common.payType')" width="110">
          <template #default="{ row }">{{ row.payMethod ?? '-' }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.orders.orderedAt')" min-width="150">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.orders.paidAt')" min-width="150">
          <template #default="{ row }">{{ row.paidAt ? formatDateTime(row.paidAt) : '-' }}</template>
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

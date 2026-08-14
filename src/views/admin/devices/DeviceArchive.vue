<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadFile } from 'element-plus'
import {
  createDeviceMasterApi,
  getDeviceMastersApi,
  importDeviceMastersApi,
  updateDeviceMasterApi,
  updateDeviceMasterStatusApi,
} from '@/api/modules/adminDevice'
import type { CommMethod, DeviceMaster } from '@/types'
import { COMM_METHODS, DEVICE_ARCHIVE_STATUS, HEALTH_METRICS } from '@/utils/consts'

const { t } = useI18n()

const list = ref<DeviceMaster[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const status = ref('all')
const keyword = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await getDeviceMastersApi({ page: page.value, pageSize: pageSize.value, status: status.value, keyword: keyword.value })
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

/* ---------- 分类 / 颜色选项（值即 i18n key 末段） ---------- */
const CAT1_OPTIONS = [
  { value: 'cat1Wearable', labelKey: 'admin.deviceArchive.cat1Wearable' },
  { value: 'cat1Tracker', labelKey: 'admin.deviceArchive.cat1Tracker' },
  { value: 'cat1Health', labelKey: 'admin.deviceArchive.cat1Health' },
]
const CAT2_BY_CAT1: Record<string, string[]> = {
  cat1Wearable: ['cat2Collar', 'cat2Leash'],
  cat1Tracker: ['cat2Locator'],
  cat1Health: ['cat2Collar'],
}
const COLOR_OPTIONS = ['colorBlack', 'colorBlue', 'colorPink', 'colorWhite', 'colorOrange']

function cat2Options(cat1: string): string[] {
  return CAT2_BY_CAT1[cat1] ?? []
}

function catLabel(key: string): string {
  return key ? t(`admin.deviceArchive.${key}`) : '-'
}

function colorLabel(key: string): string {
  return key ? t(`admin.deviceArchive.${key}`) : '-'
}

/* ---------- 新增 / 编辑 ---------- */
const formVisible = ref(false)
const formMode = ref<'add' | 'edit'>('add')
const formRef = ref()
const form = reactive<Partial<DeviceMaster>>({})

const formRules = {
  sn: [{ required: true, message: t('admin.deviceArchive.requiredSn'), trigger: 'blur' }],
  productName: [{ required: true, message: t('admin.deviceArchive.requiredProduct'), trigger: 'blur' }],
  model: [{ required: true, message: t('admin.deviceArchive.requiredModel'), trigger: 'blur' }],
  assetNo: [{ required: true, message: t('admin.deviceArchive.requiredAsset'), trigger: 'blur' }],
}

const emptyForm = (): Partial<DeviceMaster> => ({
  sn: '',
  imei: '',
  productName: '',
  brand: '',
  model: '',
  assetNo: '',
  imageUrl: '',
  category1: 'cat1Wearable',
  category2: 'cat2Collar',
  mac: '',
  hardwareVersion: '',
  firmwareVersion: '',
  commMethods: [],
  macByMethod: {},
  protocol: '',
  color: 'colorBlack',
  manuDate: '',
  registerDate: '',
  iotDeviceId: '',
  iotToken: '',
  indicators: [],
  status: 'active',
})

function openAdd() {
  formMode.value = 'add'
  Object.assign(form, emptyForm())
  formVisible.value = true
}

function openEdit(row: DeviceMaster) {
  formMode.value = 'edit'
  Object.assign(form, {
    ...row,
    category1: row.category1 || 'cat1Wearable',
    category2: row.category2 || 'cat2Collar',
    color: row.color || 'colorBlack',
    macByMethod: { ...(row.macByMethod ?? {}) },
  })
  formVisible.value = true
}

function methodMac(method: CommMethod): string {
  return form.macByMethod?.[method] ?? ''
}

function setMethodMac(method: CommMethod, val: string) {
  if (!form.macByMethod) form.macByMethod = {}
  form.macByMethod[method] = val
}

async function saveForm() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  const payload = { ...form }
  // 主 Mac 地址为空时取第一个通讯方式的 Mac
  if (!payload.mac && payload.macByMethod) {
    payload.mac = Object.values(payload.macByMethod).find(Boolean) ?? ''
  }
  if (formMode.value === 'add') {
    await createDeviceMasterApi(payload)
    ElMessage.success(t('common.saveSuccess'))
  } else {
    await updateDeviceMasterApi(form.id as string, payload)
    ElMessage.success(t('common.saveSuccess'))
  }
  formVisible.value = false
  await load()
}

/* ---------- 详情 ---------- */
const detailVisible = ref(false)
const detailRow = ref<DeviceMaster | null>(null)

function openDetail(row: DeviceMaster) {
  detailRow.value = row
  detailVisible.value = true
}

/* ---------- 失效 / 生效 ---------- */
async function toggleStatus(row: DeviceMaster) {
  const toInactive = row.status === 'active'
  try {
    await ElMessageBox.confirm(
      toInactive ? t('admin.deviceArchive.invalidateConfirm', { sn: row.sn }) : t('admin.deviceArchive.reactivateConfirm', { sn: row.sn }),
      toInactive ? t('admin.deviceArchive.invalidate') : t('admin.deviceArchive.reactivate'),
      { type: toInactive ? 'warning' : 'success' },
    )
  } catch {
    return
  }
  await updateDeviceMasterStatusApi(row.id, toInactive ? 'inactive' : 'active')
  ElMessage.success(t('common.opSuccess'))
  await load()
}

/* ---------- Excel 导入 ---------- */
const importVisible = ref(false)
const importFile = ref<File | null>(null)
const importing = ref(false)

function onImportFileChange(file: UploadFile) {
  importFile.value = file.raw ?? null
}

function downloadTemplate() {
  const headers = ['资产编号', 'SN', '产品名称', '品牌', '型号', '一级分类', '二级分类', 'IMEI', '出厂日期', '颜色']
  const blob = new Blob(['﻿' + headers.join(',') + '\n'], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'device_import_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

async function doImport() {
  if (!importFile.value) {
    ElMessage.warning(t('admin.deviceArchive.importRequired'))
    return
  }
  importing.value = true
  try {
    const res = await importDeviceMastersApi()
    ElMessage.success(t('admin.deviceArchive.importDone', { n: res.imported }))
    importVisible.value = false
    importFile.value = null
    page.value = 1
    await load()
  } finally {
    importing.value = false
  }
}

function indicatorLabel(key: string): string {
  const m = HEALTH_METRICS[key as keyof typeof HEALTH_METRICS]
  return m ? t(m.labelKey) : key
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">{{ t('nav.admin.deviceArchive') }}</div>
      <div class="page-desc">{{ t('admin.deviceArchive.desc') }}</div>
    </div>

    <el-card shadow="never">
      <div class="toolbar">
        <el-select v-model="status" style="width: 140px" @change="search">
          <el-option :label="t('common.all')" value="all" />
          <el-option :label="t('admin.deviceArchive.statusActive')" value="active" />
          <el-option :label="t('admin.deviceArchive.statusInactive')" value="inactive" />
        </el-select>
        <el-input v-model="keyword" :placeholder="t('admin.deviceArchive.searchPh')" style="width: 260px" clearable @keyup.enter="search" @clear="search">
          <template #append><el-button icon="Search" @click="search" /></template>
        </el-input>
        <div class="toolbar-spacer" />
        <el-button type="primary" @click="openAdd">{{ t('admin.deviceArchive.add') }}</el-button>
        <el-button plain @click="importVisible = true">{{ t('admin.deviceArchive.importExcel') }}</el-button>
      </div>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="sn" :label="t('admin.deviceArchive.sn')" width="140" fixed="left" />
        <el-table-column prop="productName" :label="t('admin.deviceArchive.colProductName')" min-width="150" />
        <el-table-column prop="model" :label="t('admin.deviceArchive.colModel')" width="100" />
        <el-table-column prop="brand" :label="t('admin.deviceArchive.colBrand')" width="110" />
        <el-table-column prop="assetNo" :label="t('admin.deviceArchive.colAssetNo')" width="130" />
        <el-table-column prop="mac" :label="t('admin.deviceArchive.colMac')" min-width="150" show-overflow-tooltip />
        <el-table-column prop="hardwareVersion" :label="t('admin.deviceArchive.colHardwareVersion')" width="110" />
        <el-table-column prop="firmwareVersion" :label="t('admin.deviceArchive.colFirmwareVersion')" width="110" />
        <el-table-column :label="t('admin.deviceArchive.colCommMethods')" width="150">
          <template #default="{ row }">
            <el-tag v-for="m in row.commMethods" :key="m" size="small" class="tag-gap">
              {{ t(COMM_METHODS[m as CommMethod].labelKey) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.deviceArchive.colColor')" width="100">
          <template #default="{ row }">{{ colorLabel(row.color) }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.deviceArchive.colManuDate')" width="120">
          <template #default="{ row }">{{ row.manuDate || '-' }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.deviceArchive.colIndicators')" min-width="200">
          <template #default="{ row }">
            <el-tag v-for="k in row.indicators.slice(0, 4)" :key="k" size="small" type="primary" effect="plain" class="tag-gap">
              {{ indicatorLabel(k) }}
            </el-tag>
            <span v-if="row.indicators.length > 4" class="text-secondary">+{{ row.indicators.length - 4 }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.deviceArchive.colStatus')" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="DEVICE_ARCHIVE_STATUS[row.status].tag">
              {{ t(DEVICE_ARCHIVE_STATUS[row.status].labelKey) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('common.action')" width="190" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="openDetail(row as DeviceMaster)">{{ t('admin.common.viewDetail') }}</el-button>
            <el-button size="small" link @click="openEdit(row as DeviceMaster)">{{ t('common.edit') }}</el-button>
            <el-button size="small" :type="row.status === 'active' ? 'danger' : 'success'" link @click="toggleStatus(row as DeviceMaster)">
              {{ t(row.status === 'active' ? 'admin.deviceArchive.invalidate' : 'admin.deviceArchive.reactivate') }}
            </el-button>
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

    <!-- 新增 / 编辑 -->
    <el-dialog v-model="formVisible" :title="t(formMode === 'add' ? 'admin.deviceArchive.addTitle' : 'admin.deviceArchive.editTitle')" width="880px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="130px" label-position="right">
        <el-tabs>
          <el-tab-pane :label="t('admin.deviceArchive.groupBasic')">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item :label="t('admin.deviceArchive.imageUrl')" prop="imageUrl">
                  <el-input v-model="form.imageUrl" placeholder="https://" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="t('admin.deviceArchive.assetNo')" prop="assetNo">
                  <el-input v-model="form.assetNo" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="t('admin.deviceArchive.sn')" prop="sn">
                  <el-input v-model="form.sn" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="t('admin.deviceArchive.productName')" prop="productName">
                  <el-input v-model="form.productName" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="t('admin.deviceArchive.brand')" prop="brand">
                  <el-input v-model="form.brand" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="t('admin.deviceArchive.model')" prop="model">
                  <el-input v-model="form.model" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="t('admin.deviceArchive.category1')" prop="category1">
                  <el-select v-model="form.category1" style="width: 100%">
                    <el-option v-for="c in CAT1_OPTIONS" :key="c.value" :value="c.value" :label="t(c.labelKey)" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="t('admin.deviceArchive.category2')" prop="category2">
                  <el-select v-model="form.category2" style="width: 100%">
                    <el-option v-for="c in cat2Options(form.category1 ?? '')" :key="c" :value="c" :label="t(`admin.deviceArchive.${c}`)" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="t('admin.deviceArchive.imei')" prop="imei">
                  <el-input v-model="form.imei" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-tab-pane>

          <el-tab-pane :label="t('admin.deviceArchive.groupHardware')">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item :label="t('admin.deviceArchive.manuDate')" prop="manuDate">
                  <el-date-picker v-model="form.manuDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="t('admin.deviceArchive.color')" prop="color">
                  <el-select v-model="form.color" style="width: 100%">
                    <el-option v-for="c in COLOR_OPTIONS" :key="c" :value="c" :label="t(`admin.deviceArchive.${c}`)" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="t('admin.deviceArchive.hardwareVersion')" prop="hardwareVersion">
                  <el-input v-model="form.hardwareVersion" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="t('admin.deviceArchive.firmwareVersion')" prop="firmwareVersion">
                  <el-input v-model="form.firmwareVersion" />
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item :label="t('admin.deviceArchive.commMethods')" prop="commMethods">
                  <el-checkbox-group v-model="form.commMethods">
                    <el-checkbox v-for="m in Object.keys(COMM_METHODS)" :key="m" :value="m">{{ t(COMM_METHODS[m as CommMethod].labelKey) }}</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
              </el-col>
              <el-col v-for="m in form.commMethods" :key="m" :span="12">
                <el-form-item :label="t('admin.deviceArchive.macOf', { method: t(COMM_METHODS[m as CommMethod].labelKey) })">
                  <el-input :model-value="methodMac(m as CommMethod)" @update:model-value="(v: string) => setMethodMac(m as CommMethod, v)" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="t('admin.deviceArchive.protocol')" prop="protocol">
                  <el-input v-model="form.protocol" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-tab-pane>

          <el-tab-pane :label="t('admin.deviceArchive.groupNetwork')">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item :label="t('admin.deviceArchive.registerDate')" prop="registerDate">
                  <el-date-picker v-model="form.registerDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="t('admin.deviceArchive.iotDeviceId')" prop="iotDeviceId">
                  <el-input v-model="form.iotDeviceId" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="t('admin.deviceArchive.iotToken')" prop="iotToken">
                  <el-input v-model="form.iotToken" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-tab-pane>

          <el-tab-pane :label="t('admin.deviceArchive.groupIndicators')">
            <el-form-item :label="t('admin.deviceArchive.indicators')" prop="indicators">
              <el-checkbox-group v-model="form.indicators">
                <el-checkbox v-for="m in Object.keys(HEALTH_METRICS)" :key="m" :value="m">{{ indicatorLabel(m) }}</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-tab-pane>
        </el-tabs>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveForm">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-dialog v-model="detailVisible" :title="t('admin.deviceArchive.detailTitle')" width="720px" destroy-on-close>
      <div v-if="detailRow">
        <div class="detail-section">{{ t('admin.deviceArchive.detailBasic') }}</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item :label="t('admin.deviceArchive.sn')">{{ detailRow.sn }}</el-descriptions-item>
          <el-descriptions-item :label="t('admin.deviceArchive.assetNo')">{{ detailRow.assetNo || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="t('admin.deviceArchive.productName')">{{ detailRow.productName }}</el-descriptions-item>
          <el-descriptions-item :label="t('admin.deviceArchive.brand')">{{ detailRow.brand || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="t('admin.deviceArchive.model')">{{ detailRow.model }}</el-descriptions-item>
          <el-descriptions-item :label="t('admin.deviceArchive.imei')">{{ detailRow.imei || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="t('admin.deviceArchive.category1')">{{ catLabel(detailRow.category1) }}</el-descriptions-item>
          <el-descriptions-item :label="t('admin.deviceArchive.category2')">{{ catLabel(detailRow.category2) }}</el-descriptions-item>
          <el-descriptions-item :label="t('admin.deviceArchive.imageUrl')" :span="2">{{ detailRow.imageUrl || '-' }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-section">{{ t('admin.deviceArchive.detailHardware') }}</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item :label="t('admin.deviceArchive.mac')">{{ detailRow.mac || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="t('admin.deviceArchive.hardwareVersion')">{{ detailRow.hardwareVersion || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="t('admin.deviceArchive.firmwareVersion')">{{ detailRow.firmwareVersion || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="t('admin.deviceArchive.color')">{{ colorLabel(detailRow.color) }}</el-descriptions-item>
          <el-descriptions-item :label="t('admin.deviceArchive.manuDate')">{{ detailRow.manuDate || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="t('admin.deviceArchive.protocol')">{{ detailRow.protocol || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="t('admin.deviceArchive.commMethods')">
            <el-tag v-for="m in detailRow.commMethods" :key="m" size="small" class="tag-gap">
              {{ t(COMM_METHODS[m as CommMethod].labelKey) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item :label="t('admin.deviceArchive.macOf', { method: t('admin.deviceArchive.commMethods') })" :span="2">
            <div v-for="m in detailRow.commMethods" :key="m" class="mac-line">
              {{ t(COMM_METHODS[m as CommMethod].labelKey) }}：{{ detailRow.macByMethod?.[m as CommMethod] || '-' }}
            </div>
          </el-descriptions-item>
        </el-descriptions>

        <div class="detail-section">{{ t('admin.deviceArchive.detailNetwork') }}</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item :label="t('admin.deviceArchive.registerDate')">{{ detailRow.registerDate || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="t('admin.deviceArchive.iotDeviceId')">{{ detailRow.iotDeviceId || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="t('admin.deviceArchive.iotToken')" :span="2">{{ detailRow.iotToken || '-' }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-section">{{ t('admin.deviceArchive.detailIndicators') }}</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item :label="t('admin.deviceArchive.indicators')">
            <el-tag v-for="k in detailRow.indicators" :key="k" size="small" type="primary" effect="plain" class="tag-gap">
              {{ indicatorLabel(k) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- Excel 导入 -->
    <el-dialog v-model="importVisible" :title="t('admin.deviceArchive.importTitle')" width="520px" destroy-on-close>
      <el-alert :title="t('admin.deviceArchive.importHint')" type="info" :closable="false" style="margin-bottom: 16px" />
      <el-upload
        drag
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls"
        :on-change="onImportFileChange"
        :on-remove="() => (importFile = null)"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">{{ t('admin.deviceArchive.chooseFile') }}</div>
      </el-upload>
      <template #footer>
        <el-button @click="importVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button link type="primary" @click="downloadTemplate">{{ t('admin.deviceArchive.template') }}</el-button>
        <el-button type="primary" :loading="importing" @click="doImport">{{ t('admin.deviceArchive.importExcel') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}
.toolbar-spacer {
  flex: 1;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.tag-gap {
  margin-right: 6px;
}
.text-secondary {
  color: var(--el-text-color-secondary);
}
.detail-section {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-color-primary);
  margin: 18px 0 10px;
}
.detail-section:first-child {
  margin-top: 0;
}
.mac-line {
  line-height: 1.8;
}
</style>

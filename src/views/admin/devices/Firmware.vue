<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
import {
  createFirmwarePackageApi,
  getFirmwareFileApi,
  getFirmwarePackagesApi,
  updateFirmwarePackageApi,
} from '@/api/modules/adminDevice'
import type { FirmwarePackage } from '@/types'
import { FIRMWARE_STATUS } from '@/utils/consts'

const { t } = useI18n()

const list = ref<FirmwarePackage[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const status = ref('all')
const keyword = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await getFirmwarePackagesApi({ page: page.value, pageSize: pageSize.value, status: status.value, keyword: keyword.value })
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

function formatBytes(bytes: number): string {
  if (!bytes) return '-'
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

/* ---------- 分类 / 型号选项 ---------- */
const CATEGORY_OPTIONS = [
  { value: 'cat1Wearable', labelKey: 'admin.deviceArchive.cat1Wearable' },
  { value: 'cat1Tracker', labelKey: 'admin.deviceArchive.cat1Tracker' },
  { value: 'cat1Health', labelKey: 'admin.deviceArchive.cat1Health' },
]
const MODEL_OPTIONS = ['Pet-S1']

function catLabel(key: string): string {
  return key ? t(`admin.deviceArchive.${key}`) : '-'
}

/* ---------- 新增 / 编辑 ---------- */
const formVisible = ref(false)
const formMode = ref<'add' | 'edit'>('add')
const formRef = ref()
const form = reactive<Partial<FirmwarePackage>>({})

const formRules = {
  name: [{ required: true, message: t('admin.firmware.requiredName'), trigger: 'blur' }],
  version: [{ required: true, message: t('admin.firmware.requiredVersion'), trigger: 'blur' }],
}

const emptyForm = (): Partial<FirmwarePackage> => ({
  name: '',
  version: '',
  supportModels: [],
  supportCategories: [],
  releaseDate: '',
  status: 'unpublished',
  fileSize: 0,
  fileName: '',
  upgradedCount: 0,
  description: '',
})

function openAdd() {
  formMode.value = 'add'
  Object.assign(form, emptyForm())
  formVisible.value = true
}

function openEdit(row: FirmwarePackage) {
  formMode.value = 'edit'
  Object.assign(form, {
    ...row,
    supportModels: [...row.supportModels],
    supportCategories: [...row.supportCategories],
  })
  formVisible.value = true
}

function onFileChange(file: UploadFile) {
  form.fileName = file.name
  form.fileSize = file.size ?? 0
}

async function saveForm() {
  if (formMode.value === 'add' && !form.fileName) {
    ElMessage.warning(t('admin.firmware.requiredFile'))
    return
  }
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  if (formMode.value === 'add') {
    await createFirmwarePackageApi({ ...form })
    ElMessage.success(t('common.saveSuccess'))
  } else {
    await updateFirmwarePackageApi(form.id as string, { ...form })
    ElMessage.success(t('common.saveSuccess'))
  }
  formVisible.value = false
  await load()
}

/* ---------- 查看 ---------- */
const detailVisible = ref(false)
const detailRow = ref<FirmwarePackage | null>(null)

function openDetail(row: FirmwarePackage) {
  detailRow.value = row
  detailVisible.value = true
}

async function download(row: FirmwarePackage) {
  const file = await getFirmwareFileApi(row.id)
  const blob = new Blob([`mock firmware package: ${file.fileName}`], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.fileName
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success(t('admin.firmware.downloaded'))
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">{{ t('nav.admin.deviceFirmware') }}</div>
      <div class="page-desc">{{ t('admin.firmware.desc') }}</div>
    </div>

    <el-card shadow="never">
      <div class="toolbar">
        <el-select v-model="status" style="width: 140px" @change="search">
          <el-option :label="t('common.all')" value="all" />
          <el-option :label="t('admin.firmware.statusPublished')" value="published" />
          <el-option :label="t('admin.firmware.statusUnpublished')" value="unpublished" />
        </el-select>
        <el-input v-model="keyword" :placeholder="t('admin.firmware.searchPh')" style="width: 260px" clearable @keyup.enter="search" @clear="search">
          <template #append><el-button icon="Search" @click="search" /></template>
        </el-input>
        <div class="toolbar-spacer" />
        <el-button type="primary" @click="openAdd">{{ t('admin.firmware.upload') }}</el-button>
      </div>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="name" :label="t('admin.firmware.colName')" min-width="160" />
        <el-table-column prop="version" :label="t('admin.firmware.colVersion')" width="120" />
        <el-table-column :label="t('admin.firmware.colModels')" width="130">
          <template #default="{ row }">
            <el-tag v-for="m in row.supportModels" :key="m" size="small" class="tag-gap">{{ m }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.firmware.colCategories')" width="120">
          <template #default="{ row }">
            <el-tag v-for="c in row.supportCategories" :key="c" size="small" type="primary" effect="plain" class="tag-gap">
              {{ catLabel(c) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.firmware.colReleaseDate')" width="120">
          <template #default="{ row }">{{ row.releaseDate || '-' }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.firmware.colStatus')" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="FIRMWARE_STATUS[row.status].tag">
              {{ t(FIRMWARE_STATUS[row.status].labelKey) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.firmware.colFileSize')" width="100">
          <template #default="{ row }">{{ formatBytes(row.fileSize) }}</template>
        </el-table-column>
        <el-table-column prop="upgradedCount" :label="t('admin.firmware.colUpgraded')" width="110" />
        <el-table-column :label="t('admin.firmware.colDesc')" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ row.description || '-' }}</template>
        </el-table-column>
        <el-table-column :label="t('common.action')" width="130" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="openDetail(row as FirmwarePackage)">{{ t('common.view') }}</el-button>
            <el-button size="small" link @click="openEdit(row as FirmwarePackage)">{{ t('common.edit') }}</el-button>
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

    <!-- 上传 / 新增 / 编辑 -->
    <el-dialog v-model="formVisible" :title="t(formMode === 'add' ? 'admin.firmware.uploadTitle' : 'admin.firmware.editTitle')" width="640px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="130px" label-position="right">
        <el-form-item :label="t('admin.firmware.name')" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item :label="t('admin.firmware.version')" prop="version">
          <el-input v-model="form.version" />
        </el-form-item>
        <el-form-item :label="t('admin.firmware.supportModels')" prop="supportModels">
          <el-select v-model="form.supportModels" multiple filterable allow-create default-first-option style="width: 100%">
            <el-option v-for="m in MODEL_OPTIONS" :key="m" :value="m" :label="m" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('admin.firmware.supportCategories')" prop="supportCategories">
          <el-select v-model="form.supportCategories" multiple style="width: 100%">
            <el-option v-for="c in CATEGORY_OPTIONS" :key="c.value" :value="c.value" :label="t(c.labelKey)" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('admin.firmware.releaseDate')" prop="releaseDate">
          <el-date-picker v-model="form.releaseDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item :label="t('admin.firmware.status')" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="published">{{ t('admin.firmware.statusPublished') }}</el-radio>
            <el-radio value="unpublished">{{ t('admin.firmware.statusUnpublished') }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="t('admin.firmware.file')" prop="file">
          <el-upload
            drag
            :auto-upload="false"
            :limit="1"
            accept=".bin,.pkg"
            :on-change="onFileChange"
            :on-remove="() => { form.fileName = ''; form.fileSize = 0 }"
            style="width: 100%"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              {{ form.fileName || t('admin.firmware.chooseFile') }}
            </div>
            <template #tip>
              <div class="el-upload__tip">{{ t('admin.firmware.uploadHint') }}</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item :label="t('admin.firmware.descLabel')" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveForm">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 查看 -->
    <el-dialog v-model="detailVisible" :title="t('admin.firmware.viewTitle')" width="600px" destroy-on-close>
      <el-descriptions v-if="detailRow" :column="2" border>
        <el-descriptions-item :label="t('admin.firmware.name')">{{ detailRow.name }}</el-descriptions-item>
        <el-descriptions-item :label="t('admin.firmware.version')">{{ detailRow.version }}</el-descriptions-item>
        <el-descriptions-item :label="t('admin.firmware.supportModels')">
          <el-tag v-for="m in detailRow.supportModels" :key="m" size="small" class="tag-gap">{{ m }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item :label="t('admin.firmware.supportCategories')">
          <el-tag v-for="c in detailRow.supportCategories" :key="c" size="small" type="primary" effect="plain" class="tag-gap">
            {{ catLabel(c) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item :label="t('admin.firmware.releaseDate')">{{ detailRow.releaseDate || '-' }}</el-descriptions-item>
        <el-descriptions-item :label="t('admin.firmware.status')">
          <el-tag size="small" :type="FIRMWARE_STATUS[detailRow.status].tag">
            {{ t(FIRMWARE_STATUS[detailRow.status].labelKey) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item :label="t('admin.firmware.fileName')">{{ detailRow.fileName }}</el-descriptions-item>
        <el-descriptions-item :label="t('admin.firmware.fileSize')">{{ formatBytes(detailRow.fileSize) }}</el-descriptions-item>
        <el-descriptions-item :label="t('admin.firmware.colUpgraded')">{{ detailRow.upgradedCount }}</el-descriptions-item>
        <el-descriptions-item :label="t('admin.firmware.colDesc')" :span="2">{{ detailRow.description || '-' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">{{ t('common.close') }}</el-button>
        <el-button v-if="detailRow" type="primary" @click="download(detailRow)">{{ t('admin.firmware.download') }}</el-button>
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
</style>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getDictTypesApi,
  createDictTypeApi,
  updateDictTypeApi,
  deleteDictTypeApi,
  getDictItemsApi,
  createDictItemApi,
  updateDictItemApi,
  deleteDictItemApi,
  type DictTypeRow,
} from '@/api/modules/system'
import type { DictItem } from '@/types'

const { t } = useI18n()

/* ---------------- 左侧：字典类型 ---------------- */
const types = ref<DictTypeRow[]>([])
const typeTotal = ref(0)
const typePage = ref(1)
const typePageSize = ref(10)
const typeKeyword = ref('')
const typeLoading = ref(false)
const currentTypeId = ref('')

const currentType = computed(() => types.value.find((r) => r.id === currentTypeId.value))

async function loadTypes() {
  typeLoading.value = true
  try {
    const res = await getDictTypesApi({ page: typePage.value, pageSize: typePageSize.value, keyword: typeKeyword.value })
    types.value = res.list
    typeTotal.value = res.total
    if (currentTypeId.value && !res.list.some((r) => r.id === currentTypeId.value)) currentTypeId.value = ''
    if (!currentTypeId.value && res.list.length) currentTypeId.value = res.list[0].id
    await loadItems()
  } finally {
    typeLoading.value = false
  }
}

function searchTypes() {
  typePage.value = 1
  loadTypes()
}

function selectType(row: DictTypeRow) {
  currentTypeId.value = row.id
  loadItems()
}

/* ---------------- 右侧：字典项 ---------------- */
const items = ref<DictItem[]>([])
const itemLoading = ref(false)
const itemKeyword = ref('')
const itemPage = ref(1)
const itemPageSize = ref(10)

async function loadItems() {
  if (!currentTypeId.value) {
    items.value = []
    return
  }
  itemLoading.value = true
  try {
    items.value = await getDictItemsApi(currentTypeId.value)
    itemPage.value = 1
  } finally {
    itemLoading.value = false
  }
}

const filteredItems = computed(() => {
  const kw = itemKeyword.value.trim().toLowerCase()
  if (!kw) return items.value
  return items.value.filter((i) => i.label.toLowerCase().includes(kw) || i.value.toLowerCase().includes(kw))
})
const itemTotal = computed(() => filteredItems.value.length)
const pagedItems = computed(() => {
  const start = (itemPage.value - 1) * itemPageSize.value
  return filteredItems.value.slice(start, start + itemPageSize.value)
})

watch(itemKeyword, () => {
  itemPage.value = 1
})

/* ---------------- 字典类型 dialog ---------------- */
const typeDialogVisible = ref(false)
const typeIsEdit = ref(false)
const typeEditingId = ref('')
const typeFormRef = ref<FormInstance>()
const typeForm = reactive({ name: '', type: '', remark: '' })
const typeRules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('admin.dicts.typeNameRequired'), trigger: 'blur' }],
  type: [{ required: true, message: t('admin.dicts.typeRequired'), trigger: 'blur' }],
}))

function openAddType() {
  typeIsEdit.value = false
  typeEditingId.value = ''
  Object.assign(typeForm, { name: '', type: '', remark: '' })
  typeDialogVisible.value = true
}

function openEditType(row: DictTypeRow) {
  typeIsEdit.value = true
  typeEditingId.value = row.id
  Object.assign(typeForm, { name: row.name, type: row.type, remark: row.remark })
  typeDialogVisible.value = true
}

async function submitType() {
  if (!typeFormRef.value) return
  try {
    await typeFormRef.value.validate()
  } catch {
    return
  }
  try {
    if (typeIsEdit.value) await updateDictTypeApi(typeEditingId.value, { ...typeForm })
    else await createDictTypeApi({ ...typeForm })
    ElMessage.success(t('common.opSuccess'))
    typeDialogVisible.value = false
    searchTypes()
  } catch (e) {
    ElMessage.error((e as Error)?.message || t('common.opFailed'))
  }
}

async function removeType(row: DictTypeRow) {
  try {
    await ElMessageBox.confirm(t('admin.dicts.typeDeleteConfirm', { name: row.name }), t('common.confirm'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
    })
    await deleteDictTypeApi(row.id)
    ElMessage.success(t('common.opSuccess'))
    if (currentTypeId.value === row.id) currentTypeId.value = ''
    searchTypes()
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') ElMessage.error((e as Error)?.message || t('common.opFailed'))
  }
}

/* ---------------- 字典项 dialog ---------------- */
const itemDialogVisible = ref(false)
const itemIsEdit = ref(false)
const itemEditingId = ref('')
interface ItemForm {
  label: string
  value: string
  sort: number
  status: 'active' | 'disabled'
  extValue: string
}
const itemFormRef = ref<FormInstance>()
const itemForm = reactive<ItemForm>({ label: '', value: '', sort: 0, status: 'active', extValue: '' })

/** 扩展值为选填，但若填写必须是合法 JSON */
function validateExtValue(_rule: unknown, value: string, callback: (error?: Error) => void) {
  const v = (value ?? '').trim()
  if (!v) return callback()
  try {
    JSON.parse(v)
    callback()
  } catch {
    callback(new Error(t('admin.dicts.extValueInvalid')))
  }
}

const itemRules = computed<FormRules>(() => ({
  label: [{ required: true, message: t('admin.dicts.itemLabelRequired'), trigger: 'blur' }],
  value: [{ required: true, message: t('admin.dicts.itemValueRequired'), trigger: 'blur' }],
  extValue: [{ validator: validateExtValue, trigger: 'blur' }],
}))

function openAddItem() {
  if (!currentTypeId.value) return
  itemIsEdit.value = false
  itemEditingId.value = ''
  Object.assign(itemForm, { label: '', value: '', sort: 0, status: 'active', extValue: '' })
  itemDialogVisible.value = true
}

function openEditItem(row: DictItem) {
  itemIsEdit.value = true
  itemEditingId.value = row.id
  Object.assign(itemForm, {
    label: row.label,
    value: row.value,
    sort: row.sort,
    status: row.status,
    extValue: row.extValue ?? '',
  })
  itemDialogVisible.value = true
}

async function submitItem() {
  if (!itemFormRef.value) return
  try {
    await itemFormRef.value.validate()
  } catch {
    return
  }
  try {
    if (itemIsEdit.value) await updateDictItemApi(itemEditingId.value, { ...itemForm })
    else await createDictItemApi({ ...itemForm, typeId: currentTypeId.value })
    ElMessage.success(t('common.opSuccess'))
    itemDialogVisible.value = false
    loadItems()
    loadTypes()
  } catch (e) {
    ElMessage.error((e as Error)?.message || t('common.opFailed'))
  }
}

async function removeItem(row: DictItem) {
  try {
    await ElMessageBox.confirm(t('admin.dicts.itemDeleteConfirm', { label: row.label }), t('common.confirm'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
    })
    await deleteDictItemApi(row.id)
    ElMessage.success(t('common.opSuccess'))
    loadItems()
    loadTypes()
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') ElMessage.error((e as Error)?.message || t('common.opFailed'))
  }
}

onMounted(loadTypes)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">{{ t('nav.admin.dicts') }}</div>
      <div class="page-desc">{{ t('admin.dicts.desc') }}</div>
    </div>

    <el-card shadow="never">
      <el-row :gutter="16">
        <el-col :span="6">
          <div class="pane left-pane">
            <el-input
              v-model="typeKeyword"
              :placeholder="t('admin.dicts.searchPh')"
              size="small"
              clearable
              @keyup.enter="searchTypes"
              @clear="searchTypes"
            >
              <template #append><el-button icon="Search" @click="searchTypes" /></template>
            </el-input>
            <el-table
              v-loading="typeLoading"
              :data="types"
              row-key="id"
              :current-row-key="currentTypeId"
              highlight-current-row
              size="small"
              @row-click="(row) => selectType(row as DictTypeRow)"
            >
              <el-table-column prop="name" :label="t('admin.dicts.typeName')" min-width="90" />
              <el-table-column prop="itemCount" :label="t('admin.dicts.itemCount')" width="60" align="center" />
              <el-table-column :label="t('common.action')" width="96">
                <template #default="{ row }">
                  <el-button size="small" type="primary" link @click="openEditType(row as DictTypeRow)">{{ t('common.edit') }}</el-button>
                  <el-button size="small" type="danger" link @click="removeType(row as DictTypeRow)">{{ t('common.delete') }}</el-button>
                </template>
              </el-table-column>
            </el-table>
            <div class="pane-actions">
              <el-button type="primary" size="small" icon="Plus" style="width: 100%" @click="openAddType">
                {{ t('admin.dicts.typeAdd') }}
              </el-button>
            </div>
            <div class="pager">
              <el-pagination
                v-model:current-page="typePage"
                v-model:page-size="typePageSize"
                :total="typeTotal"
                :page-sizes="[5, 10, 20]"
                layout="total, sizes, prev, pager, next"
                background
                small
                @current-change="loadTypes"
                @size-change="searchTypes"
              />
            </div>
          </div>
        </el-col>

        <el-col :span="18">
          <div class="pane right-pane">
            <div class="pane-header">
              <div class="pane-title">
                <span>{{ currentType?.name ?? t('admin.dicts.selectType') }}</span>
                <el-tag v-if="currentType" size="small" effect="plain">{{ currentType.type }}</el-tag>
              </div>
              <el-input
                v-model="itemKeyword"
                :placeholder="t('admin.dicts.searchPh')"
                style="width: 220px"
                size="small"
                clearable
              />
              <div class="spacer" />
              <el-button type="primary" size="small" icon="Plus" :disabled="!currentTypeId" @click="openAddItem">
                {{ t('admin.dicts.itemAdd') }}
              </el-button>
            </div>

            <template v-if="currentTypeId">
              <el-table v-loading="itemLoading" :data="pagedItems" stripe size="small">
                <el-table-column prop="label" :label="t('admin.dicts.itemLabel')" min-width="140" />
                <el-table-column prop="value" :label="t('admin.dicts.itemValue')" min-width="140" />
                <el-table-column :label="t('admin.dicts.extValue')" min-width="160" show-overflow-tooltip>
                  <template #default="{ row }">{{ row.extValue || '-' }}</template>
                </el-table-column>
                <el-table-column prop="sort" :label="t('admin.dicts.itemSort')" width="70" />
                <el-table-column :label="t('common.status')" width="90">
                  <template #default="{ row }">
                    <el-tag size="small" :type="row.status === 'active' ? 'success' : 'danger'" effect="plain">
                      {{ row.status === 'active' ? t('admin.dicts.statusActive') : t('admin.dicts.statusDisabled') }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column :label="t('common.action')" width="130">
                  <template #default="{ row }">
                    <el-button size="small" type="primary" link @click="openEditItem(row as DictItem)">{{ t('common.edit') }}</el-button>
                    <el-button size="small" type="danger" link @click="removeItem(row as DictItem)">{{ t('common.delete') }}</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <div class="pager">
                <el-pagination
                  v-model:current-page="itemPage"
                  v-model:page-size="itemPageSize"
                  :total="itemTotal"
                  :page-sizes="[5, 10, 20]"
                  layout="total, sizes, prev, pager, next"
                  background
                  small
                  @current-change="loadItems"
                  @size-change="itemPage = 1"
                />
              </div>
            </template>
            <el-empty v-else :description="t('admin.dicts.itemEmpty')" :image-size="80" />
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-dialog
      v-model="typeDialogVisible"
      :title="typeIsEdit ? t('admin.dicts.typeEdit') : t('admin.dicts.typeAdd')"
      width="440px"
      destroy-on-close
    >
      <el-form ref="typeFormRef" :model="typeForm" :rules="typeRules" label-width="88px">
        <el-form-item :label="t('admin.dicts.typeName')" prop="name">
          <el-input v-model="typeForm.name" />
        </el-form-item>
        <el-form-item :label="t('admin.dicts.type')" prop="type">
          <el-input v-model="typeForm.type" />
        </el-form-item>
        <el-form-item :label="t('admin.dicts.remark')" prop="remark">
          <el-input v-model="typeForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="typeDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="submitType">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="itemDialogVisible"
      :title="itemIsEdit ? t('admin.dicts.itemEdit') : t('admin.dicts.itemAdd')"
      width="440px"
      destroy-on-close
    >
      <el-form ref="itemFormRef" :model="itemForm" :rules="itemRules" label-width="88px">
        <el-form-item :label="t('admin.dicts.itemLabel')" prop="label">
          <el-input v-model="itemForm.label" />
        </el-form-item>
        <el-form-item :label="t('admin.dicts.itemValue')" prop="value">
          <el-input v-model="itemForm.value" />
        </el-form-item>
        <el-form-item :label="t('admin.dicts.extValue')" prop="extValue">
          <el-input
            v-model="itemForm.extValue"
            type="textarea"
            :rows="2"
            :placeholder="t('admin.dicts.extValuePlaceholder')"
          />
        </el-form-item>
        <el-form-item :label="t('admin.dicts.itemSort')" prop="sort">
          <el-input-number v-model="itemForm.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item :label="t('common.status')" prop="status">
          <el-radio-group v-model="itemForm.status">
            <el-radio value="active">{{ t('admin.dicts.statusActive') }}</el-radio>
            <el-radio value="disabled">{{ t('admin.dicts.statusDisabled') }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="itemDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="submitItem">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.pane {
  min-height: 420px;
}
.left-pane {
  border-right: 1px solid var(--sp-border, #ebeef5);
  padding-right: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.right-pane {
  display: flex;
  flex-direction: column;
}
.pane-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.pane-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}
.spacer {
  flex: 1;
}
.pane-actions {
  display: flex;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>

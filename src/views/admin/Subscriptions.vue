<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { getAdminPlansApi, updatePlanApi, type AdminPlanRow } from '@/api/modules/admin'

const { t } = useI18n()

const plans = ref<AdminPlanRow[]>([])
const loading = ref(false)
const saving = ref<string | null>(null)
const priceCache = ref<Record<string, number>>({})

async function load() {
  loading.value = true
  try {
    plans.value = await getAdminPlansApi()
    priceCache.value = Object.fromEntries(plans.value.map((p) => [p.id, p.price]))
  } finally {
    loading.value = false
  }
}

async function savePrice(plan: AdminPlanRow) {
  const price = priceCache.value[plan.id]
  if (price === plan.price) return
  saving.value = plan.id
  try {
    await updatePlanApi(plan.id, { price })
    plan.price = price
    ElMessage.success(t('admin.subscriptions.priceUpdated', { name: plan.name, price }))
  } catch (e) {
    ElMessage.error((e as Error).message || t('common.saveFailed'))
  } finally {
    saving.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">{{ t('nav.admin.subscriptions') }}</div>
      <div class="page-desc">{{ t('admin.subscriptions.desc') }}</div>
    </div>

    <el-row v-loading="loading" :gutter="16">
      <el-col v-for="p in plans" :key="p.id" :span="8">
        <el-card shadow="never" class="plan-card" :style="{ borderTop: `4px solid ${p.color}` }">
          <div class="plan-head">
            <span class="plan-name">{{ p.name }}</span>
            <el-tag size="small" type="success" effect="light">{{ t('admin.subscriptions.subscribers', { n: p.subscriberCount }) }}</el-tag>
          </div>

          <div class="plan-price">
            <el-input-number v-model="priceCache[p.id]" :min="0" :step="10" :precision="0" size="large" controls-position="right" />
            <span class="price-unit">{{ t('admin.subscriptions.priceDuration', { n: p.durationMonths }) }}</span>
          </div>

          <div class="plan-features">
            <div v-for="f in p.features" :key="f" class="feature">
              <span class="feature-check">✓</span>{{ f }}
            </div>
          </div>

          <div class="plan-foot">
            <el-button
              type="primary"
              plain
              :loading="saving === p.id"
              :disabled="priceCache[p.id] === p.price"
              @click="savePrice(p)"
            >
              {{ t('admin.common.savePrice') }}
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.plan-card {
  .el-card__body {
    padding: 20px;
  }
  .plan-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    .plan-name {
      font-size: 18px;
      font-weight: 700;
    }
  }
  .plan-price {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 18px 0;
    .price-unit {
      font-size: 13px;
      color: var(--sp-text-secondary);
    }
  }
  .plan-features {
    min-height: 140px;
    .feature {
      padding: 4px 0;
      font-size: 13px;
      color: var(--sp-text-secondary);
      .feature-check {
        color: var(--sp-primary);
        margin-right: 8px;
        font-weight: 700;
      }
    }
  }
  .plan-foot {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }
}
</style>

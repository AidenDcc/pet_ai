<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { showToast, showConfirmDialog } from 'vant'
import { getPlansApi, getMySubscriptionApi, createOrderApi } from '@/api/modules/order'
import type { SubscriptionPlan, OrderItem } from '@/types'
import { formatDateTime } from '@/utils/format'

const { t } = useI18n()

const plans = ref<SubscriptionPlan[]>([])
const currentPlanId = ref<string | null>(null)
const recentOrders = ref<OrderItem[]>([])
const buying = ref(false)

async function load() {
  const [planList, mine] = await Promise.all([getPlansApi(), getMySubscriptionApi()])
  plans.value = planList
  currentPlanId.value = mine.plan?.id ?? null
  recentOrders.value = mine.recentOrders
}

async function buy(plan: SubscriptionPlan) {
  try {
    await showConfirmDialog({
      title: t('user.subscription.confirmTitle', { name: plan.name }),
      message: t('user.subscription.confirmMsg', { name: plan.name, price: plan.price }),
    })
  } catch {
    return
  }
  buying.value = true
  try {
    const res = await createOrderApi({ planId: plan.id })
    showToast(t('user.subscription.success', { name: plan.name }))
    currentPlanId.value = res.user.planId
    await load()
  } catch (e) {
    showToast((e as Error).message || t('user.subscription.failed'))
  } finally {
    buying.value = false
  }
}

load()
</script>

<template>
  <div class="subscription">
    <!-- 套餐 -->
    <div v-for="p in plans" :key="p.id" class="plan-card sp-card" :class="{ current: currentPlanId === p.id }" :style="{ borderColor: currentPlanId === p.id ? p.color : undefined }">
      <div class="plan-head">
        <div>
          <div class="plan-name">{{ p.name }}</div>
          <div class="plan-duration">{{ t('user.subscription.duration', { n: p.durationMonths }) }}</div>
        </div>
        <div class="plan-price">
          <span class="price-symbol">¥</span>{{ p.price }}<span class="price-unit">{{ t('user.subscription.perYear') }}</span>
        </div>
      </div>
      <div class="plan-features">
        <div v-for="f in p.features" :key="f" class="feature">
          <span class="feature-check">✓</span>{{ f }}
        </div>
      </div>
      <van-button
        block
        round
        :type="currentPlanId === p.id ? 'default' : 'primary'"
        :disabled="currentPlanId === p.id"
        :loading="buying && currentPlanId !== p.id"
        @click="buy(p)"
      >
        {{ currentPlanId === p.id ? t('user.subscription.current') : t('user.subscription.subscribe') }}
      </van-button>
    </div>

    <!-- 最近订单 -->
    <div v-if="recentOrders.length" class="orders sp-card mt-16">
      <div class="orders-title">{{ t('user.subscription.recentOrders') }}</div>
      <van-cell v-for="o in recentOrders" :key="o.id" :title="o.planName" :label="`${o.orderNo} · ${formatDateTime(o.createdAt)}`">
        <template #value>
          <span class="text-primary fw-600">¥{{ o.amount }}</span>
        </template>
      </van-cell>
    </div>
  </div>
</template>

<style scoped lang="scss">
.subscription {
  padding: 16px 14px;
}
.plan-card {
  padding: 18px 16px;
  margin-bottom: 14px;
  border: 2px solid var(--sp-border);
  &.current {
    box-shadow: 0 6px 20px rgba(255, 107, 0, 0.14);
  }
  .plan-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    .plan-name {
      font-size: 17px;
      font-weight: 700;
    }
    .plan-duration {
      margin-top: 3px;
      font-size: 12px;
      color: var(--sp-text-secondary);
    }
    .plan-price {
      font-size: 28px;
      font-weight: 800;
      color: var(--sp-primary-dark);
      .price-symbol {
        font-size: 15px;
      }
      .price-unit {
        font-size: 12px;
        font-weight: 400;
        color: var(--sp-text-secondary);
      }
    }
  }
  .plan-features {
    margin: 14px 0;
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
}
.orders {
  padding: 16px;
  .orders-title {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 8px;
  }
}
</style>

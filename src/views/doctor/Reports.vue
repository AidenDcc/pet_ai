<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { getReviewListApi, getAllReportsApi, reviewReportApi, type ReportJoined } from '@/api/modules/report'
import { SPECIES_ICON } from '@/utils/consts'

const { t } = useI18n()

const tab = ref<'pending' | 'reviewed'>('pending')
const pending = ref<ReportJoined[]>([])
const reviewed = ref<ReportJoined[]>([])
const loading = ref(false)

const popupVisible = ref(false)
const current = ref<ReportJoined | null>(null)
const action = ref<'approve' | 'reject'>('approve')
const comment = ref('')
const submitting = ref(false)

async function load() {
  loading.value = true
  try {
    const [p, r] = await Promise.all([getReviewListApi(), getAllReportsApi()])
    pending.value = p
    reviewed.value = r
  } finally {
    loading.value = false
  }
}

function openReview(report: ReportJoined) {
  current.value = report
  action.value = 'approve'
  comment.value = ''
  popupVisible.value = true
}

async function submitReview() {
  if (!current.value) return
  submitting.value = true
  try {
    await reviewReportApi(current.value.id, { action: action.value, comment: comment.value })
    showToast(action.value === 'approve' ? t('doctor.reports.reviewPassed') : t('doctor.reports.reviewRejected'))
    popupVisible.value = false
    await load()
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="reports">
    <van-tabs v-model:active="tab" color="#00b4a6" sticky :offset-top="46">
      <van-tab name="pending">
        <template #title>
          {{ t('doctor.reports.pending') }} <van-badge :content="pending.length" :max="99" color="#ff9500" />
        </template>
        <div class="tab-body">
          <van-skeleton :loading="loading" :row="4" />
          <van-empty v-if="!loading && !pending.length" :description="t('doctor.reports.noPending')" />
          <div v-for="r in pending" :key="r.id" class="review-card sp-card">
            <div class="review-head">
              <van-image round width="40" height="40" :src="r.petAvatar" />
              <div class="review-main">
                <div class="review-title">
                  {{ SPECIES_ICON[r.species] }} {{ r.petName }}
                  <van-tag round type="warning">{{ t('doctor.reports.pending') }}</van-tag>
                </div>
                <div class="review-period">{{ t('doctor.reports.periodScore', { period: r.period, score: r.score }) }}</div>
              </div>
              <van-button size="small" round type="primary" @click="openReview(r)">{{ t('doctor.reports.review') }}</van-button>
            </div>
            <div class="review-summary">{{ r.summary }}</div>
            <div class="review-tags">
              <van-tag
                v-for="a in r.abnormal"
                :key="a.key"
                round
                :type="a.level === 'danger' ? 'danger' : 'warning'"
              >
                {{ a.label }}：{{ a.value }}
              </van-tag>
              <span v-if="!r.abnormal.length" class="text-success fs-12">{{ t('doctor.reports.allNormal') }}</span>
            </div>
          </div>
        </div>
      </van-tab>

      <van-tab name="reviewed">
        <template #title>
          {{ t('doctor.reports.reviewed') }} <van-badge :content="reviewed.length" :max="99" color="#00b4a6" />
        </template>
        <div class="tab-body">
          <van-skeleton :loading="loading" :row="4" />
          <van-empty v-if="!loading && !reviewed.length" :description="t('doctor.reports.noReviewed')" />
          <div v-for="r in reviewed" :key="r.id" class="review-card sp-card">
            <div class="review-head">
              <van-image round width="40" height="40" :src="r.petAvatar" />
              <div class="review-main">
                <div class="review-title">
                  {{ SPECIES_ICON[r.species] }} {{ r.petName }}
                  <van-tag round :type="r.doctorReview === 'approved' ? 'success' : 'danger'">
                    {{ r.doctorReview === 'approved' ? t('status.approved') : t('user.reportDetail.suggestRecheck') }}
                  </van-tag>
                </div>
                <div class="review-period">{{ t('doctor.reports.periodScore', { period: r.period, score: r.score }) }}</div>
              </div>
            </div>
            <div v-if="r.doctorComment" class="review-comment">💬 {{ r.doctorComment }}</div>
            <div class="review-doctor">{{ t('doctor.reports.reviewedBy', { name: r.doctorName }) }}</div>
          </div>
        </div>
      </van-tab>
    </van-tabs>

    <!-- 审核弹层 -->
    <van-popup v-model:show="popupVisible" position="bottom" round safe-area-inset-bottom class="review-popup">
      <div class="popup-title">{{ t('doctor.reports.reviewTitle') }}</div>
      <div v-if="current" class="popup-pet">
        <van-image round width="40" height="40" :src="current.petAvatar" />
        <div>
          <div class="fw-600">{{ current.petName }} · {{ current.period }}</div>
          <div class="text-secondary fs-12">{{ t('doctor.ai.aiConclusion') }}：{{ current.aiConclusion }}</div>
        </div>
      </div>
      <van-radio-group v-model="action" direction="horizontal" class="action-group">
        <van-radio name="approve">{{ t('doctor.reports.approve') }}</van-radio>
        <van-radio name="reject">{{ t('doctor.reports.reject') }}</van-radio>
      </van-radio-group>
      <van-field
        v-model="comment"
        type="textarea"
        rows="3"
        autosize
        :placeholder="action === 'approve' ? t('doctor.reports.commentPlaceholder') : t('doctor.reports.rejectPlaceholder')"
      />
      <van-button block round type="primary" :loading="submitting" class="mt-16" @click="submitReview">{{ t('doctor.reports.submitReview') }}</van-button>
    </van-popup>
  </div>
</template>

<style scoped lang="scss">
.reports {
  padding-bottom: 16px;
}
.tab-body {
  padding: 12px 14px 0;
}
.review-card {
  padding: 14px;
  margin-bottom: 12px;
  .review-head {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .review-main {
    flex: 1;
    min-width: 0;
  }
  .review-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
  }
  .review-period {
    margin-top: 3px;
    font-size: 12px;
    color: var(--sp-text-secondary);
  }
  .review-summary {
    margin-top: 8px;
    font-size: 13px;
    color: var(--sp-text-secondary);
    line-height: 1.6;
  }
  .review-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }
  .review-comment {
    margin-top: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    background: #f0f3f8;
    font-size: 13px;
    color: var(--sp-text-secondary);
    line-height: 1.6;
  }
  .review-doctor {
    margin-top: 8px;
    font-size: 12px;
    color: var(--sp-text-placeholder);
  }
}

.review-popup {
  padding: 20px 16px calc(20px + env(safe-area-inset-bottom));
  .popup-title {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 14px;
  }
  .popup-pet {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    border-radius: 12px;
    background: #f5f7fa;
    margin-bottom: 14px;
  }
  .action-group {
    margin-bottom: 14px;
    display: flex;
    gap: 16px;
  }
}
</style>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import {
  getCommunityFeedApi,
  toggleCommunityFollowApi,
  toggleCommunityLikeApi,
  type PostJoined,
} from '@/api/modules/community'
import { relativeTime } from '@/utils/format'

const router = useRouter()
const { t } = useI18n()

const tab = ref(0) // 0=宠物圈 1=关注萌宠
const keyword = ref('')
const list = ref<PostJoined[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 6
const loading = ref(false)
const finished = ref(false)

async function onLoad() {
  if (finished.value) return
  loading.value = true
  try {
    const res = await getCommunityFeedApi({
      scope: tab.value === 0 ? 'all' : 'follow',
      keyword: keyword.value,
      page: page.value,
      pageSize,
    })
    list.value = page.value === 1 ? res.list : [...list.value, ...res.list]
    total.value = res.total
    finished.value = list.value.length >= res.total
    page.value += 1
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

function resetAndLoad() {
  page.value = 1
  finished.value = false
  list.value = []
  onLoad()
}

function onSearch() {
  resetAndLoad()
}

function onTabChange(index: number | string) {
  tab.value = Number(index)
  resetAndLoad()
}

async function toggleFollow(post: PostJoined) {
  try {
    const res = await toggleCommunityFollowApi(post.authorId)
    post.followed = res.followed
    if (tab.value === 1 && !res.followed) {
      // 关注页签下取消关注：实时移除该发布者的帖子
      list.value = list.value.filter((p) => p.id !== post.id)
      total.value -= 1
      if (!list.value.length) finished.value = true
    }
    showToast(res.followed ? t('user.community.followed') : t('user.community.unfollowed'))
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  }
}

async function toggleLike(post: PostJoined) {
  try {
    const res = await toggleCommunityLikeApi(post.id)
    post.liked = res.liked
    post.likeCount = res.likeCount
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  }
}

function openDetail(post: PostJoined) {
  router.push(`/user/community/${post.id}`)
}

function goBrowseAll() {
  tab.value = 0
  resetAndLoad()
}
</script>

<template>
  <div class="community">
    <!-- 顶部搜索 -->
    <van-search
      v-model="keyword"
      :placeholder="t('user.community.searchPlaceholder')"
      @search="onSearch"
      @clear="onSearch"
    />

    <!-- 宠物圈 / 关注萌宠 -->
    <van-tabs v-model:active="tab" color="#ff6b00" class="community-tabs" @change="onTabChange">
      <van-tab :title="t('user.community.tabAll')" />
      <van-tab :title="t('user.community.tabFollow')" />
    </van-tabs>

    <!-- 帖子流 -->
    <div class="feed-wrap">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        :finished-text="list.length ? t('common.noMore') : ''"
        @load="onLoad"
      >
        <div v-for="post in list" :key="post.id" class="post-card sp-card" @click="openDetail(post)">
          <!-- 发布者行 -->
          <div class="post-head">
            <van-image round width="40" height="40" :src="post.authorAvatar" />
            <div class="post-author">
              <div class="post-name-row">
                <span class="post-name">{{ post.authorName }}</span>
                <van-tag round :style="{ color: post.memberColor, background: post.memberColor + '18', borderColor: post.memberColor }">
                  {{ post.memberLevel }}
                </van-tag>
              </div>
              <div class="post-time">{{ relativeTime(post.createdAt) }}</div>
            </div>
            <van-button
              size="mini"
              round
              :plain="true"
              :type="post.followed ? 'default' : 'primary'"
              class="follow-btn"
              @click.stop="toggleFollow(post)"
            >
              {{ post.followed ? t('user.community.followed') : t('user.community.follow') }}
            </van-button>
          </div>

          <!-- 发布文案 -->
          <div class="post-caption">{{ post.caption }}</div>

          <!-- 图片行：最多 3 张，第 3 张显示剩余张数浮层 -->
          <div v-if="post.images.length" class="post-images">
            <div
              v-for="(img, i) in post.images.slice(0, 3)"
              :key="i"
              class="post-img"
              :class="{ 'post-img--more': post.images.length > 3 && i === 2 }"
            >
              <van-image fit="cover" :src="img" />
              <span v-if="post.images.length > 3 && i === 2" class="img-more">
                {{ t('user.community.moreImages', { n: post.images.length - 3 }) }}
              </span>
            </div>
          </div>

          <!-- 查看 / 点赞 / 评论 -->
          <div class="post-stats">
            <span class="stat"><van-icon name="eye-o" /> {{ post.viewCount }}</span>
            <span class="stat stat--like" @click.stop="toggleLike(post)">
              <van-icon :name="post.liked ? 'good-job' : 'good-job-o'" :color="post.liked ? '#ff6b00' : ''" />
              {{ post.likeCount }}
            </span>
            <span class="stat"><van-icon name="chat-o" /> {{ post.commentCount }}</span>
          </div>
        </div>
      </van-list>

      <van-empty
        v-if="!loading && finished && !list.length"
        :description="tab === 0 ? t('user.community.emptyAll') : t('user.community.emptyFollow')"
      >
        <van-button v-if="tab === 1" size="small" round type="primary" @click="goBrowseAll">
          {{ t('user.community.emptyFollowGo') }}
        </van-button>
      </van-empty>
    </div>
  </div>
</template>

<style scoped lang="scss">
.community {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--sp-bg);
}

.community-tabs {
  flex-shrink: 0;
  :deep(.van-tabs__wrap) {
    background: #fff;
  }
}

.feed-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.feed-wrap .post-card {
  padding: 14px;
  margin: 12px 14px;
}

.post-head {
  display: flex;
  align-items: center;
  gap: 10px;

  .post-author {
    flex: 1;
    min-width: 0;
  }

  .post-name-row {
    display: flex;
    align-items: center;
    gap: 8px;

    .post-name {
      font-size: 15px;
      font-weight: 600;
      color: #333;
    }
  }

  .post-time {
    margin-top: 3px;
    font-size: 11px;
    color: var(--sp-text-placeholder);
  }

  .follow-btn {
    flex-shrink: 0;
  }
}

.post-caption {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}

.post-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 10px;

  .post-img {
    position: relative;
    aspect-ratio: 1;
    border-radius: 8px;
    overflow: hidden;

    :deep(.van-image) {
      width: 100%;
      height: 100%;
    }
  }

  .img-more {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.45);
    color: #fff;
    font-size: 20px;
    font-weight: 700;
  }
}

.post-stats {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--sp-border);
  font-size: 13px;
  color: var(--sp-text-secondary);

  .stat {
    display: inline-flex;
    align-items: center;
    gap: 4px;

    &.stat--like {
      cursor: pointer;
    }
  }
}
</style>

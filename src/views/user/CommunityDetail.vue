<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/auth'
import {
  getCommunityPostApi,
  toggleCommunityFollowApi,
  toggleCommunityLikeApi,
  addCommunityCommentApi,
  type PostDetail,
} from '@/api/modules/community'
import { relativeTime } from '@/utils/format'

const route = useRoute()
const auth = useAuthStore()
const postId = route.params.id as string
const { t } = useI18n()

/** 关联数据图标 / 文案 */
const attachmentIcon: Record<string, string> = {
  report: 'notes-o',
  track: 'location-o',
  vitals: 'chart-trending-o',
  exercise: 'logistics',
}

function attachmentLabel(type: string): string {
  const keyMap: Record<string, string> = {
    report: 'user.community.attachReport',
    track: 'user.community.attachTrack',
    vitals: 'user.community.attachVitals',
    exercise: 'user.community.attachExercise',
  }
  return keyMap[type] ? t(keyMap[type]) : ''
}

const post = ref<PostDetail | null>(null)
const loading = ref(false)
const commentText = ref('')
const sending = ref(false)

const isSelf = computed(() => post.value?.authorId === auth.user?.id)

async function load() {
  loading.value = true
  try {
    post.value = await getCommunityPostApi(postId)
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function toggleFollow() {
  if (!post.value) return
  try {
    const res = await toggleCommunityFollowApi(post.value.authorId)
    post.value.followed = res.followed
    showToast(res.followed ? t('user.community.followed') : t('user.community.unfollowed'))
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  }
}

async function toggleLike() {
  if (!post.value) return
  try {
    const res = await toggleCommunityLikeApi(post.value.id)
    post.value.liked = res.liked
    post.value.likeCount = res.likeCount
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  }
}

async function sendComment() {
  const content = commentText.value.trim()
  if (!content || !post.value || sending.value) return
  sending.value = true
  try {
    const c = await addCommunityCommentApi(post.value.id, content)
    post.value.comments.unshift(c)
    post.value.commentCount += 1
    commentText.value = ''
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  } finally {
    sending.value = false
  }
}

load()
</script>

<template>
  <div class="detail">
    <van-skeleton v-if="loading && !post" :loading="true" :row="8" />

    <template v-if="post">
      <div class="detail-scroll">
        <!-- 发布者 + 会员等级 + 关注按钮 -->
        <div class="post-head">
          <van-image round width="44" height="44" :src="post.authorAvatar" />
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
            v-if="!isSelf"
            size="small"
            round
            :plain="true"
            :type="post.followed ? 'default' : 'primary'"
            @click="toggleFollow"
          >
            {{ post.followed ? t('user.community.followed') : t('user.community.follow') }}
          </van-button>
        </div>

        <!-- 发布文案 -->
        <div class="post-caption">{{ post.caption }}</div>

        <!-- 视频 -->
        <div v-if="post.video" class="post-video">
          <img v-if="post.video.poster" :src="post.video.poster" class="post-video-img" alt="" />
          <div v-else class="post-video-img post-video-img--placeholder"></div>
          <span class="post-video-play"><van-icon name="play" color="#fff" /></span>
        </div>

        <!-- 全部图片 -->
        <div v-if="post.images.length" class="post-images">
          <van-image
            v-for="(img, i) in post.images"
            :key="i"
            fit="cover"
            :src="img"
            class="post-img"
          />
        </div>

        <!-- 关联数据 -->
        <div v-if="post.attachments?.length" class="post-attachments">
          <div v-for="a in post.attachments" :key="a.type" class="attach-card">
            <van-icon :name="attachmentIcon[a.type]" class="attach-icon" />
            <div class="attach-main">
              <div class="attach-title">{{ attachmentLabel(a.type) }}</div>
              <div class="attach-summary">{{ a.summary }}</div>
            </div>
          </div>
        </div>

        <!-- 查看 / 点赞 / 评论 / 发布时间 -->
        <div class="post-stats">
          <span class="stat"><van-icon name="eye-o" /> {{ post.viewCount }}</span>
          <span class="stat stat--like" @click="toggleLike">
            <van-icon :name="post.liked ? 'good-job' : 'good-job-o'" :color="post.liked ? '#ff6b00' : ''" />
            {{ post.likeCount }}
          </span>
          <span class="stat"><van-icon name="chat-o" /> {{ post.commentCount }}</span>
          <span class="stat post-publish">{{ relativeTime(post.createdAt) }}</span>
        </div>

        <!-- 评论列表 -->
        <div class="comments">
          <div class="comments-title">{{ t('user.community.comments', { n: post.commentCount }) }}</div>
          <van-empty v-if="!post.comments.length" :description="t('user.community.noComments')" image-size="60" />
          <div v-for="c in post.comments" :key="c.id" class="comment-item">
            <van-image round width="32" height="32" :src="c.authorAvatar" />
            <div class="comment-main">
              <div class="comment-head">
                <span class="comment-name">{{ c.authorName }}</span>
                <span class="comment-time">{{ relativeTime(c.createdAt) }}</span>
              </div>
              <div class="comment-text">{{ c.content }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部评论输入 -->
      <div class="comment-bar">
        <van-field
          v-model="commentText"
          :placeholder="t('user.community.commentPlaceholder')"
          :border="false"
          class="comment-input"
          @keyup.enter="sendComment"
        />
        <van-button size="small" round type="primary" :loading="sending" @click="sendComment">
          {{ t('user.community.send') }}
        </van-button>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.detail {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--sp-bg);
}

.detail-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 16px 14px 24px;
}

.post-head {
  display: flex;
  align-items: center;
  gap: 12px;

  .post-author {
    flex: 1;
    min-width: 0;
  }

  .post-name-row {
    display: flex;
    align-items: center;
    gap: 8px;

    .post-name {
      font-size: 17px;
      font-weight: 700;
      color: #333;
    }
  }

  .post-time {
    margin-top: 3px;
    font-size: 12px;
    color: var(--sp-text-placeholder);
  }
}

.post-caption {
  margin-top: 12px;
  font-size: 15px;
  line-height: 1.7;
  color: #333;
}

/* 视频 */
.post-video {
  position: relative;
  margin-top: 12px;
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 16 / 9;

  .post-video-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;

    &--placeholder {
      background: #333;
    }
  }

  .post-video-play {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

/* 关联数据卡片 */
.post-attachments {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;

  .attach-card {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    background: #fff7ee;
  }

  .attach-icon {
    margin-top: 2px;
    font-size: 18px;
    color: #ff6b00;
  }

  .attach-main {
    flex: 1;
    min-width: 0;
  }

  .attach-title {
    font-size: 13px;
    font-weight: 600;
    color: #ff6b00;
  }

  .attach-summary {
    margin-top: 2px;
    font-size: 12px;
    line-height: 1.5;
    color: #8a7a5a;
  }
}

.post-images {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-top: 12px;

  .post-img {
    aspect-ratio: 4 / 3;
    border-radius: 10px;
    overflow: hidden;

    :deep(.van-image) {
      width: 100%;
      height: 100%;
    }
  }
}

.post-stats {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 14px;
  padding-top: 12px;
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

  .post-publish {
    margin-left: auto;
  }
}

.comments {
  margin-top: 16px;
}

.comments-title {
  font-size: 15px;
  font-weight: 700;
  color: #333;
  margin-bottom: 10px;
}

.comment-item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--sp-border);

  &:last-child {
    border-bottom: none;
  }
}

.comment-main {
  flex: 1;
  min-width: 0;
}

.comment-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comment-name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.comment-time {
  font-size: 11px;
  color: var(--sp-text-placeholder);
}

.comment-text {
  margin-top: 4px;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}

.comment-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid var(--sp-border);

  .comment-input {
    flex: 1;
    background: var(--sp-bg);
    border-radius: 20px;
    padding: 0 14px;
  }
}
</style>

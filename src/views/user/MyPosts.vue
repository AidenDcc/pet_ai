<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { showToast, showDialog } from 'vant'
import {
  getMyPostsApi,
  toggleCommunityPostVisibilityApi,
  deleteCommunityPostApi,
  type PostJoined,
} from '@/api/modules/community'
import { relativeTime } from '@/utils/format'

const router = useRouter()
const { t } = useI18n()

const tab = ref(0) // 0=全部 1=已发布 2=草稿
const list = ref<PostJoined[]>([])
const loading = ref(false)

const filtered = computed(() => {
  if (tab.value === 1) return list.value.filter((p) => p.status === 'published')
  if (tab.value === 2) return list.value.filter((p) => p.status === 'draft')
  return list.value
})

async function load() {
  loading.value = true
  try {
    list.value = await getMyPostsApi()
  } catch (e) {
    showToast((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

function onTabChange(index: number | string) {
  tab.value = Number(index)
}

function continueEdit(post: PostJoined) {
  router.push(`/user/community/compose?id=${post.id}`)
}

async function toggleVisibility(post: PostJoined) {
  try {
    const res = await toggleCommunityPostVisibilityApi(post.id)
    post.visibility = res.visibility
    showToast(res.visibility === 'visible' ? t('user.myposts.visible') : t('user.myposts.hidden'))
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  }
}

async function removePost(post: PostJoined) {
  try {
    await showDialog({
      title: t('common.confirmDelete'),
      message: t('user.myposts.deleteConfirm'),
      confirmButtonText: t('common.delete'),
      cancelButtonText: t('common.cancel'),
      confirmButtonColor: '#ff6b6b',
    })
  } catch {
    return
  }
  try {
    await deleteCommunityPostApi(post.id)
    list.value = list.value.filter((p) => p.id !== post.id)
    showToast(t('user.myposts.deleteSuccess'))
  } catch (e) {
    showToast((e as Error).message || t('common.opFailed'))
  }
}

/** 卡片缩略图：视频海报 / 首图 */
function thumb(post: PostJoined): string {
  if (post.video?.poster) return post.video.poster
  if (post.images.length) return post.images[0]
  return ''
}

const emptyText = computed(() => {
  if (tab.value === 2) return t('user.myposts.emptyDraft')
  if (tab.value === 1) return t('user.myposts.emptyPublished')
  return t('user.myposts.empty')
})

onMounted(load)
</script>

<template>
  <div class="myposts">
    <van-tabs v-model:active="tab" color="#ff6b00" sticky class="myposts-tabs" @change="onTabChange">
      <van-tab :title="t('user.myposts.tabAll')" />
      <van-tab :title="t('user.myposts.tabPublished')" />
      <van-tab :title="t('user.myposts.tabDraft')" />
    </van-tabs>

    <van-skeleton v-if="loading" title :row="5" class="myposts-skeleton" />

    <template v-else-if="filtered.length">
      <div v-for="post in filtered" :key="post.id" class="post-item">
        <!-- 缩略图 -->
        <div class="thumb">
          <img v-if="thumb(post)" :src="thumb(post)" alt="" />
          <div v-else class="thumb-placeholder">
            <van-icon name="notes-o" />
          </div>
          <span v-if="post.video" class="thumb-play"><van-icon name="play" color="#fff" /></span>
        </div>

        <!-- 内容 -->
        <div class="body">
          <div class="caption">{{ post.caption || t('user.community.captionPlaceholder') }}</div>
          <div class="meta">
            <van-tag round plain :type="post.status === 'draft' ? 'warning' : 'success'">
              {{ post.status === 'draft' ? t('user.myposts.statusDraft') : (post.visibility === 'visible' ? t('user.myposts.visible') : t('user.myposts.hidden')) }}
            </van-tag>
            <span v-if="post.petName" class="meta-pet">{{ post.petName }}</span>
            <span class="meta-time">{{ relativeTime(post.createdAt) }}</span>
          </div>

          <!-- 操作 -->
          <div class="actions">
            <van-button
              v-if="post.status === 'draft'"
              size="mini"
              round
              type="primary"
              @click="continueEdit(post)"
            >
              {{ t('user.myposts.continueEdit') }}
            </van-button>
            <div v-else class="visibility">
              <span>{{ post.visibility === 'visible' ? t('user.myposts.visible') : t('user.myposts.hidden') }}</span>
              <van-switch
                :model-value="post.visibility === 'visible'"
                size="18"
                active-color="#ff6b00"
                @update:model-value="toggleVisibility(post)"
              />
            </div>
            <van-button size="mini" round plain type="danger" @click="removePost(post)">
              {{ t('common.delete') }}
            </van-button>
          </div>
        </div>
      </div>
    </template>

    <van-empty v-else :description="emptyText" />
  </div>
</template>

<style scoped lang="scss">
.myposts {
  min-height: 100%;
  background: var(--sp-bg);
}

.myposts-tabs {
  :deep(.van-tabs__wrap) {
    background: #fff;
  }
}

.myposts-skeleton {
  margin: 16px 14px;
}

.post-item {
  display: flex;
  gap: 12px;
  margin: 12px 14px;
  padding: 12px;
  background: #fff;
  border-radius: 14px;

  .thumb {
    position: relative;
    width: 76px;
    height: 76px;
    border-radius: 10px;
    overflow: hidden;
    flex-shrink: 0;
    background: var(--sp-bg);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .thumb-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #c9b98f;
      font-size: 26px;
    }

    .thumb-play {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .caption {
    font-size: 14px;
    line-height: 1.5;
    color: #2b2b2b;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    font-size: 12px;
    color: #8a7a5a;

    .meta-pet {
      color: #2b2b2b;
    }
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: auto;
    padding-top: 10px;

    .visibility {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #2b2b2b;
    }
  }
}
</style>

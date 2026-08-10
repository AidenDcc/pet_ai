import request from '../request'
import type { AssistantReply } from '@/types'

/** 语音助手对话：文本交给 mock 做意图解析，返回双语回复与可执行动作 */
export function chatAssistantApi(data: { text: string; petId?: string; lang: string }) {
  return request.post<unknown, AssistantReply>('/assistant/chat', data)
}

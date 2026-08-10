/**
 * mock 数据层入口
 * 各业务模块通过 defineMock 注册路由，适配层在 axios adapter 中按
 * method + url 匹配分发。导入该模块即完成全部注册。
 */
import './modules/auth'
import './modules/pet'
import './modules/device'
import './modules/health'
import './modules/report'
import './modules/order'
import './modules/admin'
import './modules/assistant'
import './modules/consultation'
import './modules/community'
import './modules/bi'
import './modules/i18n'
import './modules/fence'
import './modules/exercise'
import './modules/system'

export { resolveMock, MockError } from './helper'

# ShuxinPet · 宠物智能穿戴平台（前端 Demo）

以 **Pet-S1 宠物智能项圈**为硬件载体的一站式宠物健康守护平台前端演示工程：健康监测（心率 / 呼吸 / 血氧 / 体温 / 活动 / 睡眠）、实时定位（高德地图）、电子围栏、运动监测、远程指令、健康报告、AI 分析、在线问诊、宠物社区、多语言（中/英）、订阅计费，面向 **宠物主 / 宠物医生 / 平台运营** 三端角色。

首屏为**三端入口门户**（`/`），三端各自拥有独立的 **登录 / 注册 / 找回密码** 页面，登录时**强制校验账号角色与入口一致**；界面按欧美用户交互风格设计（宠物主端清爽极简、邮箱优先、含 Google / Apple 社交登录占位）。

> 无后端依赖：所有数据交互由前端内置的 **mock 层**（axios 自定义 adapter + 内存种子数据）模拟，延迟与响应包均按真实接口设计。登录、绑定设备、下单、审核报告、改价、围栏增删、社区点赞/关注等操作会真实改变内存数据。

## 技术栈

- Vue 3.5 + TypeScript + Vite + Vue Router + Pinia + **vue-i18n 11**（中英双语，词条可在运营端运行时编辑）
- **三端入口门户**（`/`）+ **三端独立登录 / 注册 / 找回密码**（角色强校验）
- 用户端：**Vant 4**（宠物主 APP 样式，浏览器内手机外壳呈现，活力橙主题，限宽 402px；欧美化极简登录页，邮箱优先、国际区号、Google / Apple 登录占位）
- 医生端：**Vant 4**（移动端 H5，限宽 480px，保持青色）
- 运营端：**Element Plus**（桌面中后台，保持青色）
- 高德地图 JS API（定位 / 轨迹 / 电子围栏，`VITE_AMAP_KEY` / `VITE_AMAP_JSCODE`）
- ECharts 5（健康曲线、运动趋势、BI 数据看板）、axios（mock adapter）、dayjs、sass
- unplugin-auto-import + unplugin-vue-components（按需引入）
- 自定义宠物头像资源：布丁 / 雪球专属头像，其余回退通用头像

## 快速启动

```bash
pnpm install   # 或 npm install / yarn
pnpm dev       # http://localhost:5173
```

```bash
pnpm type-check   # vue-tsc 类型检查
pnpm build        # 类型检查 + 生产构建
pnpm preview      # 预览构建产物
```

> 需要 pnpm ≥ 9。若 pnpm 询问构建脚本许可，已通过 `pnpm-workspace.yaml` 的 `allowBuilds` 放行 esbuild / @parcel/watcher。
>
> 定位 / 围栏页面需要高德地图 Key：在项目根目录创建 `.env.local`，写入 `VITE_AMAP_KEY` 与 `VITE_AMAP_JSCODE`（Web 端 JS API 安全密钥），否则地图区域会显示友好的未配置提示。

## 演示账号（密码均为 `123456`）

| 角色 | 账号 | 登录入口 | 说明 |
| ---- | ---- | ---- | ---- |
| 🐾 宠物主 | `user` | `/user/login` | 林悦 · 13800000001，名下两只宠物（布丁/雪球） |
| 🩺 宠物医生 | `doctor` | `/doctor/login` | 陈思远 · 安心宠物医院 |
| 📊 平台运营 | `admin` | `/admin/login` | 平台管理员 |

各端登录页仅展示**本端**演示账号卡片，点击一键填入并登录；账号角色与入口不匹配时提示「该账号不属于当前入口」。登录态存于 `sp_token` / `sp_role`：勾选 **Remember me** 写入 `localStorage`（跨会话保持），取消勾选仅写入 `sessionStorage`（当前标签页有效）。

## 三端功能一览

> 三端各自的 **登录 / 注册 / 找回密码** 独立成页：宠物主端（欧美极简 · 橙色）走 `/user/login`；医生端（青色 H5）走 `/doctor/login`；运营端（Element 桌面）走 `/admin/login`。登录接口按角色归属校验，旧 `/login?role=xxx` 入口自动重定向到对应端登录页。

### 🐾 用户端（宠物主 APP · 手机外壳 · 活力橙）

- **APP 体验**：浏览器中以手机外壳呈现（圆角机身 + 状态栏 + 灵动岛），底部导航为 **首页 / 守护 / 宠圈 / 我的**
- **首页**（卡通治愈风格）：宠物头像栏切换、核心信息大卡片（体重 / 洗澡 / 驱虫 / 疫苗计数）、萌宠相册与待办宫格、底部快捷入口（在线问诊 / AI 助手 / 爱宠食谱 / 宠语翻译 / 健康自检），顶部汉堡菜单支持语言切换与宠物管理
- **萌宠相册**：照片 / 视频预览、删除进回收站（保留 1 个月后自动清除）、回收站内恢复 / 彻底删除
- **守护**：四维生命体征（体温 / 心率 / 血氧 / 呼吸）+ 运动监测（步频 / 步幅 / 步态 / 速度）实时卡片、高德地图实时定位与轨迹、**历史轨迹**（默认查看一天，支持近 3 天 / 近 7 天 / 自定义时间区间在地图上查看运动轨迹，含点数与里程统计）、**电子围栏**（固定中心点 + 动态「跟随手机」双模式，物理地址前实时标注围栏内 / 外状态，支持新增 / 编辑 / 删除）、**体征趋势与周期报告**（单日柱状 / 多日折线，周 / 月 / 季度周期与四指标健康分析）、**运动详情与趋势**（步频 / 步幅 / 速度 / 步态四指标详情页，含走势图与周期运动分析报告，样式与体征健康界面一致）、快捷工具（围栏 / 语音对讲 / 在线问诊 / 远程指令 / 历史轨迹）
- **宠圈**：宠物社区，宠物圈 / 关注萌宠 双 Tab、帖子发布、点赞、关注、评论
- **在线问诊**：科室筛选 + 医生列表 + **医生详情**（基本信息 / 评分 / 月回答与处方 / 宠主评价）+ 发起咨询 + 我的咨询记录
- **设备管理**：绑定 / 解绑 Pet-S1、设备详情页（电量 / 信号 / 固件 / 在线状态）、远程指令（蜂鸣 / 亮灯 / 刷新定位）
- **宠物档案**：头像上传、疫苗 / 驱虫记录维护、性格标签、多宠物管理、删除宠物
- **健康报告**：周期报告详情、AI 结论、异常项、医生意见、左滑删除
- **我的**：AI 智能助手、数据同步、订阅套餐与续费、角色切换、语言切换、**消息中心**（健康 / 宠圈 / 系统三分类 Tab、批量已读 / 删除、消息详情）

### 🩺 医生端（移动 H5）

- **工作台**：待审核报告、异常提醒概览、在线宠物
- **患者管理**：宠物患者列表（无限滚动）、档案弹层（设备 / 宠物主信息）
- **实时监测**：5 秒模拟采样的心率 / 血氧 / 体温 / 活动实时曲线
- **报告审核**：AI 报告待审列表，通过 / 驳回并填写意见
- **AI 智能分析**：深度健康分析报告、一键生成新分析
- **BI 数据看板**：患者 / 咨询 / 待审 / 报告量 KPI，物种分布、异常分布、周报告趋势图

### 📊 运营端（桌面）

- **数据看板**：收入趋势、设备状态分布、套餐分布、设备激活等 4 张 ECharts 图表 + 统计卡片
- **BI 报表**：收入 / 订单 / 设备 / 用户 / 医生多维度 KPI 与图表
- **宠物管理**：宠物档案 / 宠物健康 / 宠物报告 三个子模块，报告支持查看详情
- **设备 / 用户 / 宠物 / 医生 / 订单 / 订阅** 管理：分页、筛选、认证审核、价格调整（实时改内存数据）
- **系统管理**：系统用户 / 角色 / 菜单 / 字典 / 日志 / 终端 管理，及 **I18N 词条管理**（中英文词条在线增删改，运行时生效）

## 项目结构

```
Pet AI/
├── index.html
├── package.json / vite.config.ts / tsconfig.json / pnpm-workspace.yaml
└── src/
    ├── main.ts                  # 挂载、样式、Element Plus icons 全局注册
    ├── styles/                  # CSS 变量主题（--sp-primary 品牌色）+ 重置 + 工具类
    ├── locales/                 # vue-i18n 中英文基础词条 + 合并逻辑（zh/en key 自动校验对齐）
    ├── router/                  # 按角色分模块的路由表 + 登录/角色守卫
    ├── layouts/                 # MobileLayout（Vant 顶栏+Tabbar，服务用户/医生端）/ AdminLayout（侧边栏+顶栏，运营端）
    ├── views/
    │   ├── portal/Portal.vue    # 首屏三端入口门户（宠物主 / 医生 / 运营）
    │   ├── auth/Agreement.vue   # 用户协议 / 隐私政策
    │   ├── user/                # 宠物主端：login/register/forgot + home/health(守护)/community(宠圈)/consult(问诊)/fence/device*/pet*/report* 等
    │   ├── doctor/              # 医生端：login/register/forgot + dashboard/patients/telemetry/reports/ai-analysis/bi
    │   ├── admin/               # 运营端：login/register/forgot + dashboard/bi/devices/users/pets(档案/健康/报告)/vets/orders/subscriptions
    │   └── admin/system/        # 系统管理：users/roles/menus/dicts/logs/terminals + I18n
    ├── components/              # Amap（高德地图封装）/ PetAvatarUploader / PetCareSections（疫苗驱虫维护）/ VitalChart（ECharts 曲线）/ PhoneShell（手机外壳）
    ├── api/
    │   ├── request.ts           # axios 实例 + mock adapter 分发 + 拦截器解包（保留业务错误码供 i18n 映射）
    │   └── modules/             # auth/pet/device/health/report/order/admin/community/fence/exercise/consultation/i18n/system/bi/assistant 接口封装
    ├── mock/
    │   ├── db.ts                # 内存种子数据 + 变更方法（绑定/下单/审核/改价/围栏/社区真实生效）
    │   ├── helper.ts            # {code,data,message} 响应包、随机延迟、鉴权、分页
    │   ├── index.ts             # 注册全部 mock handler
    │   └── modules/             # 与 api/modules 对应的 mock 实现（80+ 接口路径）
    ├── stores/                  # auth（token/role/user 持久化，remember 记忆）/ i18n（词条加载与运行时覆盖）
    ├── composables/             # useLoginForm / useAuthAccountForm（登录/注册/找回共享逻辑）/ useCountdown / useEchart / useTheme
    ├── types/                   # 领域类型
    └── utils/                   # consts（登录/首页路径、国际区号、演示账号）/ session（登录态持久化）/ authError（错误码→i18n）/ echarts / format / petAvatar
```

## Mock 设计要点

- **统一响应包**：`{ code, data, message }`，`code === 0` 表示成功；`request.ts` 响应拦截器自动解包，页面拿到的是纯 `data`。
- **模拟延迟**：每个请求 150~500ms 随机延迟，贴合真实网络体验。
- **鉴权**：请求拦截器附加 `Authorization: Bearer <token>`；mock 层按 token 解析当前用户，`requireUser` / `requireRole` 校验登录态与角色。
- **路由匹配**：`resolveMock` 支持 `:param` 路径参数；**静态路径须声明在参数化路径之前**（如 `/report/review-list` 在 `/report/:id` 之前），否则会被通配吞掉。
- **数据变更即时生效**：绑定设备、解除绑定、下单支付、审核报告、修改套餐价格、围栏增删改、社区点赞/关注等都会真实改动 `db.ts` 内存对象，刷新列表即可看到变化。

## 部署到 Cloudflare Pages

高德地图的 `VITE_AMAP_KEY` / `VITE_AMAP_JSCODE` 读取自 `.env.local`，但该文件被 `.gitignore` 忽略，**不会进入云端构建环境**——所以部署到 Cloudflare 后构建出来的包中 Key 为空，地图会提示「未配置高德地图 Key」。

解决分两步（缺一不可）：

1. **在 Cloudflare 配置构建环境变量**
   Cloudflare 控制台 → Workers & Pages → 本项目 → **Settings → Environment variables**，新增（Production，若用预览域名也加 Preview）：
   - `VITE_AMAP_KEY`
   - `VITE_AMAP_JSCODE`
   注意必须是**非加密**变量（加密变量仅在 Functions 运行时可用，不会注入构建过程），然后重新触发部署。Vite 构建时会自动把环境里的 `VITE_` 前缀变量内联进产物。

2. **把部署域名加入高德 Key 白名单**
   高德开放平台 → 控制台 → 应用管理 → 该「Web端(JS API)」Key → 设置 → 添加**域名白名单**，例如 `https://<你的项目>.pages.dev`（及自定义域名）。否则即使 Key 存在，也会提示「高德地图域名未授权」。

3. Cloudflare预览地址：https://pet-ai-5fs.pages.dev/

> 说明：Web 端 JS API 的 Key 本就会随前端代码公开，属正常现象；建议为生产环境单独申请一个 Key 并仅绑定部署域名。

## 验证情况

- [x] `pnpm type-check`（vue-tsc）零错误
- [x] `pnpm build` 生产构建通过
- [x] mock 层 80+ 接口运行时 smoke 测试全部通过（含绑定/下单/审核/改价/围栏/社区等变更链路）
- [x] 中英文词条 key 完全对齐（zh-CN / en-US 自动校验，无缺失/多余）
- [x] `pnpm dev` 正常启动：门户 → 三端登录 → 各端核心链路可走通；账号角色错配被拒、深链回跳、旧 `/login?role=` 兼容重定向均验证通过

> 说明：图表使用 ECharts 体积较大，构建时会有 chunk 大小提示，属正常现象，不影响功能。

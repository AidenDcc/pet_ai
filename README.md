# ShuxinPet · 宠物智能穿戴平台（前端 Demo）

以 **Pet-S1 宠物智能项圈**为硬件载体的一站式宠物健康守护平台前端演示工程：健康监测（心率 / 呼吸 / 血氧 / 体温 / 活动 / 睡眠）、实时定位、电子围栏、远程指令、健康报告、AI 分析、订阅计费，面向 **宠物主 / 宠物医生 / 平台运营** 三端角色。

> 无后端依赖：所有数据交互由前端内置的 **mock 层**（axios 自定义 adapter + 内存种子数据）模拟，延迟与响应包均按真实接口设计。登录、绑定设备、下单、审核报告等操作会真实改变内存数据。

## 技术栈

- Vue 3.5 + TypeScript + Vite + Vue Router + Pinia
- 用户端：**Vant 4**（宠物主 APP 样式，浏览器内手机外壳呈现，活力橙主题，限宽 402px）
- 医生端：**Vant 4**（移动端 H5，限宽 480px，保持青色）
- 运营端：**Element Plus**（桌面中后台，保持青色）
- ECharts 5（健康曲线、运营看板）、axios（mock adapter）、dayjs、sass
- unplugin-auto-import + unplugin-vue-components（按需引入）

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

## 演示账号（密码均为 `123456`）

| 角色 | 账号 | 说明 |
| ---- | ---- | ---- |
| 🐾 宠物主 | `user` | 林悦 · 13800000001，名下两只宠物（布丁/雪球） |
| 🩺 宠物医生 | `doctor` | 陈思远 · 安心宠物医院 |
| 📊 平台运营 | `admin` | 平台管理员 |

登录页提供三个演示账号卡片，点击即可一键填入并登录。登录态存于 `localStorage`（`sp_token` / `sp_role`）。

## 三端功能一览

### 🐾 用户端（宠物主 APP · 手机外壳 · 活力橙）
- **APP 体验**：浏览器中以手机外壳呈现（圆角机身 + 状态栏 + 灵动岛），登录页为 APP 风格，整体采用活力橙主色
- **首页**：宠物状态卡、今日活动环、四维生命体征、快捷入口
- **健康监测**：体温 / 心率 / 血氧 / 呼吸频率 四项生命体征曲线，7 天汇总
- **实时定位**：SVG 模拟地图 + 实时轨迹 + 电子围栏调节（300~2000m）+ 远程指令
- **设备管理**：绑定/解绑 Pet-S1、电量/固件/在线状态、远程指令（蜂鸣/亮灯/定位）
- **健康报告**：周期报告详情、AI 结论、异常项、医生意见
- **我的**：宠物档案编辑、订阅套餐与续费、角色切换

### 🩺 医生端（移动 H5）
- **工作台**：待审核报告、异常提醒概览
- **患者管理**：宠物患者列表（无限滚动）、档案弹层（设备/宠物主信息）
- **实时监测**：5 秒模拟采样的心率/血氧/体温/活动实时曲线
- **报告审核**：AI 报告待审列表，通过/驳回并填写意见
- **AI 智能分析**：深度健康分析报告、一键生成新分析

### 📊 运营端（桌面）
- **数据看板**：收入趋势、设备状态分布、套餐分布、设备激活等 4 张 ECharts 图表 + 统计卡片
- **设备/用户/宠物/医生/订单/订阅** 管理：分页、筛选、认证审核、价格调整（实时改内存数据）

## 项目结构

```
Pet AI/
├── index.html
├── package.json / vite.config.ts / tsconfig.json / pnpm-workspace.yaml
└── src/
    ├── main.ts                  # 挂载、样式、Element Plus icons 全局注册
    ├── styles/                  # CSS 变量主题（--sp-primary 品牌色）+ 重置 + 工具类
    ├── router/                  # 按角色分模块的路由表 + 登录/角色守卫
    ├── layouts/                 # MobileLayout（Vant 顶栏+Tabbar，服务用户/医生端）/ AdminLayout（侧边栏+顶栏，运营端）
    ├── views/
    │   ├── auth/Login.vue       # 三角色演示账号登录
    │   ├── user/                # 用户端（Vant H5）：home/health/location/device*/report*/me 等
    │   ├── doctor/              # 医生端：dashboard/patients/telemetry/reports/ai-analysis
    │   └── admin/               # 运营端：dashboard/devices/users/pets/vets/orders/subscriptions
    ├── components/              # MockMap（SVG 模拟地图）/ VitalChart（ECharts 曲线封装）/ PhoneShell（手机外壳）
    ├── api/
    │   ├── request.ts           # axios 实例 + mock adapter 分发 + 拦截器解包
    │   └── modules/             # auth/pet/device/health/report/order/admin 接口封装
    ├── mock/
    │   ├── db.ts                # 内存种子数据 + 变更方法（绑定/下单/审核真实生效）
    │   ├── helper.ts            # {code,data,message} 响应包、随机延迟、鉴权
    │   ├── index.ts             # 注册全部 mock handler
    │   └── modules/             # 与 api/modules 对应的 mock 实现
    ├── stores/                  # auth（token/role/user 持久化）
    ├── composables/             # useEchart（图表初始化/自适应销毁）
    ├── types/                   # 领域类型
    └── utils/                   # echarts 按需注册 / 时间数值格式化 / 枚举字典
```

## Mock 设计要点

- **统一响应包**：`{ code, data, message }`，`code === 0` 表示成功；`request.ts` 响应拦截器自动解包，页面拿到的是纯 `data`。
- **模拟延迟**：每个请求 150~500ms 随机延迟，贴合真实网络体验。
- **鉴权**：请求拦截器附加 `Authorization: Bearer <token>`；mock 层按 token 解析当前用户，`requireUser` / `requireRole` 校验登录态与角色。
- **路由匹配**：`resolveMock` 支持 `:param` 路径参数；**静态路径须声明在参数化路径之前**（如 `/report/review-list` 在 `/report/:id` 之前），否则会被通配吞掉。
- **数据变更即时生效**：绑定设备、解除绑定、下单支付、审核报告、修改套餐价格等都会真实改动 `db.ts` 内存对象，刷新列表即可看到变化。

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

> 说明：Web 端 JS API 的 Key 本就会随前端代码公开，属正常现象；建议为生产环境单独申请一个 Key 并仅绑定部署域名。

## 验证情况

- [x] `pnpm type-check`（vue-tsc）零错误
- [x] `pnpm build` 生产构建通过
- [x] mock 层 40+ 接口运行时 smoke 测试全部通过（含绑定/下单/审核/改价等变更链路）
- [x] `pnpm dev` 正常启动，登录 → 各端核心链路可走通

> 说明：图表使用 ECharts 体积较大，构建时会有 chunk 大小提示，属正常现象，不影响功能。

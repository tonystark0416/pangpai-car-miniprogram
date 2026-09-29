# 庞派租车小程序 · 需求与迭代追踪文档

> 本文件是该项目的「需求基线 + 变更记录」唯一追踪文档。
> **维护约定**：每一次迭代 / 功能变更 / Bug 修复完成后，必须在「十、变更记录（Change Log）」中追加一行，并在正文对应章节同步更新描述。未同步更新视为迭代未完成。

| 项 | 内容 |
| --- | --- |
| 文档创建时间 | 2026-09-10 |
| 当前代码基线 | v0.2（2026-09-10：下线并删除 AI 对话页） |
| 项目类型 | 微信小程序（原生，无框架/npm 依赖）+ 多端壳配置（iOS/Android mini-app） |
| 后端 | PHP 服务（域名 https://pangpai-car.com，部分接口走 car/route.php、car/staff/api.php 网关式入口） |
| 归属 | 庞派出行 · 租车业务 |

---

## 一、项目概述

### 1.1 产品简介
面向 C 端用户的汽车租赁小程序（品牌：庞派出行）。核心模式为 **"送车上门 / 上门收车"**，用户在线完成：
`选城市地址 → 选车型 → 选取还车时间与地点 → 实名认证(身份证识别) → 勾选保障与附加服务 → 在线支付 → 门店履约出车/收车`。

同时内置**员工端**页面（查询全部订单、变更订单状态、复制客户信息）。

### 1.2 角色与权限模型

| 角色 | 判定方式 | 当前实现状态 |
| --- | --- | --- |
| 游客（未授权手机号） | 无 openid/uid 授权记录 | 可浏览首页与车列表；结算前需注册手机号 |
| 注册用户 | 后端 userRegister 返回 id，存 globalData.userid 与 storage `uid` | 可下单、支付、查看/取消/退款订单 |
| 员工 | 原设计由后端 checkIsStaff 判定 | ⚠️ 前端校验代码已被注释，员工页无鉴权守卫（见 B-08） |

### 1.3 当前业务范围
- 支持城市：广州市 / 深圳市 / 佛山市（首页 `canCity` 硬编码）。
- 车辆列表由后端 `/getCarList` 提供（分页参数 `pageNum`，当前只取第 1 页）。
- 附加服务：基础保障（必选）与升级优享保障（可选）、司机服务（可选，8 小时/天）。
- 取送车：默认商家免费送车上门 / 上门收车。

---

## 二、页面清单与功能状态

全局页面注册于 `app.json`（8 个），tabBar 仅含 首页/订单 两项。

| # | 页面路由 | 页面名称 | 功能定位 | 实现状态 |
| --- | --- | --- | --- | --- |
| 1 | pages/index/index | 首页（tab） | Banner、取/还车时间选择（datetimepicker 组件）、取/还车地址选择（自动定位+手动选点）、推荐车辆列表、分享 | 基本完成，存在遗留代码与边界问题 |
| 2 | pages/checkOut/checkOut | 下单结算页 | 展示车与时间地点、保险两档、身份证上传/OCR 实名、联系电话、司机服务、费用明细、合同勾选、在线支付 | 基本完成，逻辑冗余/重复请求待治理 |
| 3 | pages/orderList/orderList | 我的订单（tab） | 未登录提示、登录用户订单列表、跳订单详情、（员工入口已注释） | 基本完成，状态/文案与详情页重复 |
| 4 | pages/orderDetail/orderDetail | 订单详情（用户） | 状态展示、费用明细、未支付可继续支付/取消、已支付可申请退款/联系客服 | 基本完成 |
| 5 | pages/login/login | 手机号登录 | 协议勾选 + 手机号一键登录（getPhoneNumber 动态令牌 → userRegister） | 完成，协议文案被注释 |
| 6 | pages/contract/contract | 租赁合同 | web-view 加载后端 H5 合同 | 壳页面 |
| 7 | pages/staff/staff | 员工订单查询 | 手机号搜索 + 分页订单列表（staff 网关接口） | 基本完成，⚠️ 无权限守卫、加载重复等 |
| 8 | pages/staffOrder/staffOrder | 员工订单详情 | 客户信息复制、确认出车、完成订单 | 基本完成 |

> 已下线页面：`pages/ai/ai`（AI 对话，v0.2 删除，详见变更记录）。

---

## 三、核心业务流程

### 3.1 登录链路（app 启动时自动静默登录）
```
App.onLaunch
  → wx.login 取 code
  → GET /getOpenid?code=  → openid（存 globalData.openid + storage openid）
    → GET /tryLogin {openid} → 若已注册返回 userid（存 globalData.userid + storage uid）
```
- 未注册用户由登录页 `getPhoneNumber`（动态令牌）走 `userRegister` 完成注册。
- 时序依赖：首页 onLoad 会检查 `app.checkLoginReadyCallback`（app.js 上挂的临时回调），登录完成才拉取车列表。⚠️ 见 B-01。

### 3.2 用户下单支付链路
```
首页(选时间/地点/车型) → checkOut 结算页(?carId=)
  → 拉取保险价/司机价/驾驶员信息 → checkout 实时计价
  → 勾选升级保障 / 司机服务 → 重新 checkout
  → 上传身份证 → OCR 回填姓名/号码/出生日期 → updateUserDriverInfo 落库
  → 填联系电话 → 勾选同意合同 → createOrder 创建订单
    → GET /getWxPay 统一下单 → wx.requestPayment
    → 支付成功/失败 → redirect 到 orderDetail（失败可在详情页重试支付）
```
⚠️ 时间/地点等关键参数通过 `app.globalData` 跨页传递（无缓存/无兜底），直进结算页或小程序被杀后重进会丢失，见 B-02。

### 3.3 员工履约链路
```
staff（查询列表）→ staffOrder（详情）
  → 状态 0 已支付 →「确认出车」→ 状态 1 租车中
  → 状态 1 租车中 →「已完成」→ 状态 4 已完成
```

### 3.4 订单状态机（前后端字段 order_status 约定，多页面重复展示）

| 值 | 语义 | 用户端可用操作 | 员工端可用操作 |
| --- | --- | --- | --- |
| -2 | 已取消 | - | - |
| -1 | 未支付（5 分钟后自动取消提示） | 继续支付 / 取消订单 | - |
| 0 | 已支付 | 申请退款 / 联系客服 | 确认出车 |
| 1 | 租车中 | - | 标记已完成 |
| 2 | 退款中 | - | - |
| 3 | 已退款 | - | - |
| 4 | 已完成 | - | - |

---

## 四、关键业务规则与费用口径

1. **计价请求**：结算页实时调用 `/checkout`，入参含 carId/uid/contact_phone/取还时间地点/insurancePrice/driver_price，返回各分项与合计。
2. **费用分项**（口径以接口返回为准，前端仅展示）：
   - 车辆租金（每日租金 × 天数，四舍五入）
   - 车辆整备/清洁费用（checkOut 展示为 clean_price；订单详情用户端未展示，员工端展示）
   - 基础服务费（含基础保障、三者险，按天累计）
   - 上门送车费 / 上门收车费（选择司机服务时不展示）
   - 司机人工费（可选，8 小时/天）
   - 优惠金额（历史功能，代码中已注释停用，字段 pms_* 保留）
3. **保险**：基础保障已选（车损 1500 内自付 / 三者 50 万）；升级优享可选（车损免赔 / 三者 100 万）。
4. **支付金额**：客户端以 `createOrder` 返回 `total_price × 100`（分）调 `/getWxPay`；服务端需自行校验金额（防篡改）。
5. **身份证实名**：`/upload` 上传图片 → `/getIdCardInfo` OCR 回填 → `/updateUserDriverInfo` 保存。
6. **分享/推广**：首页 onLoad 读取 `option.scene` 存入 `app.globalData.source`，随下单以 `extend` 字段提交（渠道来源追踪）。

---

## 五、前端视角接口清单

> ⚠️ 后端域名硬编码散落在各文件中（约 40+ 处），未做统一配置；同域内同时存在 REST 风格与 `route.php?service=` / `staff/api.php?service=` 网关风格，需治理（见 R-01）。

| 接口（方法） | 用途 | 使用位置 |
| --- | --- | --- |
| `/getOpenid?code=` (GET) | code 换 openid | app.js |
| `/tryLogin` (GET) | openid 静默登录取 userid | app.js |
| `car/route.php?service=userRegister` (POST) | 手机号动态令牌注册 | login.js |
| `/getCarList` | 分页车辆列表 | index.js |
| `/getDriverPrice` | 司机服务日价 | checkOut.js |
| `/getInsurancePrice` | 两档保险日价 | checkOut.js |
| `/getUserDriverInfo` | 获取已存驾驶员信息 | checkOut.js |
| `/updateUserDriverInfo` | 保存驾驶员信息 | checkOut.js |
| `/upload` (wx.uploadFile) | 上传身份证图片 | checkOut.js |
| `/getIdCardInfo` | OCR 识别身份证 | checkOut.js |
| `/checkout` | 实时计价 | checkOut.js |
| `/createOrder` (POST) | 创建订单 | checkOut.js |
| `/getWxPay` | 微信统一下单取支付参数 | utils/wxPay.js |
| `/getOrderList` | 用户订单列表 | orderList.js |
| `/getOrderDetail` | 用户订单详情 | orderDetail.js |
| `car/route.php?service=cancelOrder` | 取消订单 | orderDetail.js |
| `car/route.php?service=userRefundOrder` | 申请退款 | orderDetail.js |
| `car/staff/api.php?service=queryOrderListByStaff` (POST) | 员工订单列表/搜索 | staff.js |
| `car/staff/api.php?service=updateOrder` (POST) | 员工变更订单状态 | staffOrder.js |
| `car/route.php?service=getOrderDetail` | 员工端订单详情 | staffOrder.js |

> 已注释下线：`getMsgTemplate`（订阅消息模板）、`checkIsStaff`（员工校验）、`upload.php`（旧上传入口）。

---

## 六、全局状态与本地存储约定

`app.globalData`：

| 键 | 含义 | 写入方 | 读取方 |
| --- | --- | --- | --- |
| userInfo | 用户信息 | -（未使用） | - |
| userid | 用户 id | app.js / login.js | 各业务页 |
| openid | 微信 openid | app.js | login.js / wxPay |
| pickUpTime / returnTime | 取/还车时间戳 | index.js | checkOut.js |
| pickUpAddress / returnAddress | 取/还车地址 | index.js | checkOut.js |
| source | 分享/渠道来源 | index.js | checkOut.js（写 extend） |

`wx.setStorageSync`：`openid`、`uid`。

---

## 七、工程结构现状说明（供后续重构参考）

- 原生小程序：无框架、无 npm 依赖（`package.json` 为 `{}`）。
- `components/`：仅 `datetimepicker`（5 列日期时间选择器）。
- `utils/`：`http.js`（封装基本未用）、`util.js`、`date.js`、`filter.wxs`、`locate.js`（腾讯位置服务逆地址解析，key 硬编码）、`subscribe.js`（订阅消息，基本弃用）、`upload.js`（旧上传，未被引用）、`wxPay.js`（支付）、`qqmap-wx-jssdk1.2/`（腾讯地图 SDK）。
- 多端相关：`app.miniapp.json`、`project.miniapp.json`、`miniapp/android|ios`、`i18n/base.json`、`project.private.config.json`、`miniprogram_npm/fastestsmallesttextencoderdecoder`（未使用）、`.cloudbase/`（历史云开发残留）。
- 无 README、无 .gitignore（工程可见目录下未见）、无 docs（本文档为新增）。

---

## 八、已知问题与技术债 Backlog

> 编号规则：`B-xx` Bug/功能缺陷，`R-xx` 重构/工程质量，`N-xx` 交互与体验。状态：待处理 / 处理中 / 已处理（处理完成后在变更记录登记）。

### B 类（缺陷 / 风险）

| 编号 | 问题 | 影响 | 建议 |
| --- | --- | --- | --- |
| B-01 | 登录时序：首页依赖 `app.checkLoginReadyCallback`（app.js 临时全局回调）；`tryLogin` 失败无任何处理；多场景下可能不触发导致车列表不加载 | 首屏车列表偶发为空 | 抽公共登录态模块，提供 Promise 化登录就绪 + 失败重试 |
| B-02 | 取还车时间/地址仅存 globalData，无 storage 兜底；直接进入结算页/小程序被杀后数据丢失 | 用户关键操作数据丢失 | 转 storage 或路由参数持久化，缺失时引导回首页 |
| B-03 | 首页 `getNow('huanche')` 用 `nowDay+3` 字符串拼日期再 `new Date()` 解析，跨月/月末（如 3/30 +3 天）产出非法日期，iOS 解析更严格易得 NaN | 默认还车时间可能为 NaN | 用 `new Date(timestamp+3天)` 时间戳运算 |
| B-04 | datetimepicker：初始日列固定 31 天，未滚列直接确定到小月会得到非法日期；未限制"还车 > 取车"、未禁选过去时间 | 订单时间错误、可下"过去时间"单 | 组件内按年月联动初始列、加时间范围校验 |
| B-05 | checkOut 保险/司机切换在 if/else 后无条件再 `this.checkOut()`，true 分支会连发两次计价请求 | 重复请求/竞态 | 重构为统一变更后仅触发一次 |
| B-06 | 保险"升级优享"使用 radio + `bindtap`（且外层 radio-group bindchange 为空）；合同 checkbox 与文字未用 label 关联 | 交互不规范、易误触、可点区域小 | 用 checkbox/radio 标准事件与 label 包裹 |
| B-07 | 取消订单/申请退款无二次确认（wx.showModal）即直接请求 | 用户误操作不可逆 | 加确认弹窗，成功后刷新状态 |
| B-08 | 员工端无权限守卫：`checkIsStaff` 被注释，任何登录用户可直接进入 staff/staffOrder，且能改订单状态、看客户身份证手机号 | 严重越权/隐私风险 | 必须后端鉴权 + 前端守卫，并做数据脱敏 |
| B-09 | orderList：`isStaff` 恒 false（入口注释）、`noOrder` 逻辑语义颠倒（有单时置 true）；未登录直接访问该 tab 提示"请先登录"但无跳转处理 | 展示逻辑混乱 | 重构列表状态：loading/空/列表/未登录 |
| B-10 | staff 页 `getOrderListByStaff` 在 success 中同步 `this.data.page++` 并直接改 data 未用 setData（部分场景） | 页数与渲染不同步 | 数据变更统一 setData |
| B-11 | 支付金额由前端 `total_price*100` 上送 /getWxPay；若服务端不校验存在篡改风险 | 资损风险（依赖后端） | 服务端以订单为准重新计价，前端仅展示 |
| B-12 | checkOut `goPay` 无防重复提交；`createOrder` 成功后立即调支付，双击可能重复创建订单 | 重复下单 | 加提交锁、按钮 loading |
| B-13 | ~~AI 页残留 localhost 地址、他项目文案，无页面入口~~（v0.2 已整体下线删除该页，关闭） | - | - |
| B-14 | 首页 onLoad 直接读 `option.scene` 并 `decodeURIComponent`，非扫码场景下无 scene（另 `globalData.source` 未在 app.js 声明即赋值） | 潜在异常与约定混乱 | 判空 + app.js 补充声明 |
| B-15 | 时间默认"取车=now"、"还车=now+3 天"且不支持选择当天以外的精确时间等边界由组件决定；暂未发现后端时间戳校验 | 口径不一致风险 | 统一前后端时间精度（秒）与校验 |
| B-16 | 全局无统一 loading/错误处理；http.js 封装在页面中基本未使用（页面散落 30+ 处裸 wx.request） | 交互/错误不一致、无法统一埋点 | 见 R-02 |
| B-17 | login 页协议：radio 与文案分离、无《协议》链接跳转；agreement 判断恒真逻辑可疑（radioChange 恒设 true） | 协议同意无效化 | 用 checkbox/协议弹窗规范处理 |
| B-18 | staff/staffOrder/orderDetail 等页面 json 缺 navigationBarTitleText（部分显示默认路径标题） | 体验不一致 | 补全页面标题 |
| B-19 | `app.json requiredPrivateInfos` 声明了 `choosePoi` 但代码未使用；使用 `getFuzzyLocation` + `chooseLocation`，隐私描述 `scope.userLocation` 与 fuzzy 场景需对齐 | 审核/合规风险 | 核对真实使用项并同步隐私声明 |

### R 类（重构 / 工程质量）
| 编号 | 问题 | 建议 |
| --- | --- | --- |
| R-01 | API 域名硬编码 40+ 处、三种接口风格混用 | 建 `config/api.js` 域名/超时/环境配置；网关类接口统一封装映射 |
| R-02 | `utils/http.js` 未被采用；页面散落裸 wx.request 且无统一鉴权/错误/埋点 | 以 Promise 重构 request 层（成功态、错误态、loading、token）并替换页面 |
| R-03 | 订单状态文案/颜色在 orderDetail、orderList、staff、staffOrder 四页重复 | 抽公共 `order-status` 组件 或 wxs 映射 |
| R-04 | 大量注释遗留代码（首页 tab、优惠模块、checkIsStaff、订阅模板、司机校验等） | 清理前用 git 留档，一次性删除死代码 |
| R-05 | checkOut 身份证上传逻辑与 utils/upload.js 重复（后者已废弃） | 保留一处封装，删除另一份 |
| R-06 | 目录/命名：`filter.wxs.toFix` 注释"保留两位"实为取整；页面/组件注释与文件名不符等 | 统一命名与注释 |
| R-07 | 冗余空生命周期模板（login/contract 等大量空 onXxx + 注释） | 精简 |
| R-08 | `app.wxss` 仅注释、无全局样式基线；颜色主题（全黑导航/tabBar）无 token | 建设计变量/公共样式（考虑是否引入主题） |
| R-09 | 工程杂项：空 `package.json`/`package-lock`/空 `node_modules`、未使用 `miniprogram_npm`、`.cloudbase/` 历史残留、无 `.gitignore`/README | 清理、补充仓库规范与文档 |
| R-10 | 多端（miniapp ios/android、i18n）与微信小程序主链路边界不清 | 明确维护主工程为微信小程序，或梳理多端构建链路 |
| R-11 | 时间格式化函数散落 util.js / date.js / index.js / 组件内 | 收敛为单一时间工具 |
| R-12 | 腾讯位置服务 key 硬编码于 utils/locate.js | 收敛配置并按 key 权限最小化 |

### N 类（交互 / 体验）
| 编号 | 问题 | 建议 |
| --- | --- | --- |
| N-01 | 车辆列表无上拉加载、无骨架屏/加载态、无价格排序筛选；首页大 Banner + widthFix 图片体验粗糙 | 分页加载、加载占位、筛选排序、规范图片比例 |
| N-02 | 员工搜索：点击"搜索"后无 loading 与空态提示；输入即发起/需手动点搜索不一致 | 明确交互 + 状态反馈 |
| N-03 | 订单详情费用项用户端/员工端展示字段不一致（清洁费、优惠等） | 统一模板或明确各自口径 |
| N-04 | ~~AI 页头像等素材曾存 assets 目录，与 img 分工不清~~（v0.2 随 AI 页下线、assets 目录一并删除，关闭） | img 统一承载页面图片资源 |
| N-05 | 多处 toast 无 icon:'none' 时长默认，长文案可能截断 | 统一 toast/modal 规范 |

---

## 九、后续迭代优先级建议（Roadmap 草稿）

1. **P0（安全/合规，先行）**：B-08 员工权限守卫；B-19 隐私声明对齐；B-11 金额防篡改确认。
2. **P1（核心链路稳定）**：B-01~B-05、B-12（登录时序、时间边界、结算防重、globalData 兜底）。
3. **P2（工程质量）**：R-01/R-02 统一请求层与 API 配置 → 顺带清理 R-03~R-07。
4. **P3（体验迭代）**：N-01~N-05、首页改版、订阅消息/客服能力等，按产品规划推进。

---

## 十、变更记录（Change Log）

> 新增迭代时在此表格**顶部**插入一行。类型：新增 / 修改 / 修复 / 重构 / 文档 / 其他。

| 日期 | 版本 | 类型 | 模块 | 说明 | 关联条目 |
| --- | --- | --- | --- | --- | --- |
| 2026-09-10 | v0.2 | 删除 | AI 页 | 下线并删除 AI 对话页：移除 pages/ai 全部文件、app.json 页面注册、project.private.config.json 调试启动项；删除仅被其引用的 assets 头像与 utils/utf8decode.js | B-13、N-04 |
| 2026-09-10 | v0.1 | 文档 | - | 首次建档：完成项目全量盘点，输出代码结构与问题审查报告；本文档作为后续迭代追踪基线，尚未改动业务代码 | - |

# 庞派租车小程序 · 需求与迭代追踪文档

> 本文件是该项目的「需求基线 + 变更记录」唯一追踪文档。
> **维护约定**：每一次迭代 / 功能变更 / Bug 修复完成后，必须在「十、变更记录（Change Log）」中追加一行，并在正文对应章节同步更新描述。未同步更新视为迭代未完成。

| 项 | 内容 |
| --- | --- |
| 文档创建时间 | 2026-09-10 |
| 当前代码基线 | v1.10（2026-10-26：接入优惠券（首页派券/结算页用券/券页）；此前 v1.9 新增个人中心 tab 页、v1.8 登录注册改造 + 登录态守卫、v1.7 结算页对齐 v1.6.18 保险档位制、v1.6 订单列表接入 v1.6.17 筛选与分页、v1.5 对接 `/cancelOrder`、v1.4 对齐 v1.6.12 计价口径、v1.3 对接 `/cancelRefund`、v1.2 对齐 v1.6.8 接口、v1.1 iOS 风格改版、v1.0 员工端下线 + 统一请求层） |
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
| ~~员工~~ | ~~原设计由后端 checkIsStaff 判定~~ | v1.0 员工端已整体下线（pages/staff、pages/staffOrder 删除），员工操作迁移至独立业务后台 |

### 1.3 当前业务范围
- 支持城市：广州市 / 深圳市 / 佛山市（首页 `canCity` 硬编码）。
- 车辆列表由后端 `/getCarList` 提供（分页参数 `pageNum`，当前只取第 1 页）。
- 附加服务：基础保障（必选）与升级优享保障（可选）、司机服务（可选，8 小时/天）。
- 取送车：默认商家免费送车上门 / 上门收车。

---

## 二、页面清单与功能状态

全局页面注册于 `app.json`（7 个），tabBar 含 首页/订单/我的 三项。

**个人中心（v1.9 新增 `pages/center`）**：展示头像、昵称、绑定手机号，下方为「我的优惠券 / 联系客服 / 闲置车赚钱」三个入口。

| 展示项 | 数据来源 | 缺省兜底 |
| --- | --- | --- |
| 头像 | 登录接口返回的头像（`storage avatarUrl`） | **内置默认头像**（蓝色渐变圆 + 「车」字，纯 CSS 绘制，无图片资源依赖） |
| 昵称 | 登录接口返回的昵称（`storage nickname`） | **尊贵的车主** |
| 手机号 | 登录接口返回的手机号（`storage phone`） | **不展示该行**（未登录同样不展示） |

- 未登录时昵称区显示「未登录，点击登录」，点击走 `auth.goLogin` 并在登录后回到个人中心。
- 三个功能入口均为待开发能力，点击统一提示「xx开发中」。

**优惠券（v1.7.3）**：

| 环节 | 位置 | 说明 |
| --- | --- | --- |
| 首页派券 | `pages/index` 顶部券区 | 横向滚动券卡，`can_receive` 决定按钮可点，领取后刷新库存；入口「领券中心 ›」 |
| 结算页用券 | `pages/checkOut` 费用明细「优惠券」行 | 默认**不使用**任何券；点选后带 `couponSn` 重新 `/checkout`，展示 `discount_price` 与实付 `pay_amount` |
| 个人中心入口 | `pages/center` →「我的优惠券」 | 进入 `pages/coupon`（我的券包 / 领券中心 双 Tab） |

- **金额口径**：`total_price` = 原价，`discount_price` = 抵扣，**`pay_amount` = 实付**，支付与展示一律用 `pay_amount`（无券时两者相等）。
- **每单限一张券**；**订单金额必须大于券面额**才可用（券包按 `usable` 置灰并展示 `unusable_reason`）；带券结算被拒时前端提示 `msg` 并自动去掉券重新计价。
- **下单前强校验联系人手机号**（`^1[3-9]\d{9}$`），未填或格式错误直接拦截，不再等后端 `400`。

**订单列表筛选（v1.6.17 新增）**：订单页顶部为状态 Tab，切换时由**后端 SQL 层全局筛选**，前端仅按文档建议传参：

| Tab | 传参 |
| --- | --- |
| 全部 | 不传（行为与旧版一致） |
| 待支付 | `pay_status=0` |
| 进行中 | `pay_status=1&order_status=0,1` |
| 已完成 | `order_status=2,3` |
| 已取消/退款 | `order_status=4` |

列表同时消费新增的 `total`/`page`/`pageSize` 实现**上拉加载更多**（`onReachBottom`），并对旧后端缺失这些字段的情况做了兜底（按返回条数判断末页）。

| # | 页面路由 | 页面名称 | 功能定位 | 实现状态 |
| --- | --- | --- | --- | --- |
| 1 | pages/index/index | 首页（tab） | Banner、取/还车时间选择（datetimepicker 组件）、取/还车地址选择（自动定位+手动选点）、推荐车辆列表、分享 | 基本完成，存在遗留代码与边界问题 |
| 2 | pages/checkOut/checkOut | 下单结算页 | 展示车与时间地点、保险两档、身份证上传/OCR 实名、联系电话、司机服务、费用明细、合同勾选、在线支付 | 基本完成，逻辑冗余/重复请求待治理 |
| 3 | pages/orderList/orderList | 我的订单（tab） | 未登录提示、登录用户订单列表、跳订单详情、（员工入口已注释） | 基本完成，状态/文案与详情页重复 |
| 4 | pages/orderDetail/orderDetail | 订单详情（用户） | 状态展示、费用明细、未支付可继续支付/取消、已支付可申请退款/联系客服 | 基本完成 |
| 5 | pages/login/login | 手机号登录 | 协议勾选 + 手机号一键登录（getPhoneNumber 动态令牌 → userRegister） | 完成，协议文案被注释 |
| 6 | pages/contract/contract | 租赁合同 | web-view 加载后端 H5 合同 | 壳页面 |

> 已下线页面：`pages/ai/ai`（AI 对话，v0.2 删除）；`pages/staff`、`pages/staffOrder`（员工端，v1.0 整体删除，业务迁移至独立后台）。

---

## 三、核心业务流程

### 3.1 登录链路（app 启动时静默「查」登录态，v1.7.0 起不再自动建号）
```
App.onLaunch
  → 先回填本地缓存 uid / openid（避免页面 onShow 早于请求完成时误判未登录）
  → wx.login 取 code → GET /getOpenid?code= → openid + unionid（存 globalData + storage）
    → GET /tryLogin {openid, unionid}
        ├─ 200 已注册 → result.id = uid（存 globalData.userid + storage uid），老用户无感知
        └─ 202 needRegister:true → 该微信尚无账号，保持未登录态，由业务入口引导注册
未注册用户：登录页 <button open-type="getPhoneNumber">
  → e.detail.code（一次性动态令牌）
  → GET /loginByPhone {code, openid, unionid} → 200 result.id = uid（建号/登录合一并绑定 openid）
```
- 时序依赖：首页 onLoad 会检查 `app.checkLoginReadyCallback`（app.js 上挂的临时回调），登录完成才拉取车列表。⚠️ 见 B-01。

**登录态守卫（v1.7.0 新增 `utils/auth.js`）**：以 `uid` 为唯一登录态标识，提供 `isLogin()` / `ensureLogin(redirect, content)` / `goLogin(redirect)` / `backAfterLogin(redirect)` / `ensureOpenid()`。

- 未登录访问受保护入口时**弹窗明确告知**「完成租车业务需要先登录」，确认后跳登录页；
- 入口携带 `redirect`（URI 编码），登录成功后**自动回到原页面继续原操作**（tabBar 页 `switchTab`、普通页 `redirectTo`）；
- `getUid()` 在 `globalData` 未就绪时回退读 storage 并回填，规避启动时序竞态。

**需强校验登录态的入口**：

| 入口 | 位置 | 未登录行为 |
| --- | --- | --- |
| 点击汽车卡片进结算页 | `index.js clickItem` | 弹窗 → 登录 → 登录后直达该车辆的 `/checkOut?carId=` |
| 点击订单 tab 进订单列表 | `orderList.js onShow` | 弹窗 → 登录 → 登录后回到订单列表 |

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

### 3.3 员工履约链路（v1.0 已下线，迁移至独立业务后台）
```
staff（查询列表）→ staffOrder（详情）
  → 状态 0 已支付 →「确认出车」→ 状态 1 租车中
  → 状态 1 租车中 →「已完成」→ 状态 4 已完成
```

### 3.4 订单状态机（v1.2 对齐后端 v1.6.8 枚举）

> ⚠️ **枚举已变更**：v1.2 起废弃旧枚举（-2 已取消 / -1 未支付 / 0 已支付 / 1 租车中 / 2 退款中 / 3 已退款 / 4 已完成），改为 **双字段**：`pay_status`（支付状态）+ `order_status`（履约状态）。前端统一走 `utils/orderStatus.js` 的 `getOrderStatus()` 映射，页面不再写死数值。

**pay_status（支付状态）**

| 值 | 语义 | 用户端可用操作 |
| --- | --- | --- |
| 0 | 待支付（5 分钟后自动取消提示） | 继续支付 / 取消订单（二次确认） |
| 1 | 已支付 | 见下方履约状态 |
| 2 | 已退款 | - |
| 3 | 支付失败 | 继续支付 / 取消订单 |

**order_status（履约状态）**

| 值 | 语义 | 用户端可用操作 |
| --- | --- | --- |
| 0 | 待取车 | 申请退款（二次确认）/ 联系客服 |
| 1 | 已取车（租车中） | - |
| 2 | 已还车 | - |
| 3 | 已完成 | - |
| 4 | 已取消 | - |

**前端展示优先级**：已退款 > 已取消 > 待支付/支付失败 > 按履约状态展示（待取车/已取车/已还车/已完成）。

**自助取消/退款约束（v1.6.11 后端强校验）**：

| 场景 | 条件 | 前端入口 | 接口 |
| --- | --- | --- | --- |
| 未支付，仅取消 | `pay_status=0` + `order_status=0` | 发起支付、**取消订单** | `POST /cancelOrder`（不涉及资金） |
| 支付失败 | `pay_status=3` | 仅发起支付（后端未开放取消） | - |
| 已支付未取车，取消并退款 | `pay_status=1` + `order_status=0` | 取消订单并退款 | `POST /cancelRefund`（调微信退款） |
| 已取车及之后 | `order_status≥1` | 仅联系客服（后端拒绝自助取消/退款） | - |

> **两个取消接口按支付状态严格分流，不可混用**：未支付 → `/cancelOrder`；已支付 → `/cancelRefund`。
> 两者入口均由 `utils/orderStatus.js` 的 `canCancel` / `canCancelRefund` 驱动，**列表页与详情页均可直接操作**（列表页 `catch:tap` 阻止冒泡进详情）。

> 退款成功后订单自动变为 **已退款（`pay_status=2`）+ 已取消（`order_status=4`）**，前端以服务端返回为准重新拉取详情；退款金额默认全额。

---

## 四、关键业务规则与费用口径

1. **计价请求**：结算页实时调用 `/checkout`，入参含 carId/uid/contact_phone/取还时间地点/insurancePrice/driver_price，返回各分项与合计。
   - **v1.6.12 计算口径**：租用天数 = 时长 ÷ 24 小时**向上取整且至少 1 天**（`rentDay` 为整数，如相差 25 小时 = 2 天、相差 23 小时 = 1 天）；此前为按小时比例的小数，前端展示已同步为整数。
   - **v1.6.12 金额来源**：金额由服务端按车辆实时价**重算**，与前端传参无关；`driver_price`（白名单 `0/400`）仅作为选项输入并校验。
   - **v1.6.18 保险改档位制**：入参改为 `insuranceLevel`（`l1` 低档 / `l2` 高档，缺省 l1），**保险必买、取消「不买保险」**；保险金额**按车辆配置**（后台车辆管理），由 `/getCarFee` 或 `/getInsurancePrice?carId=` 返回，**前端不得写死金额**（旧全局值 1/120 已废弃）。响应新增 `insurance_level`，需整包回传给 `/createOrder`。
   - **v1.6.18 整备费**：`clean_price` 按车辆配置（默认 50），**按订单一次性收取、不乘天数**，不再是固定 1。
   - **v1.6.18 计价公式**：总费用 = 日租金×天数 + 保险日单价×天数 + 司机日单价×天数 + 整备费。
   - **v1.6.12 新增失败码**：`400` 还车时间必须晚于取车时间 / 取车·还车时间不合法 / 保险金额不合法 / 司机费用不合法 / 车辆不存在无法结算；均按 `res.msg` 提示用户。前端已加「还车晚于取车」前置拦截。
2. **费用分项**（口径以接口返回为准，前端仅展示）：
   - 车辆租金（每日租金 × 天数，四舍五入）
   - 车辆整备/清洁费用（checkOut 展示为 clean_price；订单详情用户端未展示，员工端展示）
   - 基础服务费（含基础保障、三者险，按天累计）
   - 上门送车费 / 上门收车费（选择司机服务时不展示）
   - 司机人工费（可选，8 小时/天）
   - 优惠金额（历史功能，代码中已注释停用，字段 pms_* 保留）
3. **保险（v1.6.18 必买）**：低档 `l1` 基础保障（车损 1500 内自付 / 三者 50 万）；高档 `l2` 升级优享（车损全额免赔 / 三者 100 万）。**两者二选一，已取消「不买保险」**；金额按车辆配置，取 `/getCarFee`（或 `/getInsurancePrice?carId=`）返回值展示。
4. **支付金额**：`/getWxPay` 的 `totalFee` 单位为**分**（后端文档 v1.6.11 更正：此前文档误写为元，代码与支付回调核验口径一直是分），前端上送 `total_price × 100`；支付回调会核验 `total_fee === total_price×100`，不等则支付不落库（防篡改，见 B-11）。
5. **身份证实名**：`/upload` 上传图片 → `/getIdCardInfo` OCR 回填 → `/updateUserDriverInfo` 保存。
6. **分享/推广**：首页 onLoad 读取 `option.scene` 存入 `app.globalData.source`，随下单以 `extend` 字段提交（渠道来源追踪）。

---

## 五、前端视角接口清单

> ~~⚠️ 后端域名硬编码散落在各文件中（约 40+ 处），未做统一配置~~（v0.7 已收敛至 `utils/config.js` 的 BASE_URL，全小程序唯一域名入口；接口风格混用问题仍在，见 R-01）。

| 接口（方法） | 用途 | 使用位置 |
| --- | --- | --- |
| `/getOpenid?code=` (GET) | code 换 openid（顺带取 `unionid`） | app.js / utils/auth.js |
| `/tryLogin` (GET) | openid 登录（**v1.7.0 起只查不注册**：200 已注册返回 uid；**202 `needRegister:true` = 该微信尚无账号**，需走手机号注册） | app.js |
| `/loginByPhone` (GET) | **手机号注册/登录合一**（v1.7.0 新增，入参 `code`+`openid`+`unionid`；已注册则登录、未注册则建号并绑定 openid） | login.js |
| `/bindPhone` (GET) | 老用户补填手机号（v1.7.0 新增，`uid`+`code`；**前端暂未接入**，老用户换设备找回账号时使用） | - |
| `/getCarList` | 分页车辆列表（`pageNum` 从 1 开始；v1.6.7 起后端按 `sort` 排序且只返回上架车，前端不二次排序） | index.js |
| `/getDriverPrice` | 司机服务日价 | checkOut.js |
| `/getInsurancePrice` | 两档保险日价（v1.6.18 起按车辆配置，需传 `carId`） | checkOut.js |
| `/getCouponList` | **可领取券批次**（v1.7.3 新增，入参 `uid`；`can_receive` 已综合库存与限领） | index.js / coupon.js |
| `/receiveCoupon` (POST) | **领券**（v1.7.3 新增，body `{uid, couponId}`；原子扣库存 + 限领校验，返回唯一券码 `coupon_sn`） | index.js / coupon.js |
| `/getUserCoupons` | **我的券包**（v1.7.3 新增，入参 `uid` + 可选 `carId`/`amount`；返回 `usable` 与 `unusable_reason`） | checkOut.js / coupon.js |
| `/getUserDriverInfo` | 获取已存驾驶员信息 | checkOut.js |
| `/updateUserDriverInfo` | 保存驾驶员信息 | checkOut.js |
| `/upload` (wx.uploadFile) | 上传身份证图片 | checkOut.js |
| `/getIdCardInfo` | OCR 识别身份证 | checkOut.js |
| `/checkout` | 实时计价（v1.6.12：天数按 24h 向上取整、金额服务端重算；新增 4 类 400 校验错误；**v1.7.3：可选 `couponSn`，返回 `discount_price` 与实付 `pay_amount`**） | checkOut.js |
| `/createOrder` (POST) | 创建订单（v1.6.8 车辆下架/不存在、v1.6.12 时间非法/保险或司机金额不合法均返回 `400 {code,msg}`；**金额以服务端重算的 `result.total_price` 为准**，勿用本地计算值支付） | checkOut.js |
| `/getWxPay` | 微信统一下单取支付参数（`totalFee` 单位元；失败 `{success:false,message}`） | utils/wxPay.js |
| `/queryWxPayOrder` | 查询支付结果（v1.2 新增接入，替代原 2 秒盲等） | checkOut.js / orderDetail.js |
| `/getOrderList` | 用户订单列表（`pageNumber` 从 1 开始；空数据 `code:201`；**v1.6.17 新增可选筛选** `pay_status`/`order_status`（逗号多值）与响应字段 `total`/`page`/`pageSize`） | orderList.js |
| `/getOrderDetail` | 用户订单详情（时间字段后端已格式化；空数据 `code:201`） | orderDetail.js |
| `/cancelRefund` (POST) | **已支付订单取消并退款**（v1.6.11 新增，入参 `{orderSn, uid}`；仅 `pay_status=1` + `order_status=0` 可用，成功后订单变已退款+已取消） | orderDetail.js |
| `/cancelOrder` (POST) | **未支付订单取消**（v1.6.16 新增，入参 `{orderSn, uid}`；仅 `pay_status=0` + `order_status=0` 可用，仅置 `order_status=4`、**不涉及资金**） | orderDetail.js / orderList.js |
| ~~`/applyRefund` (POST)~~ | ~~申请退款~~（v1.6.11 **后端已删除，现返回 404**；其为微信退款裸透传、不更新订单状态，已由 `/cancelRefund` 取代） | - |

> 响应结构不统一（历史遗留，后端已确认）：`{code:200,result}` / `{message,result}` / `{success,data}` / 裸对象或裸数字，需按接口逐一判断。
> 已注释下线：`getMsgTemplate`（订阅消息模板）、`checkIsStaff`（员工校验）、`upload.php`（旧上传入口）。
> v1.0 随员工端整体下线：`queryOrderListByStaff`、`updateOrder`、员工端 `getOrderDetail`。
> v1.3 随旧网关下线删除：`car/route.php?service=cancelOrder`（未支付订单取消，后端暂无替代接口，前端入口一并移除，见 B-22）。
> v1.8 随登录改造删除：旧网关最后一项 `car/route.php?service=userRegister`（手机号注册）已由 `GET /loginByPhone` 取代，**旧网关至此全部下线**。
> v1.0 起全部请求经 `utils/request.js` 统一请求层发起（R-02）。
> v1.2 依据后端《小程序端接口文档》v1.6.8（2026-10-17）核对更新。

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
- `utils/`：`config.js`（BASE_URL 唯一域名入口）、`request.js`（v1.0 统一请求层：Promise 化 wx.request/wx.uploadFile）、`util.js`、`filter.wxs`、`locate.js`（腾讯位置服务逆地址解析，key 硬编码）、`wxPay.js`（支付）、`qqmap-wx-jssdk1.2/`（腾讯地图 SDK）。
- v1.0 已删除死文件：`http.js`（被 request.js 取代）、`upload.js`（与 checkOut 内实现重复）、`subscribe.js`（订阅消息弃用）、`date.js`（无引用）。
- 多端相关：`app.miniapp.json`、`project.miniapp.json`、`miniapp/android|ios`、`i18n/base.json`、`project.private.config.json`、`miniprogram_npm/fastestsmallesttextencoderdecoder`（未使用）、`.cloudbase/`（历史云开发残留）。
- 无 README（工程可见目录下未见）；~~无 .gitignore~~（建仓时已补充，v0.10 核对更正）；docs 已有（本文档）。

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
| B-05 | ~~checkOut 保险/司机切换在 if/else 后无条件再 `this.checkOut()`，true 分支会连发两次计价请求~~（v1.0 已修复，切换仅触发一次计价） | ~~重复请求/竞态~~ | ~~重构为统一变更后仅触发一次~~ |
| B-06 | 保险"升级优享"使用 radio + `bindtap`（且外层 radio-group bindchange 为空）；合同 checkbox 与文字未用 label 关联 | 交互不规范、易误触、可点区域小 | 用 checkbox/radio 标准事件与 label 包裹 |
| B-07 | ~~取消订单/申请退款无二次确认（wx.showModal）即直接请求~~（v1.0 已加确认弹窗） | ~~用户误操作不可逆~~ | ~~加确认弹窗，成功后刷新状态~~ |
| B-08 | ~~员工端无权限守卫~~（v1.0 员工端（staff/staffOrder 两页）整体下线删除，员工操作迁移至独立业务后台，小程序内不再存在越权面） | - | - |
| B-09 | orderList：~~`isStaff` 恒 false（入口注释）~~（v1.0 已随员工端删除）；`noOrder` 逻辑语义颠倒（有单时置 true）；未登录直接访问该 tab 提示"请先登录"但无跳转处理 | 展示逻辑混乱 | 重构列表状态：loading/空/列表/未登录 |
| B-10 | ~~staff 页 `getOrderListByStaff` 在 success 中同步 `this.data.page++` 并直接改 data 未用 setData（部分场景）~~（v1.0 已随员工端删除） | - | - |
| B-11 | ~~支付金额单位不一致~~（v1.3 定稿：`/getWxPay.totalFee` 单位为**分**，前端上送 `total_price × 100`；后端支付回调已核验 `total_fee === total_price×100`，不等则支付不落库） | - | - |
| B-12 | checkOut `goPay` 无防重复提交；`createOrder` 成功后立即调支付，双击可能重复创建订单 | 重复下单 | 加提交锁、按钮 loading |
| B-13 | ~~AI 页残留 localhost 地址、他项目文案，无页面入口~~（v0.2 已整体下线删除该页，关闭） | - | - |
| B-14 | 首页 onLoad 直接读 `option.scene` 并 `decodeURIComponent`，非扫码场景下无 scene（~~`globalData.source` 未在 app.js 声明即赋值~~ v1.0 已补声明） | 潜在异常与约定混乱 | scene 判空仍待处理 |
| B-15 | 时间默认"取车=now"、"还车=now+3 天"且不支持选择当天以外的精确时间等边界由组件决定；暂未发现后端时间戳校验 | 口径不一致风险 | 统一前后端时间精度（秒）与校验 |
| B-16 | ~~全局无统一 loading/错误处理；http.js 封装在页面中基本未使用（页面散落 30+ 处裸 wx.request）~~（v1.0 统一请求层 `utils/request.js` 落地并全量替换，见 R-02） | - | - |
| B-17 | ~~login 页协议：radio 与文案分离、无《协议》链接跳转；agreement 判断恒真逻辑可疑（radioChange 恒设 true）~~（v1.1 已修复：改为 checkbox-group 真实开关 agreementChange，恢复协议文案显示） | ~~协议同意无效化~~ | ~~用 checkbox/协议弹窗规范处理~~ |
| B-18 | staff/staffOrder/orderDetail 等页面 json 缺 navigationBarTitleText（部分显示默认路径标题） | 体验不一致 | 补全页面标题 |
| B-19 | `app.json requiredPrivateInfos` 声明了 `choosePoi` 但代码未使用（v0.9 已移除该项）；使用 `getFuzzyLocation` + `chooseLocation`，隐私描述 `scope.userLocation` 与 fuzzy 场景需对齐 | 审核/合规风险 | 核对真实使用项并同步隐私声明 |
| B-20 | ~~前端订单状态枚举（-2/-1/0/1/2/3/4）与后端 v1.6.8 新枚举（pay_status + order_status 双字段）不一致，导致状态显示错误、支付/取消/退款按钮条件失效~~（v1.2 已全量对齐，新增 `utils/orderStatus.js` 统一映射） | - | - |
| B-21 | ~~支付后依赖固定 2 秒等待判断结果 / 下单失败未处理 400 响应 / OCR 成功响应不含 errcode 被误判失败 / getUserDriverInfo 返回裸 -1 被当作有效记录~~（v1.2 已修复：接入 `/queryWxPayOrder` 真实查询、createOrder 先判 code 400/500、OCR 判定改为 errcode 缺失即成功、驾驶证查询按对象判断） | - | - |
| B-22 | ~~未支付订单暂不支持取消：旧网关 `car/route.php?service=cancelOrder` 已下线，后端暂无替代接口~~（**v1.5 已解决**：后端 v1.6.16 提供 `POST /cancelOrder`，前端已接入，订单列表与详情页均支持取消未支付订单） | - | - |
| B-23 | **支付失败（`pay_status=3`）的订单无任何自助操作**：后端 `/cancelOrder` 仅受理 `pay_status=0`，`/cancelRefund` 仅受理已支付，支付失败订单既不能取消也不能退款 | 用户只能重新支付，路径卡死时也求助客服 | 向后端确认是否放开 `pay_status=3` 的取消，或提供兜底处理 |

### R 类（重构 / 工程质量）
| 编号 | 问题 | 建议 |
| --- | --- | --- |
| R-01 | ~~API 域名硬编码 40+ 处~~（v0.7 已收敛至 `utils/config.js` BASE_URL）；三种接口风格混用仍待治理 | ~~建 `config/api.js` 域名/超时/环境配置~~（已完成域名部分）；网关类接口统一封装映射 |
| R-02 | ~~`utils/http.js` 未被采用；页面散落裸 wx.request 且无统一鉴权/错误/埋点~~（v1.0 已落地 `utils/request.js` 统一请求层：Promise 化、统一 BASE_URL 拼接、可选 loading、网络失败统一提示并 reject；全部页面/工具已替换完成） | - | - |
| R-03 | ~~订单状态文案/颜色在 orderDetail、orderList 两页重复~~（v1.2 已抽公共映射 `utils/orderStatus.js`：统一输出状态文案、语义色 class 与可执行操作，两页不再写死枚举） | - | - |
| R-04 | ~~大量注释遗留代码（首页 tab、优惠模块、checkIsStaff、订阅模板、司机校验等）~~（v1.0 已清理：删除 http/upload/subscribe/date 死文件及各页注释死代码） | - | - |
| R-05 | ~~checkOut 身份证上传逻辑与 utils/upload.js 重复（后者已废弃）~~（v1.0 已删除 utils/upload.js，上传统一走 request.js 的 uploadFile） | - | - |
| R-06 | 目录/命名：`filter.wxs.toFix` 注释"保留两位"实为取整；页面/组件注释与文件名不符等 | 统一命名与注释 |
| R-07 | 冗余空生命周期模板（~~login/orderList/orderDetail~~ v1.0 重写时已精简；contract/checkOut/index 仍有） | 精简 |
| R-08 | ~~`app.wxss` 仅注释、无全局样式基线；颜色主题（全黑导航/tabBar）无 token~~（v1.1 已落地 iOS 风格设计变量体系 `--pp-*` 与全局卡片/按钮基线，全量改版为浅色苹果风格） | - | - |
| R-09 | 工程杂项：空 `package.json`/`package-lock`/空 `node_modules`、未使用 `miniprogram_npm`、`.cloudbase/` 历史残留、~~无 `.gitignore`~~（已补）、无 README（~~死文件清理~~ v1.0 已完成：http/upload/subscribe/date/staff_search.png） | 清理、补充仓库规范与文档 |
| R-10 | 多端（miniapp ios/android、i18n）与微信小程序主链路边界不清 | 明确维护主工程为微信小程序，或梳理多端构建链路 |
| R-11 | 时间格式化函数散落 util.js / date.js / index.js / 组件内 | 收敛为单一时间工具 |
| R-12 | 腾讯位置服务 key 硬编码于 utils/locate.js | 收敛配置并按 key 权限最小化 |

### N 类（交互 / 体验）
| 编号 | 问题 | 建议 |
| --- | --- | --- |
| N-01 | 车辆列表无上拉加载、无骨架屏/加载态、无价格排序筛选；首页大 Banner + widthFix 图片体验粗糙 | 分页加载、加载占位、筛选排序、规范图片比例 |
| N-02 | ~~员工搜索：点击"搜索"后无 loading 与空态提示；输入即发起/需手动点搜索不一致~~（v1.0 已随员工端删除） | - | - |
| N-03 | 订单详情费用项用户端/员工端展示字段不一致（清洁费、优惠等） | 统一模板或明确各自口径 |
| N-04 | ~~AI 页头像等素材曾存 assets 目录，与 img 分工不清~~（v0.2 随 AI 页下线、assets 目录一并删除，关闭） | img 统一承载页面图片资源 |
| N-05 | 多处 toast 无 icon:'none' 时长默认，长文案可能截断 | 统一 toast/modal 规范 |

---

## 九、后续迭代优先级建议（Roadmap 草稿，v1.0 更新）

1. **P0（安全/合规，先行）**：~~B-08 员工权限守卫~~（v1.0 员工端下线已消除）；B-19 隐私声明对齐（公众平台后台操作）；B-11 服务端金额校验确认 + **B-22 取消订单接口路径确认**（均需后端）。
2. **P1（核心链路稳定）**：B-01/B-02/B-03/B-04、~~B-05/B-12~~（v1.0 已修）——登录时序 Promise 化收尾、下单参数 storage 兜底、时间边界。
3. **P2（工程质量）**：R-03 订单状态组件（两页范围）；R-06/R-07/R-08 命名注释/空模板/样式基线；R-09 工程杂项清理（空 package.json、miniapp 多端壳）。
4. **P3（体验迭代）**：N-01/N-03/N-05、首页改版、订阅消息/客服能力等，按产品规划推进。

---

## 十、变更记录（Change Log）

> 新增迭代时在此表格**顶部**插入一行。类型：新增 / 修改 / 修复 / 重构 / 文档 / 其他。

| 日期 | 版本 | 类型 | 模块 | 说明 | 关联条目 |
| --- | --- | --- | --- | --- | --- |
| 2026-10-26 | v1.10 | 新增 | 优惠券（v1.7.3） | 依据后端接口文档 v1.7.3 接入优惠券：1) **首页派券**——首页顶部新增横向滚动券区（`GET /getCouponList`），按 `can_receive` 控制按钮可点，点「领取」调 `POST /receiveCoupon` 并刷新库存，右上角「领券中心 ›」进券页；2) **新增 `pages/coupon` 优惠券页**——「我的券包 / 领券中心」双 Tab，券包按 `usable` 置灰并展示 `unusable_reason`，领券中心可一键领取；结算页打开时为**选券模式**（`?select=1&carId=&amount=`），点选可用券通过 `eventChannel` 回传券码；3) **结算页用券**——费用明细新增「优惠券」行显示可用张数/已抵扣额，选中后带 `couponSn` 重新 `/checkout`，展示 `discount_price` 与实付 `pay_amount`；**默认不使用券**（服务端不会自动选券），带券结算被拒时提示 `msg` 并自动去掉券重新计价刷新券包；4) **支付金额改用 `pay_amount`**（结算页与订单详情二次支付均改，服务端会校验 `totalFee === pay_amount×100`），订单详情用券时展示优惠券行与实付金额；5) **下单前强校验联系人手机号**（`^1[3-9]\d{9}$`，未填/格式错直接拦截，不再等后端 `400`）；6) 个人中心「我的优惠券」入口跳转券页（未登录先引导登录） | - |
| 2026-10-25 | v1.9 | 新增 | 个人中心（tabBar 第三项） | 新增 `pages/center` 个人中心并加入 tabBar：1) 头部展示头像/昵称/手机号，缺省兜底——**默认头像为纯 CSS 绘制的蓝色渐变圆 + 「车」字**（无图片资源依赖），昵称默认「尊贵的车主」，**手机号缺失或未登录时不展示该行**；2) 登录页成功回调中持久化 `phone`/`nickname`/`avatarUrl` 到 storage，供个人中心读取；3) 下方「我的优惠券 / 联系客服 / 闲置车赚钱」三个入口，点击统一提示开发中；4) 未登录时点击头像区走 `auth.goLogin('/pages/center/center')`，登录后回到个人中心；5) tabBar 图标 `img/mine_sel.png`（灰 #8E8E93）/ `img/mine_seled.png`（蓝 #007AFF）：人形线性圆头图标，PIL 程序化绘制（生成脚本 `scripts/gen_mine_icon.py`），200×200、&lt;10KB，与现有首页/订单图标同风格 | - |
| 2026-10-25 | v1.8 | 重构 | 登录注册与登录态守卫 | 依据后端接口文档 v1.7.0 重做登录链路：1) **`/tryLogin` 不再自动建号**，未注册返回 `202 needRegister:true`，app.js 保持未登录态（老用户已绑定的不受影响）；2) 登录页改用新接口 **`GET /loginByPhone`**（`code`+`openid`+`unionid`）替代旧网关 `car/route.php?service=userRegister`，**旧网关至此全部下线**；失败按 `res.msg` 提示（40029 需重新授权 / 已绑定其他账号联系客服 / 500 重试），并加防重复提交；3) 新增 **`utils/auth.js` 登录态守卫**：`isLogin`/`ensureLogin`/`goLogin`/`backAfterLogin`/`ensureOpenid`，以 uid 为唯一标识且 globalData 未就绪时回退 storage 并回填；4) **两个入口强校验登录态**——点击汽车卡片（未登录弹窗 → 登录后直达 `/checkOut?carId=`）、点击订单 tab（未登录弹窗 → 登录后回到订单列表）；5) 登录页支持 `redirect` 参数，登录成功后**回到原页面继续原操作**（tabBar 页 switchTab、普通页 redirectTo）；6) app.js 启动时先回填缓存 uid/openid，规避启动时序竞态 | B-01（部分）、B-09（部分） |
| 2026-10-25 | v1.7 | 对齐 | 结算计价（v1.6.18） | 依据后端接口文档 v1.6.18 对接保险档位制改造：1) `/checkout` 入参由金额 `insurancePrice` 改为**档位 `insuranceLevel`**（`l1` 低档 / `l2` 高档，缺省 l1），实际金额由服务端按**车辆配置**重算；2) **保险必买**：结算页「基础保障」与「升级优享」改为真正二选一（标题标注「必选」），取消不可选的 disabled 写法；3) 接入新接口 `GET /getCarFee?carId=` 一次取**整备费 + 两档保险日单价**（替代原来无参的 `/getInsurancePrice`），失败时回退 `/getInsurancePrice?carId=`；4) 保险金额、整备费**全部取接口返回值展示**，不再本地写死（旧全局值 1/120、整备费固定 1 已废弃）；5) 费用明细补充「整备费一次性收取、不乘天数」「保险按车辆配置」说明，并显示当前所选档位名称；6) 新增 400「车辆整备费配置异常」一并纳入统一 `res.msg` 提示 | - |
| 2026-10-25 | v1.6 | 新增 | 订单列表筛选与分页 | 依据后端接口文档 v1.6.17 对接 `GET /getOrderList` 新增能力：1) 订单页顶部新增状态 Tab（全部/待支付/进行中/已完成/已取消退款），按文档建议传 `pay_status`/`order_status`（逗号多值），筛选由后端 SQL 层完成，前端不做二次过滤；2) 新增上拉加载更多（`onReachBottom`），消费新增响应字段 `total`/`page`/`pageSize`，并对旧后端缺失这些字段做兜底（返回条数不足 pageSize 即判末页）；3) 列表状态由原先语义颠倒的 `noOrder` 重构为 `loading`/`empty`/`noMore`/`total` 四态显示；4) 卡片固定高度 560rpx 改为自适应（含可选操作区时不再挤压）；5) 列表内取消订单成功后回到第一页刷新（订单可能移出当前筛选分类） | B-09（部分）、B-15（部分） |
| 2026-10-24 | v1.5 | 新增 | 未支付订单取消 | 依据后端接口文档 v1.6.16 对接 `POST /cancelOrder`：1) 入参 `{orderSn, uid}`，按 `code === 200` 判成功、`res.msg` 提示失败（含「订单已支付，请走退款流程」的引导文案）；2) 状态映射 `utils/orderStatus.js` 恢复 `canCancel` 开关，条件为 `pay_status=0` + `order_status=0`，前端同步前置拦截；3) **订单详情页**与**订单列表页**均新增「取消订单」入口（列表页 `catch:tap` 阻止冒泡进详情，操作后刷新列表）；4) 与 `/cancelRefund` 按支付状态严格分流并在文档中标注，避免混用；5) 新增 B-23：`pay_status=3` 支付失败订单后端未开放取消，待确认 | B-22（关闭）、B-23（新增） |
| 2026-10-18 | v1.4 | 对齐 | 结算计价（v1.6.12） | 依据后端接口文档 v1.6.12 对接：1) **租用天数口径变更**（按 24 小时向上取整、至少 1 天，`rentDay` 由小数变整数），结算页三处「四舍五入」文案改为「不足24小时按1天计」；2) **结算失败处理扩展**：除原有 `code:-1` 外，覆盖新增的 4 类 `400` 错误（还车时间早于取车、时间不合法、保险金额不合法 `0/1/120`、司机费用不合法 `0/400`、车辆不存在），统一按 `res.msg` 提示并返回上一页；3) **保险基础档不再硬编码 1**，改为取 `/getInsurancePrice` 返回的 `l1` 并重新计价，避免与后端白名单不一致触发 400；4) 前端新增「还车时间必须晚于取车时间」前置拦截（B-04 的临时兜底）；5) 支付金额明确**以服务端重算的 `result.total_price` 为准**（v1.6.12 服务端忽略前端传来的 rentDay/total_price），本地结算值仅用于展示，差异时 console 留痕 | B-04（部分）、B-11 |
| 2026-10-18 | v1.3 | 新增 / 修正 | 取消退款 + 支付金额 | 依据后端接口文档 v1.6.11 对接：1) **新增 `POST /cancelRefund`（取消订单并退款）**，入参 `{orderSn, uid}`，仅 `pay_status=1`+`order_status=0` 可用，前端同步加状态前置拦截与二次确认，成功后按 `code===200` 提示 `msg` 并重新拉取详情（订单转为已退款+已取消）；2) **删除 `/applyRefund` 调用**（后端已下线、现返回 404，因其不更新订单状态会导致「钱退了订单仍是已支付」）；3) **`getWxPay.totalFee` 单位回滚为「分」**（v1.6.11 更正文档口径，此前后端文档误写为元），结算页与详情页均改为 `total_price × 100`（B-11 定稿）；4) 状态映射 `utils/orderStatus.js` 增加「已退款优先于已取消」及 `canCancelRefund`/`canKefu` 两个操作开关，详情页按钮为「发起支付」（未支付）、「取消订单并退款」（已支付未取车）、「联系客服」（已支付/已退款期间）；5) **删除未支付订单的取消入口与旧网关代码**：`car/route.php?service=cancelOrder` 已下线，移除 `cancelOrder()` 及 `canCancel` 开关，未支付订单仅保留「发起支付」（B-22） | B-11、B-22、B-07（部分） |
| 2026-10-17 | v1.2 | 修复 / 对齐 | 全端接口契约 | 依据后端《小程序端接口文档》v1.6.8 核对并修复 16 处入参/出参不一致：**严重项**——① `getWxPay.totalFee` 单位由前端 ×100（分）改为元（此前实付金额放大 100 倍）；② 订单状态枚举全量对齐（旧 -2/-1/0/1/2/3/4 → 新 `pay_status`+`order_status` 双字段），支付/取消/退款按钮条件由映射驱动；③ `createOrder` 新增 400/500 失败分支判断（车辆下架/不存在）；④ OCR 成功响应不含 `errcode` 导致误判失败（改为缺失即成功，并从身份证号兜底解析出生日期）；⑤ `getUserDriverInfo` 无记录返回裸 `-1` 被当作有效记录。**一般项**——结算失败码 201→-1、`getWxPay` 失败 `{success:false}` 判断、`getOpenid` 结果防护并补传 unionid、订单列表取还车时间由毫秒时间戳格式化、`updateUserDriverInfo` 返回 0/-1 判断、首页车辆列表空值兜底。**体验项**——接入 `/queryWxPayOrder` 真实查询支付结果替代 2 秒盲等。新增 `utils/orderStatus.js` 统一状态映射（R-03 关闭）、`util.formatOrderTime()`。退款迁移至 `POST /applyRefund`；取消订单接口文档缺失，沿用旧网关待确认（见 B-22） | B-11、B-20、B-21、B-22、R-03 |
| 2026-10-11 | v1.1 | UI 重构 | 全局样式与交互 | iOS（苹果）风格全量改版：1) app.wxss 建立设计变量体系（--pp-bg/#F2F2F7、--pp-blue/#007AFF、--pp-text/#1C1C1E 等系统色）与卡片/胶囊按钮基线（R-08 关闭）；2) app.json 导航栏与 tabBar 由全黑改浅色，tabBar 四张图标经 PIL 重新着色（未选中 iOS 灰/选中 iOS 蓝）；3) 六处页面/组件样式全部重写为浅色卡片风格：index（banner 圆角卡片、地址行分隔线、车卡片）、login（蓝色一键登录胶囊按钮、协议文案恢复并改真实勾选，B-17 关闭）、orderList/orderDetail（订单状态 iOS 语义色：蓝/绿/橙/灰、费用卡片、胶囊操作按钮）、checkOut（蓝色主按钮与支付胶囊、checkbox/radio 蓝色选中态）、datetimepicker（浅色填充选择器）；4) 顺带清理 index.wxss 死样式（tab-title/picker_group/b_search 等）；5) 压缩超限资源（登录 Banner 284K→99K、删除无引用 560K 大图，此前已处理）。附带说明：B-06 的 radio 交互规范化未包含在本次，仍开放 | R-08、B-17、R-06（部分）、N-05（部分） |
| 2026-10-11 | v1.0 | 重构 | 员工端下线 + 请求层 | 一、员工端整体下线：删除 pages/staff、pages/staffOrder 及 app.json 注册、orderList 员工入口/注释/isStaff、img/staff_search.png，员工操作迁移至独立业务后台（B-08/B-10/N-02 随之关闭）。二、R-02 统一请求层落地：新建 utils/request.js（Promise 化 wx.request/wx.uploadFile、BASE_URL 自动拼接、可选 loading、网络失败统一提示），app.js/login/index/checkOut/orderList/orderDetail/wxPay 全部替换为 request 调用（B-16 关闭）；登录链路改为 Promise 链。三、顺带修复：B-05 保险切换重复计价、B-07 取消/退款二次确认、B-12 goPay 防重复提交锁、checkOut OCR 失败 loading 永挂与静默无提示、wxPay 获取支付参数失败无回调、B-14 globalData.source 补声明。四、死代码清理：删除 utils/http.js、upload.js、subscribe.js、date.js 及各页注释死代码（R-04/R-05 关闭，R-07/R-09 部分） | B-05、B-07、B-08、B-10、B-12、B-14、B-16、R-02、R-04、R-05、R-07、R-09、N-02 |
| 2026-10-11 | v0.10 | 修复 | 首页选址 | 修复手动选择地址崩溃（Cannot read properties of undefined (reading 'dataset')）：根因是 getUserPoi 丢弃了点击事件对象 e，chooseLocate 回调仅传 (res, type, address_name)，而 setAddress 期望 (res, type, e, add_name)，导致 e 实为地址字符串、add_name 为 undefined；改为 getUserPoi(e) 接住事件并经箭头闭包转发。该 bug 为历史遗留（此前选址命中支持城市即必崩），并补上 setAddress select 分支缺失的 break | B-12 |
| 2026-10-11 | v0.9 | 修复 | 定位 / 提审合规 | 解决提审提示"接口未正确配置：wx.getLocation"：该调用仅存在于腾讯地图 SDK 的兜底定位分支（本项目调用方均显式传入坐标，运行时不会触发），将 SDK 内 getWXLocation 改为仅透传 fail/complete 回调、不再发起精确定位；删除无引用的 qqmap-wx-jssdk.min.js（内部同样含该调用）；移除 requiredPrivateInfos 中未使用的 choosePoi。定位链路维持 getFuzzyLocation + chooseLocation 不变 | B-19、R-09 |
| 2026-10-11 | v0.8 | 修复 | tabBar / 工程配置 | 修复 tabBar 图标裂图：因 project.private.config.json 的 ignoreDevUnusedFiles 与 project.config.json 的 ignoreUploadUnusedFiles 开启，工具依赖分析未识别 app.json 中 tabBar iconPath 的静态引用，将图标误过滤出编译产物；两项均已关闭。已验证 4 张图标 PNG（200×200、约 3KB）完好 | R-09 |
| 2026-10-11 | v0.7 | 重构 | 全局接口配置 | API 域名收敛（R-01 域名部分）：新建 `utils/config.js` 定义唯一 `BASE_URL`（当前线上 https://pangpai-car.com）；13 个文件（app.js、8 个页面、utils/upload、utils/wxPay、utils/subscribe、contract 页）共 25 处硬编码域名全部改为 `config.BASE_URL + 路径`；合同页 web-view src 改为由 contract.js 经 data 注入。此后环境切换只需改 config.js 一行。业务逻辑零改动 | R-01、R-02 |
| 2026-10-11 | v0.6 | 修改 | 全局接口配置 | 接口环境由本地切回线上：全小程序 25 处请求地址由 http://localhost:3002 统一替换回 https://pangpai-car.com | R-01、R-02 |
| 2026-10-11 | v0.5 | 修改 | 全局接口配置 | 接口环境再次切换为本地联调：全小程序 25 处请求地址由 https://pangpai-car.com 统一替换为 http://localhost:3002 | R-01、R-02 |
| 2026-10-11 | v0.4 | 修改 | 全局接口配置 | 接口环境由本地切回线上：全小程序 25 处请求地址由 http://localhost:3002 统一替换回 https://pangpai-car.com，本地联调结束 | R-01、R-02 |
| 2026-10-11 | v0.3 | 修改 | 全局接口配置 | 接口环境切换为本地联调：全小程序 25 处请求地址（app.js、login、index、checkOut、orderDetail、orderList、staff、staffOrder、contract web-view、utils/upload、utils/wxPay、utils/subscribe 注释）由 https://pangpai-car.com 统一替换为 http://localhost:3002；后续按用户指令在本地/线上地址间整体切换 | R-01、R-02 |
| 2026-09-10 | v0.1 | 文档 | - | 首次建档：完成项目全量盘点，输出代码结构与问题审查报告；本文档作为后续迭代追踪基线，尚未改动业务代码 | - |

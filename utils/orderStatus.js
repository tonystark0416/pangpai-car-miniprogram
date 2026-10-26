// utils/orderStatus.js
// 订单状态统一映射（后端 v1.6.11+ 枚举，见接口文档 4.3）
// pay_status : 0 待支付 / 1 已支付 / 2 已退款 / 3 支付失败
// order_status: 0 待取车 / 1 已取车 / 2 已还车 / 3 已完成 / 4 已取消
//
// 历史枚举（-2 已取消/-1 未支付/0 已支付/1 租车中/2 退款中/3 已退款/4 已完成）已废弃，
// 前端不再在页面中直接写死数值判断，统一走本映射（R-03）。
//
// 可执行操作与后端约束对齐（v1.6.16）：
// - 取消订单（POST /cancelOrder）：仅 pay_status=0 且 order_status=0（未支付待取车），不涉及资金
// - 取消订单并退款（POST /cancelRefund）：仅 pay_status=1 且 order_status=0（已支付未取车）
//   两者按支付状态严格分流，勿混用
// - 联系客服：已支付/已退款期间（已取车后不能自助退款，只能联系客服）

function toNumber(value) {
  const n = Number(value);
  return isNaN(n) ? undefined : n;
}

// 返回 { text, class, canPay, canCancel, canCancelRefund, canKefu, showUnpayTip }
function getOrderStatus(order) {
  const orderInfo = order || {};
  const payStatus = toNumber(orderInfo.pay_status);
  const orderStatus = toNumber(orderInfo.order_status);

  // 已退款（退款成功后 pay_status=2 + order_status=4，退款态优先展示）
  if (payStatus === 2) {
    return { text: '已退款', class: 'st_refunded', canPay: false, canCancel: false, canCancelRefund: false, canKefu: true, showUnpayTip: false };
  }
  // 已取消
  if (orderStatus === 4) {
    return { text: '已取消', class: 'st_cancel', canPay: false, canCancel: false, canCancelRefund: false, canKefu: payStatus === 1, showUnpayTip: false };
  }
  // 待支付：可继续支付、可取消订单（v1.6.16 POST /cancelOrder，仅 pay_status=0）
  // 支付失败（pay_status=3）后端未开放取消，仅允许重新支付
  if (payStatus === 0 || payStatus === 3) {
    return {
      text: payStatus === 3 ? '支付失败' : '待支付',
      class: 'st_unpay',
      canPay: true,
      canCancel: payStatus === 0 && orderStatus === 0,
      canCancelRefund: false,
      canKefu: false,
      showUnpayTip: true
    };
  }
  // 已支付：按履约状态展示
  switch (orderStatus) {
    case 0: //已支付未取车：唯一支持自助取消并退款的状态
      return { text: '待取车', class: 'st_paid', canPay: false, canCancel: false, canCancelRefund: true, canKefu: true, showUnpayTip: false };
    case 1:
      return { text: '已取车', class: 'st_renting', canPay: false, canCancel: false, canCancelRefund: false, canKefu: true, showUnpayTip: false };
    case 2:
      return { text: '已还车', class: 'st_done', canPay: false, canCancel: false, canCancelRefund: false, canKefu: true, showUnpayTip: false };
    case 3:
      return { text: '已完成', class: 'st_done', canPay: false, canCancel: false, canCancelRefund: false, canKefu: true, showUnpayTip: false };
    default:
      return { text: '处理中', class: 'st_paid', canPay: false, canCancel: false, canCancelRefund: false, canKefu: false, showUnpayTip: false };
  }
}

module.exports = {
  getOrderStatus: getOrderStatus
};

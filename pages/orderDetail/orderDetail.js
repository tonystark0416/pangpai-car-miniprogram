// pages/orderDetail/orderDetail.js

//引入请求js文件
import wxPay from "../../utils/wxPay.js";
const { request } = require('../../utils/request.js');
const { getOrderStatus } = require('../../utils/orderStatus.js');

// 获取应用实例
const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    orderInfo:{},
    //订单状态展示（由 getOrderStatus 统一映射，页面不再写死枚举）
    statusText:'',
    statusClass:'',
    canPay:false,
    canCancelRefund:false,
    canKefu:false,
    showUnpayTip:false
  },

  //获取订单详情
  getOrderDetail(orderSn){
    if (!orderSn) {
      return;
    }
    request({
      url: '/getOrderDetail',
      data:{
        orderSn:orderSn,
        uid:app.globalData.userid
      }
    }).then((data) => {
      console.log(data);
      //空数据返回 {code:201, msg:'无订单数据'}
      if (!data || data.code == 201 || !data.result) {
        wx.showToast({
          title: (data && data.msg) || '暂无订单数据',
          icon: 'none'
        })
        this.setData({
          orderInfo:{},
          statusText:'',
          statusClass:'',
          canPay:false,
          canCancelRefund:false,
          canKefu:false,
          showUnpayTip:false
        })
        return;
      }
      const orderInfo = data.result;
      const status = getOrderStatus(orderInfo);
      this.setData({
        orderInfo:orderInfo,
        statusText:status.text,
        statusClass:status.class,
        canPay:status.canPay,
        canCancelRefund:status.canCancelRefund,
        canKefu:status.canKefu,
        showUnpayTip:status.showUnpayTip
      })
    })
  },

  //取消订单并退款（v1.6.11 POST /cancelRefund；仅已支付且未取车可用，B-07：增加二次确认）
  cancelRefund(){
    const orderInfo = this.data.orderInfo;
    if (!orderInfo || !orderInfo.order_sn) {
      return;
    }
    //后端强校验：pay_status=1 且 order_status=0，前端同步拦截避免无效请求
    if (Number(orderInfo.pay_status) !== 1 || Number(orderInfo.order_status) !== 0) {
      wx.showToast({
        title: '当前订单状态不支持自助退款',
        icon: 'none'
      })
      return;
    }
    wx.showModal({
      title: '取消订单并退款',
      content: '确认取消该订单并申请全额退款吗？退款成功后订单不可恢复。',
      success: (modalRes) => {
        if (!modalRes.confirm) {
          return;
        }
        wx.showLoading({
          title: '退款处理中',
          mask: true
        })
        request({
          url: '/cancelRefund',
          method: 'POST',
          data:{
            orderSn: orderInfo.order_sn,
            uid: app.globalData.userid
          }
        }).then((data) => {
          wx.hideLoading();
          console.log(data);
          //成功 {code:200, msg:'退款成功，已退 ￥xx'}；失败按 res.msg 提示（403/404/400/500）
          if (data && data.code === 200) {
            wx.showToast({
              title: data.msg || '退款成功',
              icon:'success',
              mask:true,
              duration: 2500
            })
            //退款成功后订单变为 已退款(pay_status=2) + 已取消(order_status=4)，以服务端为准重新拉取
            this.getOrderDetail(orderInfo.order_sn)
          }else{
            wx.showToast({
              title: (data && data.msg) || '退款失败，请稍后重试',
              icon:'none',
              duration: 2500
            })
          }
        }).catch(() => {
          wx.hideLoading();
        })
      }
    })
  },

  // 发起支付
  goPay:function(){
    console.log('going to second pay...');
    let orderSn = this.data.orderInfo.order_sn;
    console.log(orderSn);
    // totalFee 单位：分（后端文档 v1.6.11 更正，与支付回调核验口径一致）
    let totalFee = this.data.orderInfo.total_price * 100;
    console.log(totalFee);
    wxPay.wxPayment(app.globalData.openid,'庞派租车服务',totalFee,orderSn,this.checkPay)
  },

  //检查支付是否成功（wxPay.js支付函数的回调）
  checkPay:function (res) {
    let that = this;
    const orderSn = this.data.orderInfo.order_sn;
    if(res.errMsg=="requestPayment:ok"){ //如果支付成功
      //改为查询后端支付结果，替代原来固定等待 2 秒的盲等
      wx.showLoading({
        title: '确认支付结果中',
        mask: true
      })
      request({
        url: '/queryWxPayOrder',
        data:{
          outTradeNo: orderSn
        }
      }).then((payRes) => {
        wx.hideLoading();
        const paid = payRes && payRes.success && payRes.data && payRes.data.trade_state === 'SUCCESS';
        wx.showToast({
          title: paid ? '支付成功' : '支付结果确认中',
          icon: 'none'
        })
        that.getOrderDetail(orderSn)
      }).catch(() => {
        wx.hideLoading();
        that.getOrderDetail(orderSn)
      })
    }else{
      wx.showToast({
        title: '支付失败，请重新支付',
        icon:'none'
      })
      that.getOrderDetail(orderSn)
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log(options.orderSn)
    this.getOrderDetail(options.orderSn)
  },
})

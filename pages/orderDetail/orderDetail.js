// pages/orderDetail/orderDetail.js

//引入请求js文件
import wxPay from "../../utils/wxPay.js";
const { request } = require('../../utils/request.js');

// 获取应用实例
const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    orderInfo:{}
  },

  //取消订单（B-07：增加二次确认）
  cancelOrder(){
    wx.showModal({
      title: '提示',
      content: '确认取消该订单吗？取消后不可恢复。',
      success: (modalRes) => {
        if (!modalRes.confirm) {
          return;
        }
        request({
          url: '/car/route.php',
          data:{
            service:'cancelOrder',
            orderSn:this.data.orderInfo.order_sn
          }
        }).then((data) => {
          console.log(data);
          this.setData({
            "orderInfo.order_status":-2
          })
          wx.showToast({
            title: '取消成功',
          })
        })
      }
    })
  },

  //获取订单详情
  getOrderDetail(orderSn){
    request({
      url: '/getOrderDetail',
      data:{
        orderSn:orderSn,
        uid:app.globalData.userid
      }
    }).then((data) => {
      console.log(data);
      this.setData({
        orderInfo:data.result
      })
    })
  },

  //申请退款（B-07：增加二次确认）
  refund(){
    wx.showModal({
      title: '提示',
      content: '确认对该订单申请退款吗？',
      success: (modalRes) => {
        if (!modalRes.confirm) {
          return;
        }
        request({
          url: '/car/route.php',
          data:{
            service:'userRefundOrder',
            orderSn:this.data.orderInfo.order_sn
          }
        }).then((data) => {
          console.log(data);
          if (data.code==201) {
            wx.showToast({
              title: '申请退款失败',
              icon:'error',
              mask:true
            })
          }else if (data.code==200) {
            wx.showToast({
              title: '申请退款成功',
              icon:'success',
              mask:true
            })
          }
        })
      }
    })
  },

  // 发起支付
  goPay:function(){
    console.log('going to second pay...');
    let orderSn = this.data.orderInfo.order_sn;
    console.log(orderSn);
    let totalFee = this.data.orderInfo.total_cost*100;
    console.log(totalFee);
    wxPay.wxPayment(app.globalData.openid,'庞派租车服务',totalFee,orderSn,this.checkPay)
  },

  //检查支付是否成功（wxPay.js支付函数的回调）
  checkPay:function (res) {
    let that = this;
    if(res.errMsg=="requestPayment:ok"){ //如果支付成功
      wx.showLoading({
        title: '检查支付中',
      })
      setTimeout(function () {
        wx.hideLoading();
        wx.redirectTo({
          url: "/pages/orderDetail/orderDetail?orderSn="+that.data.orderInfo.order_sn
        })
      }, 2000)
    }else{
      wx.showToast({
        title: '支付失败，请重新支付',
        icon:'none',
        success:function(){
          wx.redirectTo({
            url: "/pages/orderDetail/orderDetail?orderSn="+that.data.orderInfo.order_sn
          })
        }
      })
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

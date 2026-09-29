// pages/orderDetail/orderDetail.js


//引入请求js文件
import wxPay from "../../utils/wxPay.js";

// 获取应用实例
const app = getApp();
const util = require('../../utils/util.js');


Page({

  /**
   * 页面的初始数据
   */
  data: {
    orderInfo:{}
  },
  
  //取消订单
  cancelOrder(){
    wx.request({
      url: 'https://pangpai-car.com/car/route.php',
      data:{
        service:'cancelOrder',
        orderSn:this.data.orderInfo.order_sn
      },
      success:res=>{
        console.log(res);
        this.setData({
          "orderInfo.order_status":-2
        })
        wx.showToast({
          title: '取消成功',
        })
      }
    })
  },

  //获取订单详情
  getOrderDetail(orderSn){
    wx.request({
      url: 'https://pangpai-car.com/getOrderDetail',
      data:{
        orderSn:orderSn,
        uid:app.globalData.userid
      },
      success:res=>{
        console.log(res);
        this.setData({
          orderInfo:res.data.result
        })
      }
    })
  }, 

  //申请退款
  refund(){
    wx.request({
      url: 'https://pangpai-car.com/car/route.php',
      data:{
        service:'userRefundOrder',
        orderSn:this.data.orderInfo.order_sn
      },
      success:res=>{
        console.log(res);
        if (res.data.code==201) {
          wx.showToast({
            title: '申请退款失败',
            icon:'error',
            mask:true
          })
        }else if (res.data.code==200) {
          wx.showToast({
            title: '申请退款成功',
            icon:'success',
            mask:true
          })
        }
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

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  // onShareAppMessage() {
  //   wx.hideShareMenu({
  //     menus: ['shareAppMessage', 'shareTimeline']
  //   })
  // }
})
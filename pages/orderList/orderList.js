// pages/orderList/orderList.js

const { request } = require('../../utils/request.js');

// 获取应用实例
const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    islogin:false,
    noOrder:true,
    orderList:[]
  },

  //跳转登录
  goLogin(){
    wx.navigateTo({
      url: "/pages/login/login"
    })
  },

  // 获取用户订单
  getOrderList(){
    request({
      url: '/getOrderList',
      data:{
        uid:app.globalData.userid,
        pageNumber:1
      }
    }).then((data) => {
      console.log(data);
      if (data.code == 200) {
        this.setData({
          orderList:data.result,
          noOrder:true
        })
      }else{
        this.setData({
          noOrder:false
        })
      }
    })
  },

  goOrderDetail(e){
    let orderSn = e.currentTarget.dataset.ordersn;
    wx.navigateTo({
      url: '/pages/orderDetail/orderDetail?orderSn='+orderSn,
    })
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (app.globalData.userid == null) {
      this.setData({
        islogin:false
      })
    }else{
      this.setData({
        islogin:true
      })
      this.getOrderList()
    }
  },
})

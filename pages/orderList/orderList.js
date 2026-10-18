// pages/orderList/orderList.js

const { request } = require('../../utils/request.js');
const { getOrderStatus } = require('../../utils/orderStatus.js');
const util = require('../../utils/util.js');

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
        pageNumber:1 //页码从 1 开始，不能为 0
      }
    }).then((data) => {
      console.log(data);
      //空数据返回 {code:201, msg:'无订单数据'}
      if (data && data.code == 200 && data.result) {
        //状态文案/配色由 getOrderStatus 统一映射；取还车时间为毫秒时间戳，需格式化
        const list = data.result.map((item) => {
          const status = getOrderStatus(item);
          return Object.assign({}, item, {
            statusText: status.text,
            statusClass: status.class,
            pickup_time_txt: util.formatOrderTime(item.pickup_time),
            return_time_txt: util.formatOrderTime(item.return_time)
          })
        })
        this.setData({
          orderList:list,
          noOrder:true //有订单，隐藏"暂无订单"
        })
      }else{
        this.setData({
          orderList:[],
          noOrder:false //无订单，展示"暂无订单"
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

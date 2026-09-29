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
  
  test(){
    console.log('1231231');
  },

  // 点击信息复制
 copyText(e) {
  let key = e.currentTarget.dataset.key;
  wx.setClipboardData({ //设置系统剪贴板的内容
    data: key,
    success(res) {
      console.log(res, key);
      wx.getClipboardData({ // 获取系统剪贴板的内容
        success(res) {
          wx.showToast({
            title: '复制成功',
          })
        }
      })
    }
  })
},


  //点击确认租车中
  clickOrderDoing(e){
    let nextStatus = e.currentTarget.dataset.nextstatus
    this.updateOrder(this.data.orderInfo.order_sn,nextStatus);
  },


  //变更订单
  updateOrder(orderSn,upStatus){
    wx.request({
      url: 'https://pangpai-car.com/car/staff/api.php?service=updateOrder',
      method:"POST",
      data:{
        "orderSn":orderSn,
        "upStatus":upStatus
      },
      success:res=>{
        console.log(res);
        if (res.data.code==200) {
          this.setData({
            orderInfo:res.data.data[0]
          })
          wx.showToast({
            title: '状态变更成功',
          })
        }else if (res.data.code==201) {
          wx.showToast({
            title: '状态变更失败',
          })
        }
      }
    })
  },

  //获取订单详情
  getOrderDetail(orderSn){
    wx.request({
      url: 'https://pangpai-car.com/car/route.php',
      data:{
        service:'getOrderDetail',
        orderSn:orderSn
      },
      success:res=>{
        console.log(res);
        this.setData({
          orderInfo:res.data.data[0]
        })
      }
    })
  }, 


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
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
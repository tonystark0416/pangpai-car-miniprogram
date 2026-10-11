// pages/login/login.js

const { request } = require('../../utils/request.js');

// 获取应用实例
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    agreement:true
  },

  //协议勾选（B-17：改为真实开关）
  agreementChange(e) {
    this.setData({
      agreement: e.detail.value.indexOf('agree') > -1
    })
  },

  //手机号获取成功后回调
  getPhoneNumber (e) {
    if (!this.data.agreement) {
      wx.showToast({
        title: '请同意协议',
      })
      return;
    }
    console.log(e.detail.code)  // 动态令牌
    console.log(e.detail.errMsg) // 回调信息（成功失败都会返回）
    console.log(e.detail.errno)  // 错误码（失败时返回）
    request({
      url: '/car/route.php',
      data:{
        service: 'userRegister',
        openid: app.globalData.openid,
        code:e.detail.code
      }
    }).then((data) => {
      if (data.code == 200) {
        app.globalData.userid = data.data[0].id;
        wx.setStorageSync('uid', data.data[0].id);
        wx.showToast({
          title: '登陆成功',
          icon: 'success',
          duration:2000,
          success:function () {
            setTimeout(() => {
              wx.reLaunch({
                url: '/pages/index/index',
              })
            }, 1000)
          }
        })
      }else if(data.code == 202){
        wx.showToast({
          title: '注册失败',
          icon: 'error',
          duration:2000,
          success:function () {
            setTimeout(() => {
              wx.reLaunch({
                url: '/pages/index/index',
              })
            }, 2000)
          }
        })
      }
    })
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  }
})

// pages/login/login.js

// 获取应用实例
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    agreement:true
  },
  
  radioChange(e) {
    console.log(e)
    this.data.agreement = true;
    console.log('radio发生change事件，携带value值为：', e.detail.value)
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
    wx.request({
      url: 'https://pangpai-car.com/car/route.php',
      data:{
        service: 'userRegister',
        openid: app.globalData.openid,
        code:e.detail.code
      },
      success:function (res) {
        // console.log(res.data);
        if (res.data.code == 200) {
          app.globalData.userid = res.data.data[0].id;
          wx.setStorageSync('uid', res.data.data[0].id); 
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
        }else if(res.data.code == 202){
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

        
      }
    })

  },



  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

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

  // }
})
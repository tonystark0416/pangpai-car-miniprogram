// pages/contract/contract.js
const config = require('../../utils/config.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    contractUrl: config.BASE_URL + '/car/contract/contract.html'
  },

  /**
   * 生命周期函数--监听页面加载
   * 支持外部传入页面地址：?url=（需 encodeURIComponent）
   * 仅允许本站域名（web-view 需配置业务域名，且防任意跳转），否则回落默认合同页
   */
  onLoad(options) {
    const url = options.url ? decodeURIComponent(options.url) : '';
    if (url && url.indexOf(config.BASE_URL) === 0) {
      this.setData({
        contractUrl: url
      })
    }
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
  onShareAppMessage() {

  }
})
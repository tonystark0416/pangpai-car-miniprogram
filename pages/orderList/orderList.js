// pages/orderList/orderList.js



// 获取应用实例
const app = getApp();


Page({

  /**
   * 页面的初始数据
   */
  data: {
    isStaff:false,
    islogin:false,
    noOrder:true,
    orderList:[]
  },
  
  //点击跳转员工管理页面
  clickToStaff(){
    wx.navigateTo({
      url: '/pages/staff/staff'
    })
  },

  //校验是否员工
  // checkIsStaff(uid){
  //   wx.request({
  //     url: 'https://pangpai-car.com/car/staff/api.php?service=checkIsStaff',
  //     method: 'POST',
  //     data:{
  //       uid:uid
  //     },
  //     success:(res)=>{
  //       console.log(res)
  //       if (res.data.code==200) {
  //         this.setData({
  //           isStaff:true
  //         })
  //       }
  //     }
  //   })
  // },

  //跳转登录
  goLogin(){
    wx.navigateTo({
      url: "/pages/login/login"
    })
  },
  

  // 获取用户订单
  getOrderList(){
    wx.request({
      url: 'https://pangpai-car.com/getOrderList',
      data:{
        uid:app.globalData.userid,
        pageNumber:1
      },
      success:res=>{
        if (res.data.code ==200) {
          this.setData({
            orderList:res.data.result,
            noOrder:true
          })
          console.log(res)
        }else{
          this.setData({
            noOrder:false
          })
        }

      },
      fail:res=>{
        
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

    // this.checkIsStaff(app.globalData.userid);

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
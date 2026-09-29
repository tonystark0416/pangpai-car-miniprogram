// 获取应用实例
const app = getApp();


Page({

  /**
   * 页面的初始数据
   */
  data: {
    search_text:'',
    is_search:false,
    isStaff:false,
    islogin:false,
    noOrder:true,
    orderList:[],
    page:1
  },
  staticData: {
    inputValue: ""
  },
  
  //获取输入框内容
  handleInputChange(e){
    this.staticData.inputValue = e.detail.value;
    console.log(this.staticData.inputValue);
  },
  

  //根据手机号搜索订单
  searchOrderByPhone(){
    this.data.orderList = [];
    this.data.page = 1;
    this.getOrderListByStaff(this.data.page,this.staticData.inputValue)
  },


  //获取后台订单列表
  getOrderListByStaff(page,query){
    wx.request({
      url: 'https://pangpai-car.com/car/staff/api.php?service=queryOrderListByStaff',
      data:{
        "page": page,
        "query":query
      },
      method: 'POST',
      success:(res)=>{
        console.log(res);
        if (res.data.code ==200) {
          this.data.page++;
          let resArr = this.data.orderList.concat(res.data.data)
          this.setData({
            orderList:resArr
          })
        }else if (res.data.code ==201) {
          this.setData({
            orderList:[]
          })
          this.data.page = 1;
          wx.showToast({
            title: '查询失败',
          })
        }else{
          wx.showToast({
            title: '查询失败',
          })
        }
      }
    })
  },

 
  goOrderDetail(e){
    let orderSn = e.currentTarget.dataset.ordersn;
    wx.navigateTo({
      url: '/pages/staffOrder/staffOrder?orderSn='+orderSn,
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
    if (wx.getStorageSync('uid')) {
      this.setData({
        islogin:true
      })
      this.getOrderListByStaff(this.data.page); //获取订单列表
    }
  },

  onReady(){

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
    if (this.data.is_search==false) {
      this.getOrderListByStaff(this.data.page); //获取订单列表
    }
  },

})
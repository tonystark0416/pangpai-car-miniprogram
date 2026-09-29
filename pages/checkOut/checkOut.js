// pages/checkOut/checkOut.js

//引入请求js文件
import wxPay from "../../utils/wxPay.js";
const util = require('../../utils/util.js');
// const sub = require("../../utils/subscribe.js");


// 获取应用实例
const app = getApp();

// 定义结算参数结构
let checkOutData = {
  // userid: '',
  // contact_phone: '',
  // insurancePrice: '',
  // pickUpTime: app.globalData.pickUpTime,
  // returnTime: app.globalData.returnTime,
  // pickUpAddress: app.globalData.pickUpAddress,
  // returnAddress: app.globalData.returnAddress,
  // driver_price: ''
};

Page({
  /**
   * 页面数据
   */
  data: {
    //保险信息
    insuranceInfo: {
      radio_upgrade: false, //是否升级保险选项
      insurancePrice_l1: '',
      insurancePrice_l2: ''
    },
    //身份证信息
    idcard_text: false,
    idcard_result: true,
    driver_info: {
      driver_idcard_name: '',
      driver_idcard_number: '',
      driver_idcard_url: '',
      driver_idcard_birth: ''
    },
    //司机服务信息
    siji_info: {
      siji_server: false, //是否需要司机服务
      siji_price: ''
    },
    contact_phone: '',
    is_agress: false,
    // carInfo:{}, //汽车信息，结算页再一次获取并赋值
    checkoutInfo: {}, //结算信息
    currentOrderSn: ''
  },

  //获取司机费用,初始化
  getSijiPrice() {
    wx.request({
      url: 'https://pangpai-car.com/getDriverPrice',
      success: (res) => {
        this.setData({
          'siji_info.siji_price': res.data.driver_price
        })
      }
    })
  },

  //获取保险费用
  getInsurance() {
    wx.request({
      url: 'https://pangpai-car.com/getInsurancePrice',
      success: (res) => {
        // checkOutData.insurancePrice = res.data.insurancePrice_l1;
        this.setData({
          'insuranceInfo.insurancePrice_l1': res.data.insurancePrice_l1,
          'insuranceInfo.insurancePrice_l2': res.data.insurancePrice_l2
        })
      }
    })
  },

  //用户勾选 或 取消勾选 升级保险，控制是否勾选
  checkedTap() {
    if (this.data.insuranceInfo.radio_upgrade == false) {
      checkOutData.insurancePrice = this.data.insuranceInfo.insurancePrice_l2;
      this.setData({
        'insuranceInfo.radio_upgrade': true
      })
      this.checkOut(checkOutData)
    } else if (this.data.insuranceInfo.radio_upgrade == true) {
      checkOutData.insurancePrice = this.data.insuranceInfo.insurancePrice_l1;
      this.setData({
        'insuranceInfo.radio_upgrade': false
      })
    }
    this.checkOut(checkOutData)
    console.log(checkOutData)
  },

  //用户勾选 或 取消勾选 司机服务
  sijiTap() {
    if (this.data.siji_info.siji_server == false) {
      checkOutData.driver_price = this.data.siji_info.siji_price;
      this.setData({
        'siji_info.siji_server': true
      })
      this.checkOut(checkOutData)
    } else if (this.data.siji_info.siji_server == true) {
      checkOutData.driver_price = 0;
      this.setData({
        'siji_info.siji_server': false
      })
      this.checkOut(checkOutData)
    }
    console.log(checkOutData)
  },

  //跳转合同
  goContract() {
    wx.navigateTo({
      url: '/pages/contract/contract'
    })
  },



  //输入手机号后
  handleBlur(e) {
    console.log(e);
    checkOutData.contact_phone = e.detail.value.replace(/\s*/g, "")
    this.setData({
      contact_phone: e.detail.value.replace(/\s*/g, "") //去除电话中的空格
    })
    this.checkOut(checkOutData)
  },

  getDriverInfo(uid) {
    wx.request({
      url: 'https://pangpai-car.com/getUserDriverInfo',
      data: {
        uid: uid
      },
      success: (res) => {
        // console.log(res);
        if (res.data) {
          this.setData({
            "driver_info.driver_idcard_birth": res.data.driver_idcard_birth,
            "driver_info.driver_idcard_url": res.data.driver_idcard_url,
            "driver_info.driver_idcard_name": res.data.driver_idcard_name,
            "driver_info.driver_idcard_number": res.data.driver_idcard_number,
            idcard_text: true,
            idcard_result: false
          })

        }
      }
    })
  },

  updateDriverInfo(driver_idcard_name, driver_idcard_number, driver_idcard_url, driver_idcard_birth, uid) {
    wx.request({
      url: 'https://pangpai-car.com/updateUserDriverInfo',
      data: {
        uid: uid,
        driver_idcard_name: driver_idcard_name,
        driver_idcard_number: driver_idcard_number,
        driver_idcard_url: driver_idcard_url,
        driver_idcard_birth: driver_idcard_birth
      },
      success: function (res) {
        console.log(res);
      }
    })
  },

  //上传身份证
  uploadPic: function () {
    let that = this;
    wx.chooseMedia({
      count: 1,
      sizeType: ['compressed'],
      mediaType: ['image'],
      success: function (res) {
        console.log(res)
        //触发文件上传
        wx.uploadFile({
          filePath: res.tempFiles[0].tempFilePath,
          name: 'file',
          url: 'https://pangpai-car.com/upload',
          success: function (res) {
            console.log(JSON.parse(res.data)); //打印上传文件结果
            that.data.driver_info.driver_idcard_url = JSON.parse(res.data).path; //设置驾驶员身份证的图片路径到本地
            wx.showLoading({
              title: '正在校验身份证号，请稍等',
              mask: true
            })
            if (JSON.parse(res.data).code == 200) {
              wx.request({ //获取身份证对应的姓名和身份证号码，传入图片url
                url: 'https://pangpai-car.com/getIdCardInfo',
                data: {
                  img_url: JSON.parse(res.data).path
                },
                success: function (res) {
                  console.log(res);
                  if (res.data.errcode == 0) {
                    that.updateDriverInfo(res.data.name, res.data.id, that.data.driver_info.driver_idcard_url, res.data.birth, app.globalData.userid)
                    wx.hideLoading();
                    wx.showToast({
                      title: '校验成功',
                    })
                    that.setData({
                      "driver_info.driver_idcard_name": res.data.name,
                      "driver_info.driver_idcard_number": res.data.id,
                      "driver_info.driver_idcard_birth": res.data.birth,
                      idcard_text: true, //隐藏前端
                      idcard_result: false //展示结果
                    })
                  } else {
                    wx.showToast({
                      title: '校验失败请重新上传',
                    })
                  }
                }
              })
            }
          }
        })
      }

    })
  },

  //同意合同
  checkboxChange(e) {
    console.log(e);
    let a = e.detail.value[0];
    if (a == 'yes') {
      this.setData({
        is_agress: true
      })
    } else {
      this.setData({
        is_agress: false
      })
    }
    console.log(a);
  },

  //获取结算信息,计算价格等所有
  checkOut: function (checkOutData) {
    let that = this;
    wx.request({
      url: 'https://pangpai-car.com/checkout',
      data: {
        carId: checkOutData.carId,
        uid: checkOutData.userid,
        contact_phone: checkOutData.contact_phone,
        pickUpTime: checkOutData.pickUpTime,
        pickUpAddress: checkOutData.pickUpAddress,
        returnTime: checkOutData.returnTime,
        returnAddress: checkOutData.returnAddress,
        insurancePrice: checkOutData.insurancePrice,
        driver_price:checkOutData.driver_price
      },
      success: function (res) {
        if (res.data.code == 201) {
          wx.showLoading({
            title: '缺少结算信息',
            success: function () {
              wx.navigateBack();
            }
          })
        }
        console.log(res);
        that.setData({
          checkoutInfo: res.data
        })
      }
    })
  },

  // 发起支付
  goPay: function () {
    // sub.subscribeTemplate(this.data.subTemplate);
    //判断合同是否同意
    if (this.data.is_agress == false) {
      wx.showToast({
        title: '请阅读同意合同',
      })
      return;
    }
    //判断驾驶员信息是否存在
    // if (!this.data.driver_info.driver_idcard_number||!this.data.driver_info.driver_idcard_name || !this.data.driver_info.driver_contact_phone) {
    //   wx.showToast({
    //     title: '驾驶员信息不全',
    //   })
    //   return;
    // }else{
    //   this.updateDriverInfo(app.globalData.userid,this.data.driver_info.driver_idcard_name,this.data.driver_info.driver_idcard_number,this.data.driver_info.driver_idcard_url,this.data.driver_info.driver_contact_phone); //提交驾驶员信息
    // }
    //把驾驶员信息设置进checkoutInfo里面一起提交订单
    this.data.checkoutInfo.driver_name = this.data.driver_info.driver_idcard_name;
    this.data.checkoutInfo.driver_idcard = this.data.driver_info.driver_idcard_number;
    this.data.checkoutInfo.driver_phone = this.data.driver_info.driver_contact_phone;
    this.data.checkoutInfo.extend = app.globalData.source;

    let that = this;
    wx.request({
      url: 'https://pangpai-car.com/createOrder',
      method: 'POST',
      data: {
        checkOutArray: that.data.checkoutInfo
      },
      success: function (res) {
        that.setData({
          currentOrderSn: res.data.result.order_sn
        })
        console.log(res)
        console.log('going to pay...');
        let orderSn = res.data.result.order_sn;
        console.log(orderSn);
        let totalFee = (res.data.result.total_price) * 100;
        console.log(totalFee);
        wxPay.wxPayment(app.globalData.openid, '庞派租车服务', totalFee, orderSn, that.checkPay)
      }
    })

  },


  //检查支付是否成功（wxPay.js支付函数的回调）
  checkPay: function (res) {
    let that = this;
    if (res.errMsg == "requestPayment:ok") { //如果支付成功
      wx.showLoading({
        title: '检查支付中',
      })
      setTimeout(function () {
        wx.hideLoading();
        wx.redirectTo({
          url: "/pages/orderDetail/orderDetail?orderSn=" + that.data.currentOrderSn
        })
      }, 2000)
    } else {
      wx.showToast({
        title: '支付失败，请重新支付',
        success: function () {
          wx.redirectTo({
            url: "/pages/orderDetail/orderDetail?orderSn=" + that.data.currentOrderSn
          })
        }
      })
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
   
    this.getInsurance() //获取保险价格
    this.getSijiPrice() //获取司机价格
    this.getDriverInfo(app.globalData.userid) //获取驾驶员信息

    //设置取车还车的时间地点，从全局参数获取
    this.setData({
      pickUpAddress: app.globalData.pickUpAddress,
      returnAddress: app.globalData.returnAddress,
      pickUpTime: util.formatTimestamp(app.globalData.pickUpTime),
      returnTime: util.formatTimestamp(app.globalData.returnTime)
    })
    //初始化checkOutData
    checkOutData.userid = app.globalData.userid;
    checkOutData.pickUpAddress = app.globalData.pickUpAddress
    checkOutData.pickUpTime = app.globalData.pickUpTime
    checkOutData.returnAddress = app.globalData.returnAddress
    checkOutData.returnTime = app.globalData.returnTime
    checkOutData.driver_price = 0
    checkOutData.carId = options.carId
    checkOutData.insurancePrice = 1
    console.log(checkOutData)
    this.checkOut(checkOutData)
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
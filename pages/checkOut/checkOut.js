// pages/checkOut/checkOut.js

//引入请求js文件
import wxPay from "../../utils/wxPay.js";
const { request, uploadFile } = require('../../utils/request.js');
const util = require('../../utils/util.js');


// 获取应用实例
const app = getApp();

// 定义结算参数结构
let checkOutData = {
  // userid / contact_phone / insurancePrice / pickUpTime / returnTime /
  // pickUpAddress / returnAddress / driver_price / carId
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
    paying: false, //支付提交锁（B-12 防重复提交）
    checkoutInfo: {}, //结算信息
    currentOrderSn: ''
  },

  //获取司机费用,初始化
  getSijiPrice() {
    request({
      url: '/getDriverPrice'
    }).then((data) => {
      this.setData({
        'siji_info.siji_price': data.driver_price
      })
    })
  },

  //获取保险费用
  getInsurance() {
    request({
      url: '/getInsurancePrice'
    }).then((data) => {
      this.setData({
        'insuranceInfo.insurancePrice_l1': data.insurancePrice_l1,
        'insuranceInfo.insurancePrice_l2': data.insurancePrice_l2
      })
    })
  },

  //用户勾选 或 取消勾选 升级保险（B-05：修复重复计价请求）
  checkedTap() {
    if (this.data.insuranceInfo.radio_upgrade == false) {
      checkOutData.insurancePrice = this.data.insuranceInfo.insurancePrice_l2;
      this.setData({
        'insuranceInfo.radio_upgrade': true
      })
    } else {
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
    } else {
      checkOutData.driver_price = 0;
      this.setData({
        'siji_info.siji_server': false
      })
    }
    this.checkOut(checkOutData)
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
    request({
      url: '/getUserDriverInfo',
      data: {
        uid: uid
      }
    }).then((data) => {
      if (data) {
        this.setData({
          "driver_info.driver_idcard_birth": data.driver_idcard_birth,
          "driver_info.driver_idcard_url": data.driver_idcard_url,
          "driver_info.driver_idcard_name": data.driver_idcard_name,
          "driver_info.driver_idcard_number": data.driver_idcard_number,
          idcard_text: true,
          idcard_result: false
        })
      }
    })
  },

  updateDriverInfo(driver_idcard_name, driver_idcard_number, driver_idcard_url, driver_idcard_birth, uid) {
    request({
      url: '/updateUserDriverInfo',
      data: {
        uid: uid,
        driver_idcard_name: driver_idcard_name,
        driver_idcard_number: driver_idcard_number,
        driver_idcard_url: driver_idcard_url,
        driver_idcard_birth: driver_idcard_birth
      }
    }).then((data) => {
      console.log(data);
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
        uploadFile('/upload', res.tempFiles[0].tempFilePath).then((uploadRes) => {
          console.log(uploadRes); //打印上传文件结果
          that.data.driver_info.driver_idcard_url = uploadRes.path; //设置驾驶员身份证的图片路径到本地
          if (uploadRes.code != 200) {
            wx.showToast({
              title: '上传失败请重试',
              icon: 'none'
            })
            return;
          }
          wx.showLoading({
            title: '正在校验身份证号，请稍等',
            mask: true
          })
          //获取身份证对应的姓名和身份证号码，传入图片url
          return request({
            url: '/getIdCardInfo',
            data: {
              img_url: uploadRes.path
            }
          });
        }).then((idRes) => {
          //上传失败分支会走到这里且 idRes 为空，跳过
          if (!idRes) {
            return;
          }
          wx.hideLoading();
          console.log(idRes);
          if (idRes.errcode == 0) {
            that.updateDriverInfo(idRes.name, idRes.id, that.data.driver_info.driver_idcard_url, idRes.birth, app.globalData.userid)
            wx.showToast({
              title: '校验成功',
            })
            that.setData({
              "driver_info.driver_idcard_name": idRes.name,
              "driver_info.driver_idcard_number": idRes.id,
              "driver_info.driver_idcard_birth": idRes.birth,
              idcard_text: true, //隐藏前端
              idcard_result: false //展示结果
            })
          } else {
            wx.showToast({
              title: '校验失败请重新上传',
              icon: 'none'
            })
          }
        }).catch((err) => {
          //OCR 请求失败或返回非法 JSON：保证 loading 关闭并给出提示，不再静默
          wx.hideLoading();
          console.log('身份证识别失败', err);
          wx.showToast({
            title: '校验失败请重新上传',
            icon: 'none'
          })
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
    request({
      url: '/checkout',
      data: {
        carId: checkOutData.carId,
        uid: checkOutData.userid,
        contact_phone: checkOutData.contact_phone,
        pickUpTime: checkOutData.pickUpTime,
        pickUpAddress: checkOutData.pickUpAddress,
        returnTime: checkOutData.returnTime,
        returnAddress: checkOutData.returnAddress,
        insurancePrice: checkOutData.insurancePrice,
        driver_price: checkOutData.driver_price
      }
    }).then((data) => {
      if (data.code == 201) {
        wx.showLoading({
          title: '缺少结算信息',
          success: function () {
            wx.navigateBack();
          }
        })
      }
      console.log(data);
      this.setData({
        checkoutInfo: data
      })
    })
  },

  // 发起支付
  goPay: function () {
    //防重复提交（B-12）
    if (this.data.paying) {
      return;
    }
    //判断合同是否同意
    if (this.data.is_agress == false) {
      wx.showToast({
        title: '请阅读同意合同',
      })
      return;
    }
    //把驾驶员信息设置进checkoutInfo里面一起提交订单
    this.data.checkoutInfo.driver_name = this.data.driver_info.driver_idcard_name;
    this.data.checkoutInfo.driver_idcard = this.data.driver_info.driver_idcard_number;
    this.data.checkoutInfo.driver_phone = this.data.driver_info.driver_contact_phone;
    this.data.checkoutInfo.extend = app.globalData.source;

    let that = this;
    this.setData({
      paying: true
    })
    request({
      url: '/createOrder',
      method: 'POST',
      data: {
        checkOutArray: that.data.checkoutInfo
      }
    }).then((data) => {
      that.setData({
        currentOrderSn: data.result.order_sn
      })
      console.log(data)
      console.log('going to pay...');
      let orderSn = data.result.order_sn;
      let totalFee = (data.result.total_price) * 100;
      console.log(totalFee);
      wxPay.wxPayment(app.globalData.openid, '庞派租车服务', totalFee, orderSn, that.checkPay)
    }).catch((err) => {
      //网络层失败释放提交锁，允许用户重试
      that.setData({
        paying: false
      })
    })
  },


  //检查支付是否成功（wxPay.js支付函数的回调）
  checkPay: function (res) {
    let that = this;
    //支付流程结束（无论成败），释放提交锁
    that.setData({
      paying: false
    })
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
        icon: 'none',
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
})

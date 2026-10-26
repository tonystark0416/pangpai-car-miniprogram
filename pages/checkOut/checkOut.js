// pages/checkOut/checkOut.js

//引入请求js文件
import wxPay from "../../utils/wxPay.js";
const { request, uploadFile } = require('../../utils/request.js');
const auth = require('../../utils/auth.js');
const util = require('../../utils/util.js');


// 获取应用实例
const app = getApp();

// 从身份证号解析出生日期（OCR 未返回 birth 时兜底）：第 7-14 位为 yyyyMMdd
function birthFromIdCard(idNumber) {
  if (!idNumber || String(idNumber).length < 14) {
    return '';
  }
  const id = String(idNumber);
  return id.substring(6, 10) + '-' + id.substring(10, 12) + '-' + id.substring(12, 14);
}

// 定义结算参数结构
let checkOutData = {
  // userid / contact_phone / insuranceLevel / pickUpTime / returnTime /
  // pickUpAddress / returnAddress / driver_price / carId
  // v1.6.18：保险改为传档位 insuranceLevel（l1 低档 / l2 高档，缺省 l1），不再传金额 insurancePrice
};

Page({
  /**
   * 页面数据
   */
  data: {
    //保险信息（v1.6.18：保险必买，低档 l1 / 高档 l2 二选一；金额按车辆配置，由接口返回）
    insuranceInfo: {
      level: 'l1', //当前选择的保险档位
      insurancePrice_l1: '',
      insurancePrice_l2: '',
      clean_price: '' //整备费（按车辆配置，一次性、不乘天数）
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
    currentOrderSn: '',
    //v1.7.3 优惠券
    couponSn:'',        //本单选中的券码（默认不选券）
    couponName:'',
    couponAmount:0,
    couponUsableCount:0, //本单可用券张数
    discountPrice:0,     //discount_price 优惠额
    payAmount:0          //pay_amount 实付（无券时 = total_price）
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

  //获取车辆费用配置（v1.6.18 新增 /getCarFee：一次取到整备费与两档保险日单价）
  //金额按车辆配置，不再是全局固定值（旧值 1/120），必须取接口返回，不能本地写死
  getCarFee(carId) {
    request({
      url: '/getCarFee',
      data: {
        carId: carId
      }
    }).then((data) => {
      //失败返回 400 {code:400, msg:'车辆不存在'}
      if (!data || data.code !== 200) {
        this.getInsurancePrice(carId) //回退：单独取保险档位金额
        return;
      }
      this.setData({
        'insuranceInfo.insurancePrice_l1': data.insurancePrice_l1,
        'insuranceInfo.insurancePrice_l2': data.insurancePrice_l2,
        'insuranceInfo.clean_price': data.clean_price
      })
    }).catch(() => {
      this.getInsurancePrice(carId)
    })
  },

  //获取保险价格档位（/getCarFee 不可用时的回退路径）
  getInsurancePrice(carId) {
    request({
      url: '/getInsurancePrice',
      data: {
        carId: carId //v1.6.18 起建议传，返回该车的配置金额
      }
    }).then((data) => {
      if (!data || data.code !== 200) {
        return;
      }
      this.setData({
        'insuranceInfo.insurancePrice_l1': data.insurancePrice_l1,
        'insuranceInfo.insurancePrice_l2': data.insurancePrice_l2
      })
    })
  },

  //切换保险档位（v1.6.18：保险必买，只能在 l1 / l2 之间二选一，B-05：避免重复计价请求）
  checkedTap(e) {
    const level = e.currentTarget.dataset.level;
    if (!level || level === this.data.insuranceInfo.level) {
      return;
    }
    checkOutData.insuranceLevel = level;
    this.setData({
      'insuranceInfo.level': level
    })
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
      //无记录时后端返回裸数字 -1（不是 code 结构），需按对象判断，否则会把 undefined 写进表单
      if (data && typeof data === 'object' && data.id) {
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
      //返回裸数字：0 成功 / -1 失败
      console.log(data);
      if (Number(data) !== 0) {
        wx.showToast({
          title: '身份信息保存失败',
          icon: 'none'
        })
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
          //成功返回 {type, name, id, ...}（不一定带 errcode）；失败才带 errcode（如 101000 invalid image url）
          const ocrOk = idRes && (idRes.errcode === undefined || idRes.errcode === 0) && idRes.id;
          if (ocrOk) {
            //部分 OCR 结果不含 birth，从身份证号第 7-14 位兜底解析出生日期
            const birth = idRes.birth || birthFromIdCard(idRes.id);
            that.updateDriverInfo(idRes.name, idRes.id, that.data.driver_info.driver_idcard_url, birth, app.globalData.userid)
            wx.showToast({
              title: '校验成功',
            })
            that.setData({
              "driver_info.driver_idcard_name": idRes.name,
              "driver_info.driver_idcard_number": idRes.id,
              "driver_info.driver_idcard_birth": birth,
              idcard_text: true, //隐藏前端
              idcard_result: false //展示结果
            })
          } else {
            wx.showToast({
              title: (idRes && idRes.errmsg) || '校验失败请重新上传',
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
    //v1.6.12 后端新增校验，前端先做前置拦截避免无效请求
    if (Number(checkOutData.returnTime) <= Number(checkOutData.pickUpTime)) {
      wx.showToast({
        title: '还车时间必须晚于取车时间',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack();
      }, 1500)
      return;
    }
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
        insuranceLevel: checkOutData.insuranceLevel, //v1.6.18：传档位 l1/l2，不再传金额
        driver_price: checkOutData.driver_price,
        couponSn: checkOutData.couponSn || '' //v1.7.3：不传 = 不享受优惠（默认不选券）
      }
    }).then((data) => {
      //成功返回裸对象（无 code 包裹）；失败带 code + msg：
      // -1 参数缺失；400 还车时间必须晚于取车时间 / 取车·还车时间不合法 /
      // 司机费用不合法（0/400）/ 车辆不存在，无法结算 / 车辆整备费配置异常，请联系客服
      if (!data || (data.code !== undefined && data.code !== 200)) {
        //带券结算被拒（券已使用/已过期/不适用该车辆/订单金额未大于面额等）：
        //提示原因后去掉券重新计价，并刷新券包，不让用户卡在错误状态
        if (checkOutData.couponSn) {
          wx.showToast({
            title: (data && data.msg) || '优惠券不可用',
            icon: 'none',
            duration: 2500
          })
          checkOutData.couponSn = '';
          this.setData({
            couponSn: '',
            couponName: '',
            couponAmount: 0
          })
          this.checkOut(checkOutData)
          this.getUserCoupons()
          return;
        }
        wx.showToast({
          title: (data && data.msg) || '缺少结算信息',
          icon: 'none',
          duration: 2500
        })
        setTimeout(() => {
          wx.navigateBack();
        }, 1800)
        return;
      }
      console.log(data);
      //v1.7.3：total_price 是原价，实付一律用 pay_amount（无券时两者相等）
      const totalPrice = Number(data.total_price) || 0;
      this.setData({
        checkoutInfo: data,
        discountPrice: Number(data.discount_price) || 0,
        payAmount: data.pay_amount !== undefined && data.pay_amount !== null
          ? Number(data.pay_amount)
          : totalPrice
      })
      this.getUserCoupons()
    })
  },

  //本单可用券（v1.7.3 GET /getUserCoupons，结算页必传 amount = 不带券的 total_price）
  getUserCoupons() {
    const uid = auth.getUid();
    const totalPrice = Number(this.data.checkoutInfo.total_price) || 0;
    if (!uid || !totalPrice) {
      return;
    }
    request({
      url: '/getUserCoupons',
      data: {
        uid: uid,
        carId: checkOutData.carId,
        amount: totalPrice
      }
    }).then((data) => {
      if (!data || data.code !== 200) {
        return;
      }
      const list = (data.result || []).map((item) => Object.assign({}, item, {
        usable: !!item.usable
      }));
      this.setData({
        couponUsableCount: list.filter((item) => item.usable).length
      })
    })
  },

  //打开券包选券：券页回传券码后带券重新计价
  openCouponPage() {
    const totalPrice = Number(this.data.checkoutInfo.total_price) || 0;
    if (!totalPrice) {
      return;
    }
    let that = this;
    wx.navigateTo({
      url: '/pages/coupon/coupon?select=1&carId=' + checkOutData.carId + '&amount=' + totalPrice,
      events: {
        //券页点选可用券后回调
        selectCoupon: function (coupon) {
          that.applyCoupon(coupon && coupon.couponSn ? coupon.couponSn : '')
        }
      }
    })
  },

  //应用/取消券：券码变化才重新计价，避免无谓请求
  applyCoupon(couponSn) {
    if (checkOutData.couponSn === couponSn) {
      return;
    }
    checkOutData.couponSn = couponSn;
    this.setData({
      couponSn: couponSn
    })
    this.checkOut(checkOutData)
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
    //v1.7.3：contact_phone 为必填强校验，未填/格式不对后端直接 400，这里先拦并给出明确提示
    const contactPhone = String(this.data.contact_phone || '').replace(/\D/g, '');
    if (!/^1[3-9]\d{9}$/.test(contactPhone)) {
      wx.showToast({
        title: contactPhone ? '手机号格式不正确' : '请填写联系人手机号',
        icon: 'none'
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
      // v1.6.8/v1.6.12：下单失败会返回 {code:400, msg}（车辆已下架/不存在、
      // 还车时间早于取车、保险或司机金额不在白名单等），先判失败再取 result
      if (!data || data.code === 400 || data.code === 500 || !data.result) {
        wx.showToast({
          title: (data && data.msg) || '下单失败，请重试',
          icon: 'none',
          duration: 2500
        })
        that.setData({
          paying: false
        })
        return;
      }
      const order = data.result;
      that.setData({
        currentOrderSn: order.order_sn
      })
      //金额以服务端重算为准，本地结算值仅用于展示，此处留痕便于排查差异
      if (Number(that.data.checkoutInfo.total_price) !== Number(order.total_price)) {
        console.log('服务端金额与本地结算不一致，以服务端为准：', that.data.checkoutInfo.total_price, '→', order.total_price);
      }
      console.log(data)
      console.log('going to pay...');
      // v1.6.12：金额以服务端重算结果为准，不能用本地 checkoutInfo 的计算值，否则支付回调核验会失败
      // v1.7.3：用券订单必须传实付 pay_amount（服务端会校验 totalFee === pay_amount×100），
      //         继续用 total_price 会被拦截并提示「支付金额与订单金额不一致」
      const payAmount = (order.pay_amount !== undefined && order.pay_amount !== null)
        ? Number(order.pay_amount)
        : Number(order.total_price);
      // totalFee 单位：分
      let totalFee = payAmount * 100;
      console.log(totalFee);
      wxPay.wxPayment(app.globalData.openid, '庞派租车服务', totalFee, order.order_sn, that.checkPay)
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
    const orderSn = that.data.currentOrderSn;
    const goDetail = function () {
      wx.redirectTo({
        url: "/pages/orderDetail/orderDetail?orderSn=" + orderSn
      })
    }
    if (res.errMsg == "requestPayment:ok") { //如果支付成功
      //改为查询后端支付结果，替代原来固定等待 2 秒的盲等
      wx.showLoading({
        title: '确认支付结果中',
        mask: true
      })
      request({
        url: '/queryWxPayOrder',
        data: {
          outTradeNo: orderSn
        }
      }).then((payRes) => {
        wx.hideLoading();
        const paid = payRes && payRes.success && payRes.data && payRes.data.trade_state === 'SUCCESS';
        wx.showToast({
          title: paid ? '支付成功' : '支付结果确认中',
          icon: 'none'
        })
        goDetail()
      }).catch(() => {
        wx.hideLoading();
        goDetail()
      })
    } else {
      wx.showToast({
        title: '支付失败，请重新支付',
        icon: 'none',
        success: function () {
          goDetail()
        }
      })
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

    this.getCarFee(options.carId) //获取车辆费用配置（整备费 + 两档保险日单价）
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
    checkOutData.insuranceLevel = 'l1' //v1.6.18：保险必买，默认低档
    checkOutData.couponSn = '' //v1.7.3：默认不使用优惠券，由用户在券包手动选择
    console.log(checkOutData)
    this.checkOut(checkOutData)
  },
})

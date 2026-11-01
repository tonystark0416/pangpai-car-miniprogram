// pages/carDetail/carDetail.js 车辆详情（v1.7.5 新增 /getCarInfo；v1.7.6 新增 images/tags/config）
// 位置：首页车辆列表 → 本页（浏览 + 试算）→ 结算页
// 金额口径：一律用服务端返回的 pay_amount，前端不做任何价格计算

const { request } = require('../../utils/request.js');
const auth = require('../../utils/auth.js');
const app = getApp();

//金额展示：整数不带小数，小数保留两位
function fmtMoney(value) {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function pad2(n) {
  return n < 10 ? ('0' + n) : String(n);
}

//取还时间兼容解析：毫秒时间戳 / "yyyy-MM-dd HH:mm:ss" / ISO 字符串
//iOS 的 JS 引擎不认 "2026-11-01 10:00:00"（横杠格式），必须先转成斜杠，否则渲染成 NaN（乱码）
function parseTime(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const str = String(value);
  if (/^\d+$/.test(str)) {
    return new Date(Number(str));
  }
  const normalized = str.replace(/-/g, '/').replace('T', ' ').split('.')[0];
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? null : date;
}

//展示为「11月01日 10:00」
function fmtTimeText(value) {
  const date = parseTime(value);
  if (!date) {
    return '';
  }
  return (date.getMonth() + 1) + '月' + date.getDate() + '日 ' + pad2(date.getHours()) + ':' + pad2(date.getMinutes());
}

Page({

  data: {
    carId: '',
    car: {},
    images: [],      //轮播图（v1.7.6 images；为空时回退主图）
    tags: [],        //车辆标签（v1.7.6）
    configList: [],  //车辆配置：Object → [{key, value}]（v1.7.6）
    feeRows: [],     //费用明细（金额全部来自服务端）

    rentDay: 0,
    totalPrice: 0,   //原价
    discountPrice: 0, //券抵扣
    payAmount: 0,    //实付（券后价）

    bestCoupon: null,  //本次可用且抵扣最多的一张（仅展示，不锁定）
    couponCount: 0,    //该车可用券张数
    isLogin: false,
    //取还车时间（分别展示具体时刻 + 计算出的天数）
    pickUpTimeTxt: '',
    returnTimeTxt: '',
    hasTime: false,
    //保险档位（v1.6.18 必买，l1/l2 二选一，不可取消）
    insuranceLevel: 'l1',
    insurancePriceL1: '',
    insurancePriceL2: '',
    loading: true,
    errorMsg: ''
  },

  onLoad(options) {
    const carId = options.carId || '';
    this.setData({
      carId: carId
    })
    if (!carId) {
      this.setData({
        loading: false,
        errorMsg: '缺少车辆参数'
      })
      return;
    }
    this.setData({
      isLogin: auth.isLogin()
    })
    this.getCarFee(carId) //两档保险日单价（用于「租车保险」可选档位）
    this.loadDetail()
  },

  //车辆费用配置（v1.6.18 /getCarFee）：一次取整备费与两档保险日单价，金额取接口不写死
  getCarFee(carId) {
    request({
      url: '/getCarFee',
      data: {
        carId: carId
      }
    }).then((data) => {
      if (!data || data.code !== 200) {
        this.getInsurancePrice(carId) //回退：单独取保险档位金额
        return;
      }
      this.setData({
        insurancePriceL1: fmtMoney(data.insurancePrice_l1),
        insurancePriceL2: fmtMoney(data.insurancePrice_l2)
      })
    }).catch(() => {
      this.getInsurancePrice(carId)
    })
  },

  //回退路径：/getCarFee 不可用时单独取保险档位金额
  getInsurancePrice(carId) {
    request({
      url: '/getInsurancePrice',
      data: {
        carId: carId
      }
    }).then((data) => {
      if (!data || data.code !== 200) {
        return;
      }
      this.setData({
        insurancePriceL1: fmtMoney(data.insurancePrice_l1),
        insurancePriceL2: fmtMoney(data.insurancePrice_l2)
      })
    })
  },

  //切换保险档位：l1 基础保障 / l2 升级优享（保险必买，二者二选一），切换后重新试算
  switchInsurance(e) {
    const level = e.currentTarget.dataset.level;
    if (!level || level === this.data.insuranceLevel) {
      return;
    }
    this.setData({
      insuranceLevel: level
    })
    this.loadDetail()
  },

  //登录后回到本页：登录态变了要重新拉（传 uid 才能拿到券后价）
  onShow() {
    const isLogin = auth.isLogin();
    if (isLogin !== this.data.isLogin && this.data.carId) {
      this.setData({
        isLogin: isLogin
      })
      this.loadDetail()
    }
  },

  //车辆详情 + 试算：GET /getCarInfo
  loadDetail() {
    const carId = this.data.carId;
    if (!carId) {
      return;
    }
    this.setData({
      loading: true,
      errorMsg: ''
    })
    const uid = auth.getUid();
    const params = {
      carId: carId
    };
    //uid 选填：未登录 = 匿名浏览（best_coupon=null、coupon_count=0），未登录时不要传
    if (uid) {
      params.uid = uid;
    }
    //取还时间选填：都不传时后端按默认 1 天算参考价
    if (app.globalData.pickUpTime) {
      params.pickUpTime = app.globalData.pickUpTime;
    }
    if (app.globalData.returnTime) {
      params.returnTime = app.globalData.returnTime;
    }
    params.insuranceLevel = this.data.insuranceLevel; //v1.6.18 保险必买，l1/l2 二选一
    params.driver_price = 0; //详情页只做试算，默认不带司机
    request({
      url: '/getCarInfo',
      data: params
    }).then((data) => {
      console.log('[API] 车辆详情响应：');
      console.log(data);
      this.setData({
        loading: false
      })
      //失败：400 缺少参数：carId / 车辆不存在 / 该车辆已下架，暂不可预订 / 计价类错误
      if (!data || data.code !== 200 || !data.data) {
        this.setData({
          errorMsg: (data && data.msg) || '车辆信息加载失败'
        })
        return;
      }
      const car = data.data;
      //三个字段恒为数组/对象，仍做兜底防御老后端
      const images = (Array.isArray(car.images) && car.images.length > 0)
        ? car.images.filter((item) => !!item)
        : (car.image_url ? [car.image_url] : []);
      const tags = Array.isArray(car.tags) ? car.tags.filter((item) => !!item) : [];
      const config = (car.config && typeof car.config === 'object') ? car.config : {};
      const configList = Object.keys(config).map((key) => ({
        key: key,
        value: config[key]
      }));
      const totalPrice = Number(data.total_price) || 0;
      const discountPrice = Number(data.discount_price) || 0;
      const payAmount = (data.pay_amount !== undefined && data.pay_amount !== null)
        ? Number(data.pay_amount)
        : totalPrice;
      const rentDay = Number(data.rentDay) || 0;

      //费用明细：只做展示，金额全部取服务端返回值
      const feeRows = [];
      feeRows.push({
        name: '车辆租金',
        value: '¥' + fmtMoney(data.rent_total_price),
        desc: '¥' + fmtMoney(data.rent_day_price) + '/天 × ' + rentDay + '天'
      });
      feeRows.push({
        name: '租车保险（' + (this.data.insuranceLevel === 'l2' ? '升级优享' : '基础保障') + '）',
        value: '¥' + fmtMoney(data.server_total_price),
        desc: '¥' + fmtMoney(data.server_day_price) + '/天 × ' + rentDay + '天'
      });
      if (Number(data.driver_total_price) > 0) {
        feeRows.push({
          name: '司机服务',
          value: '¥' + fmtMoney(data.driver_total_price),
          desc: '¥' + fmtMoney(data.driver_price) + '/天 × ' + rentDay + '天'
        });
      }
      feeRows.push({
        name: '车辆整备费',
        value: '¥' + fmtMoney(data.clean_price),
        desc: '一次性收取，不乘天数'
      });
      if (discountPrice > 0) {
        feeRows.push({
          name: '优惠券',
          value: '-¥' + fmtMoney(discountPrice),
          desc: (data.best_coupon && data.best_coupon.name) || '',
          cut: true
        });
      }

      this.setData({
        car: car,
        images: images,
        tags: tags,
        configList: configList,
        feeRows: feeRows,
        rentDay: rentDay,
        totalPrice: totalPrice,
        discountPrice: discountPrice,
        payAmount: payAmount,
        bestCoupon: data.best_coupon || null,
        couponCount: Number(data.coupon_count) || 0,
        pickUpTimeTxt: fmtTimeText(data.pickUpTime || app.globalData.pickUpTime),
        returnTimeTxt: fmtTimeText(data.returnTime || app.globalData.returnTime),
        hasTime: !!(app.globalData.pickUpTime && app.globalData.returnTime)
      })
    }).catch(() => {
      this.setData({
        loading: false,
        errorMsg: '网络异常，请稍后重试'
      })
    })
  },

  //去下单：入口强校验登录态与取还地址（v1.7.0 口径，校验点从首页卡片下移到本页）
  goOrder() {
    const carId = this.data.carId;
    if (!auth.ensureLogin('/pages/checkOut/checkOut?carId=' + carId, '完成租车业务需要先登录，登录后可继续下单。')) {
      return;
    }
    if (!app.globalData.pickUpAddress || !app.globalData.returnAddress) {
      wx.showToast({
        title: '请先输入取车和还车地址',
        icon: 'none'
      })
      return;
    }
    wx.navigateTo({
      url: '/pages/checkOut/checkOut?carId=' + carId
    })
  },

  //未登录时引导登录，登录后回到本页继续看券后价
  goLogin() {
    auth.goLogin('/pages/carDetail/carDetail?carId=' + this.data.carId)
  },

  //轮播图预览
  previewImage(e) {
    const current = e.currentTarget.dataset.src;
    if (!current || this.data.images.length === 0) {
      return;
    }
    wx.previewImage({
      current: current,
      urls: this.data.images
    })
  },

  //加载失败重试
  retry() {
    this.loadDetail()
  }
})

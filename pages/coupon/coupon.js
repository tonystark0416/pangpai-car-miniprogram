// pages/coupon/coupon.js 优惠券（我的券包 + 领券中心）
// v1.7.3：/getUserCoupons（我的券包）、/getCouponList（可领批次）、/receiveCoupon（领券）
// select=1 时由结算页打开，点选可用券后通过 eventChannel 回传券码

const { request } = require('../../utils/request.js');
const auth = require('../../utils/auth.js');
const util = require('../../utils/util.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    selectMode:false, //结算页选券模式
    carId:'',
    amount:'',
    tabIndex:0, //0 我的券包 / 1 领券中心
    myCoupons:[],
    centerList:[],
    usableCount:0,
    selectedSn:'',
    loading:false,
    receiving:false
  },

  //切换 tab
  switchTab(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (index === this.data.tabIndex) {
      return;
    }
    this.setData({
      tabIndex: index
    })
    if (index === 1) {
      this.getCouponCenter()
    } else {
      this.getMyCoupons()
    }
  },

  //我的券包：结算页场景必须传 carId + amount，服务端据此算 usable 与不可用原因
  getMyCoupons() {
    const uid = auth.getUid();
    if (!uid) {
      this.setData({
        myCoupons: [],
        usableCount: 0
      })
      return;
    }
    const params = {
      uid: uid
    };
    if (this.data.selectMode) {
      params.carId = this.data.carId;
      params.amount = this.data.amount; //本次订单原价（不带券的 total_price）
    }
    this.setData({
      loading: true
    })
    request({
      url: '/getUserCoupons',
      data: params
    }).then((data) => {
      this.setData({
        loading: false
      })
      if (!data || data.code !== 200) {
        this.setData({
          myCoupons: [],
          usableCount: 0
        })
        return;
      }
      const list = (data.result || []).map((item) => {
        return Object.assign({}, item, {
          usable: !!item.usable,
          useTimeTxt: util.formatDate(item.use_start_time) + ' - ' + util.formatDate(item.use_end_time)
        });
      });
      this.setData({
        myCoupons: list,
        usableCount: list.filter((item) => item.usable).length
      })
    }).catch(() => {
      this.setData({
        loading: false
      })
    })
  },

  //领券中心：可领取的券批次
  getCouponCenter() {
    const uid = auth.getUid();
    if (!uid) {
      this.setData({
        centerList: []
      })
      return;
    }
    request({
      url: '/getCouponList',
      data: {
        uid: uid
      }
    }).then((data) => {
      if (!data || data.code !== 200) {
        this.setData({
          centerList: []
        })
        return;
      }
      const list = (data.result || []).map((item) => {
        const canReceive = !!item.can_receive;
        return Object.assign({}, item, {
          can_receive: canReceive,
          btnTxt: canReceive ? '立即领取' : (Number(item.remain_stock) > 0 ? '已领取' : '已领完'),
          useTimeTxt: util.formatDate(item.use_start_time) + ' - ' + util.formatDate(item.use_end_time)
        });
      });
      this.setData({
        centerList: list
      })
    })
  },

  //领取优惠券
  receiveCoupon(e) {
    const uid = auth.getUid();
    if (!uid) {
      auth.goLogin('/pages/coupon/coupon')
      return;
    }
    const index = Number(e.currentTarget.dataset.index);
    const item = this.data.centerList[index];
    if (!item || !item.can_receive || this.data.receiving) {
      return;
    }
    this.setData({
      receiving: true
    })
    wx.showLoading({
      title: '领取中',
      mask: true
    })
    request({
      url: '/receiveCoupon',
      method: 'POST',
      data: {
        uid: uid,
        couponId: item.coupon_id
      }
    }).then((data) => {
      wx.hideLoading();
      this.setData({
        receiving: false
      })
      if (data && data.code === 200) {
        wx.showToast({
          title: data.msg || '领取成功',
          icon: 'success',
          mask: true
        })
        this.getCouponCenter() //刷新库存与限领状态
        this.getMyCoupons()
      } else {
        wx.showToast({
          title: (data && data.msg) || '领取失败，请稍后重试',
          icon: 'none',
          duration: 2500
        })
      }
    }).catch(() => {
      wx.hideLoading();
      this.setData({
        receiving: false
      })
    })
  },

  //点选券：选券模式下把券码回传给结算页；浏览模式下点击不可用券给出原因
  onSelectCoupon(e) {
    const index = Number(e.currentTarget.dataset.index);
    const item = this.data.myCoupons[index];
    if (!item) {
      return;
    }
    if (!this.data.selectMode) {
      return;
    }
    if (!item.usable) {
      wx.showToast({
        title: item.unusable_reason || '该券本次不可用',
        icon: 'none',
        duration: 2500
      })
      return;
    }
    this.setData({
      selectedSn: item.coupon_sn
    })
    //回传给结算页（wx.navigateTo 的 events 通道）
    if (this.eventChannel) {
      this.eventChannel.emit('selectCoupon', {
        couponSn: item.coupon_sn,
        name: item.name,
        amount: item.amount
      });
    }
    wx.navigateBack();
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    //结算页打开：?select=1&carId=xx&amount=原价
    this.setData({
      selectMode: options.select === '1',
      carId: options.carId || '',
      amount: options.amount || ''
    })
    if (this.getOpenerEventChannel) {
      this.eventChannel = this.getOpenerEventChannel();
    }
  },

  onShow() {
    if (!auth.isLogin()) {
      auth.ensureLogin('/pages/coupon/coupon', '查看和使用优惠券需要先登录。')
      this.setData({
        myCoupons: [],
        centerList: []
      })
      return;
    }
    this.getMyCoupons();
    if (!this.data.selectMode && this.data.tabIndex === 1) {
      this.getCouponCenter()
    }
  }
})

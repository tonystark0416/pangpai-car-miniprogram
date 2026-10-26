// pages/center/center.js 个人中心

const auth = require('../../utils/auth.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    isLogin:false,
    avatarUrl:'', //头像（后端/微信侧提供），为空则展示默认头像
    nickname:'尊贵的车主', //昵称默认值
    phone:'', //绑定手机号，为空则不展示该行
    menus:[
      { key:'coupon', name:'我的优惠券', icon:'券', iconClass:'ic_coupon' },
      { key:'kefu', name:'联系客服', icon:'客', iconClass:'ic_kefu' },
      { key:'earn', name:'闲置车赚钱', icon:'车', iconClass:'ic_earn' }
    ]
  },

  //未登录时点击头像/昵称区域 → 去登录，登录后回到个人中心
  onProfileTap() {
    if (this.data.isLogin) {
      return;
    }
    auth.goLogin('/pages/center/center')
  },

  //功能入口：优惠券跳转券页，其余为待开发能力
  onMenuTap(e) {
    const key = e.currentTarget.dataset.key;
    if (key === 'coupon') {
      //v1.7.3：我的优惠券（券包 + 领券中心）
      if (!auth.isLogin()) {
        auth.ensureLogin('/pages/coupon/coupon', '查看和使用优惠券需要先登录。')
        return;
      }
      wx.navigateTo({
        url: '/pages/coupon/coupon'
      })
      return;
    }
    const name = e.currentTarget.dataset.name || '该功能';
    wx.showToast({
      title: name + '开发中',
      icon: 'none',
      duration: 2000
    })
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    const isLogin = auth.isLogin();
    //头像/昵称/手机号取本地缓存（登录时写入），均可能为空 → 展示默认值
    const avatarUrl = wx.getStorageSync('avatarUrl') || '';
    const nickname = wx.getStorageSync('nickname') || '';
    const phone = wx.getStorageSync('phone') || '';
    this.setData({
      isLogin: isLogin,
      avatarUrl: avatarUrl,
      nickname: nickname || '尊贵的车主', //昵称缺省：尊贵的车主
      phone: isLogin ? phone : '' //未登录不展示手机号
    })
  }
})

// pages/login/login.js

const { request } = require('../../utils/request.js');
const auth = require('../../utils/auth.js');
const config = require('../../utils/config.js');

// 获取应用实例
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    agreement:false, //协议默认不勾选，由用户手动勾选后才可登录
    redirect:'', //登录成功后要回到的页面路径（由入口传入）
    logining:false //防重复提交
  },

  //协议勾选（B-17：改为真实开关）
  agreementChange(e) {
    this.setData({
      agreement: e.detail.value.indexOf('agree') > -1
    })
  },

  //查看《会员注册协议》：复用合同 web-view 页，仅放行本站域名
  goAgreement() {
    const url = config.BASE_URL + '/agreement/membership.html';
    wx.navigateTo({
      url: '/pages/contract/contract?url=' + encodeURIComponent(url)
    })
  },

  //未勾选协议时点「手机号一键登录」：仅弹窗提示，不触发微信手机号授权（审核合规：未经用户同意不发起登录）
  onLoginTap() {
    wx.showModal({
      title: '提示',
      content: '请先阅读并勾选《庞派租车会员注册协议》',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  //手机号一键登录/注册（v1.7.0 GET /loginByPhone：该手机号已注册则登录，未注册则建号并绑定 openid）
  //能走到这里说明协议已勾选（未勾选时渲染的是普通按钮 onLoginTap），双保险再校验一次
  getPhoneNumber (e) {
    if (!this.data.agreement) {
      this.onLoginTap();
      return;
    }
    if (this.data.logining) {
      return;
    }
    //e.detail.code 为一次性动态令牌，不能缓存；用户拒绝授权时没有 code
    const phoneCode = e.detail.code;
    if (!phoneCode) {
      wx.showToast({
        title: '需要授权手机号才能登录',
        icon: 'none'
      })
      return;
    }
    this.setData({
      logining: true
    })
    wx.showLoading({
      title: '登录中',
      mask: true
    })
    //登录/注册需要 openid 做绑定，缺失时现取
    auth.ensureOpenid().then((identify) => {
      return request({
        url: '/loginByPhone',
        data: {
          code: phoneCode,
          openid: identify.openid,
          unionid: identify.unionid
        }
      })
    }).then((data) => {
      wx.hideLoading();
      this.setData({
        logining: false
      })
      //成功 {code:200, msg:'登陆成功', result:{id, phone, ...}}；result.id 即 uid
      if (data && data.code === 200 && data.result && data.result.id) {
        app.globalData.userid = data.result.id;
        wx.setStorageSync('uid', data.result.id);
        //个人中心展示用：手机号必存，昵称/头像后端有则返回（缺省在页面侧展示默认值）
        const userInfo = data.result || {};
        const phone = userInfo.phone || userInfo.phone_number || '';
        const nickname = userInfo.nickname || userInfo.nick_name || '';
        const avatarUrl = userInfo.avatar || userInfo.avatar_url || userInfo.headimgurl || '';
        if (phone) {
          wx.setStorageSync('phone', phone);
        }
        if (nickname) {
          wx.setStorageSync('nickname', nickname);
        }
        if (avatarUrl) {
          wx.setStorageSync('avatarUrl', avatarUrl);
        }
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          mask: true,
          duration: 1200
        })
        setTimeout(() => {
          auth.backAfterLogin(this.data.redirect)
        }, 1000)
        return;
      }
      //失败统一按 msg 提示：40029 code 失效需重新授权、已绑定其他账号需联系客服、500 注册失败
      wx.showToast({
        title: (data && data.msg) || '登录失败，请重试',
        icon: 'none',
        duration: 2500
      })
    }).catch(() => {
      wx.hideLoading();
      this.setData({
        logining: false
      })
      wx.showToast({
        title: '网络异常，请稍后重试',
        icon: 'none'
      })
    })
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    //入口页传入的回跳地址（已 URI 编码）
    this.setData({
      redirect: options.redirect ? decodeURIComponent(options.redirect) : ''
    })
  }
})

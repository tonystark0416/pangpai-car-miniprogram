// pages/login/login.js

const { request } = require('../../utils/request.js');
const auth = require('../../utils/auth.js');

// 获取应用实例
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    agreement:true,
    redirect:'', //登录成功后要回到的页面路径（由入口传入）
    logining:false //防重复提交
  },

  //协议勾选（B-17：改为真实开关）
  agreementChange(e) {
    this.setData({
      agreement: e.detail.value.indexOf('agree') > -1
    })
  },

  //手机号一键登录/注册（v1.7.0 GET /loginByPhone：该手机号已注册则登录，未注册则建号并绑定 openid）
  getPhoneNumber (e) {
    if (!this.data.agreement) {
      wx.showToast({
        title: '请同意协议',
      })
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

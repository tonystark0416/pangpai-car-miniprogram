// app.js

const { request } = require("utils/request.js");

App({
  globalData: {
    userInfo: null,
    userid: null,
    openid: null,
    pickUpTime:'',
    returnTime:'',
    pickUpAddress:'',
    returnAddress:'',
    source:'' //分享/渠道来源（B-14：补充声明）
  },

  onLaunch() {
    let that = this;
    // 小程序登录：code 换 openid → tryLogin 静默登录
    wx.login({
      success: function(res) {
        console.log('这是登陆code：'+res.code)
        request({
          url: '/getOpenid?code=' + res.code
        }).then(function(data) {
          //失败返回 {code:201, msg:'缺少code参数'}；code 失效时 result 中为微信错误码（如 40029）
          const result = (data && data.result) || {};
          const openid = result.openid;
          if (!openid) {
            console.log('获取 openid 失败', data);
            return null; //中断后续 tryLogin
          }
          console.log('这是openid：'+openid)
          wx.setStorageSync('openid', openid); //保存openid到本地
          that.globalData.openid = openid;  //设置全局变量openid，用于后续页面应用
          if (that.checkLoginReadyCallback) {
            that.checkLoginReadyCallback(openid);
          }
          //拿到openid后，请求trylogin接口（unionid 可选，有则传，便于跨小程序识别同一用户）
          return request({
            url: '/tryLogin',
            data: {
              openid: openid,
              unionid: result.unionid || ''
            }
          });
        }).then(function(data) {
          if (!data) {
            return;
          }
          if (data && data.result && data.result.id) {
            that.globalData.userid = data.result.id; //设置全局变量userid，用于后续页面应用
            wx.setStorageSync('uid', data.result.id);  //保存userid到本地
          } else {
            console.log('tryLogin失败', data && data.msg);
          }
        }).catch(function(err) {
          console.log('登录流程请求失败', err);
        });
      }
    })
  }

})

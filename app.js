// app.js

import http from "utils/http.js";


App({
  globalData: {
    userInfo: null,
    userid: null,
    openid: null,
    pickUpTime:'',
    returnTime:'',
    pickUpAddress:'',
    returnAddress:''
  },

  onLaunch() {
    let that = this;
    // 小程序登录
      wx.login({
        success: function(res) {
          console.log('这是登陆code：'+res.code)
          // 发送 res.code 到后台换取 openId, sessionKey, unionId
          let url  = 'https://pangpai-car.com/getOpenid?code='+res.code;
          http.getReq(url,function(res) {
            console.log('这是openid：'+res.result.openid)
            wx.setStorageSync('openid', res.result.openid); //保存openid到本地
            that.globalData.openid = res.result.openid;  //设置全局变量openid，用于后续页面应用
            if (that.checkLoginReadyCallback){
              that.checkLoginReadyCallback(res.result.openid);
            }
            //拿到openid后，请求trylogin接口
            wx.request({
              url: 'https://pangpai-car.com/tryLogin',
              data:{
                openid:res.result.openid
              },
              success:function (res) {
                console.log(res);
                if (res.data) {
                  that.globalData.userid = res.data.result.id; //设置全局变量userid，用于后续页面应用
                  wx.setStorageSync('uid', res.data.result.id);  //保存userid到本地
                }else{
                  console.log('tryLogin失败');
                }
              }
            })
          })
        }
      })
  }

})

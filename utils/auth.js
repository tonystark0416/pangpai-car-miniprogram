// utils/auth.js —— 登录态判断与登录引导
// v1.7.0：/tryLogin 不再自动建号（未注册返回 202 needRegister），
// 注册/登录统一走手机号接口 /loginByPhone，uid 是唯一登录态标识

const { request } = require('./request.js');

//tabBar 页面路径：登录完成后返回这些页必须用 switchTab
const TAB_PATHS = ['pages/index/index', 'pages/orderList/orderList'];

//获取当前 uid：globalData 未就绪时回退读本地缓存，并回填 globalData
function getUid() {
  const app = getApp();
  if (app.globalData.userid) {
    return app.globalData.userid;
  }
  const cached = wx.getStorageSync('uid');
  if (cached) {
    app.globalData.userid = cached; //回填，避免后续页面重复读缓存
  }
  return cached || '';
}

//是否已登录
function isLogin() {
  return !!getUid();
}

//跳转登录页；redirect = 登录成功后要回到的页面路径（会做 URI 编码）
function goLogin(redirect) {
  let url = '/pages/login/login';
  if (redirect) {
    url += '?redirect=' + encodeURIComponent(redirect);
  }
  wx.navigateTo({
    url: url
  })
}

//强校验登录态：已登录返回 true；未登录弹窗告知并引导登录，返回 false
//redirect 传入后，用户完成登录会直接回到该页面继续原操作
function ensureLogin(redirect, content) {
  if (isLogin()) {
    return true;
  }
  wx.showModal({
    title: '请先登录',
    content: content || '完成租车业务需要先登录，登录后可继续当前操作。',
    confirmText: '去登录',
    cancelText: '再看看',
    success: (res) => {
      if (res.confirm) {
        goLogin(redirect);
      }
    }
  })
  return false;
}

//确保拿到 openid（注册/登录接口都要用）：优先缓存，否则现取
function ensureOpenid() {
  const app = getApp();
  if (app.globalData.openid) {
    return Promise.resolve({ openid: app.globalData.openid, unionid: app.globalData.unionid || '' });
  }
  const cachedOpenid = wx.getStorageSync('openid');
  if (cachedOpenid) {
    app.globalData.openid = cachedOpenid;
    app.globalData.unionid = wx.getStorageSync('unionid') || '';
    return Promise.resolve({ openid: cachedOpenid, unionid: app.globalData.unionid });
  }
  return new Promise((resolve, reject) => {
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          reject(new Error('wx.login 失败'));
          return;
        }
        request({
          url: '/getOpenid?code=' + loginRes.code
        }).then((data) => {
          const result = (data && data.result) || {};
          if (!result.openid) {
            reject(new Error((data && data.msg) || '获取 openid 失败'));
            return;
          }
          app.globalData.openid = result.openid;
          app.globalData.unionid = result.unionid || '';
          wx.setStorageSync('openid', result.openid);
          wx.setStorageSync('unionid', result.unionid || '');
          resolve({ openid: result.openid, unionid: result.unionid || '' });
        }).catch(reject);
      },
      fail: reject
    })
  })
}

//登录成功后回到原页面：tabBar 页用 switchTab，普通页用 redirectTo
function backAfterLogin(redirect) {
  if (!redirect) {
    wx.reLaunch({
      url: '/pages/index/index'
    })
    return;
  }
  const isTab = TAB_PATHS.some((path) => redirect.indexOf(path) > -1);
  if (isTab) {
    wx.switchTab({
      url: redirect
    })
  } else {
    wx.redirectTo({
      url: redirect
    })
  }
}

module.exports = {
  getUid,
  isLogin,
  goLogin,
  ensureLogin,
  ensureOpenid,
  backAfterLogin
};

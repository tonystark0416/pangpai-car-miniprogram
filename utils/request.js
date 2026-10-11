// utils/request.js
// 统一请求层（R-02）：Promise 封装 wx.request / wx.uploadFile
// - url 传相对路径（如 '/getCarList'），自动拼接 config.BASE_URL；也兼容完整 http(s) 地址
// - opts: { loading: 是否显示加载框(默认false), loadingText, showError: 网络失败时是否统一提示(默认true) }

const config = require('./config.js');

function buildUrl(url) {
  if (url && url.indexOf('http') === 0) {
    return url;
  }
  return config.BASE_URL + url;
}

// 通用请求，resolve 整个响应体 res.data（与原页面直接读 res.data 的习惯一致）
function request(options, opts) {
  opts = opts || {};
  const loading = !!opts.loading;
  const showError = opts.showError !== false;

  return new Promise((resolve, reject) => {
    if (loading) {
      wx.showLoading({ title: opts.loadingText || '加载中', mask: true });
    }
    wx.request({
      url: buildUrl(options.url),
      method: options.method || 'GET',
      data: options.data || {},
      header: options.header,
      success: (res) => {
        if (loading) wx.hideLoading();
        resolve(res.data);
      },
      fail: (err) => {
        if (loading) wx.hideLoading();
        if (showError) {
          wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
        }
        reject(err);
      }
    });
  });
}

// 文件上传，resolve 后端返回的 JSON（已 JSON.parse）
function uploadFile(url, filePath, opts) {
  opts = opts || {};
  return new Promise((resolve, reject) => {
    if (opts.loading) {
      wx.showLoading({ title: opts.loadingText || '上传中', mask: true });
    }
    wx.uploadFile({
      url: buildUrl(url),
      filePath: filePath,
      name: opts.name || 'file',
      success: (res) => {
        if (opts.loading) wx.hideLoading();
        try {
          resolve(JSON.parse(res.data));
        } catch (e) {
          reject(e);
        }
      },
      fail: (err) => {
        if (opts.loading) wx.hideLoading();
        reject(err);
      }
    });
  });
}

module.exports = {
  request,
  uploadFile
};

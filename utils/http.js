
var header = {
  'Accept': 'application/json',
  'content-type': 'application/json',
  'Authorization': null,
}

//get请求
function getReq(url, cb) {
  wx.showLoading({
    title: '加载中',
  })
    //console.log(header)
  wx.request({
    url: url,
    method: 'get',
    header: header,
    success: function (res) {
      wx.hideLoading();
      return typeof cb == "function" && cb(res.data)
    },
    fail: function () {
      wx.hideLoading();
      wx.showModal({
        title: '网络错误',
        content: '网络出错，请刷新重试',
        showCancel: false
      })
      return typeof cb == "function" && cb(false)
    }
  })
}

 //post请求
function postReq(url, data, cb) {
  wx.showLoading({
    title: '加载中',
  })
    console.log("header=="),
    console.log(header),
    wx.request({
      url: url,
      header: header,
      data: data,
      method: 'post',
      success: function (res) {
        wx.hideLoading();
        return typeof cb == "function" && cb(res.data)
      },
      fail: function () {
        wx.hideLoading();
        wx.showModal({
          title: '网络错误',
          content: '网络出错，请刷新重试',
          showCancel: false
        })
        return typeof cb == "function" && cb(false)
      }
    })
 
}
module.exports = {
  getReq: getReq,
  postReq: postReq,
  header: header,
}  
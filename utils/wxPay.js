// utils/wxPay.js

const { request } = require('./request.js');

function wxPayment(openid, body, total_fee, out_trade_no, callback) {
  request({
    url: '/getWxPay',
    method: 'GET',
    data: {
      openid: openid,
      body: body,
      totalFee: total_fee,
      outTradeNo: out_trade_no,
      attach: 'test'
    }
  }).then((data) => {
    console.log(data);
    const paymentParams = data.data.paymentParams;
    wx.requestPayment({
      nonceStr: paymentParams.nonceStr,
      package: paymentParams.package,
      signType: paymentParams.signType,
      paySign: paymentParams.paySign,
      timeStamp: paymentParams.timeStamp,
      success (res) {
        console.log(res);
        callback(res);
      },
      fail (res) {
        console.log(res);
        callback(res);
      }
    })
  }).catch((err) => {
    // 获取支付参数失败也要回调，避免调用方支付流程静默挂起
    console.log('获取支付参数失败', err);
    callback({ errMsg: 'getWxPay:fail' });
  });
}

module.exports = {
  wxPayment: wxPayment
}

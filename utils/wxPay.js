// utils/wxPay.js

function wxPayment(openid,body,total_fee,out_trade_no,callback) {
  var that = this;
  wx.request({
    url: 'https://pangpai-car.com/getWxPay',
    method:'GET',
    data: {
      openid:openid,
      body:body,
      totalFee:total_fee,
      outTradeNo:out_trade_no,
      attach:'test'
    },
        success(res){
          console.log(res);
          wx.requestPayment({
            nonceStr: res.data.data.paymentParams.nonceStr,
            package: res.data.data.paymentParams.package,
            signType:res.data.data.paymentParams.signType,
            paySign: res.data.data.paymentParams.paySign,
            timeStamp: res.data.data.paymentParams.timeStamp,
            success (res) { 
              console.log(res);
              callback(res);
            }, 
            fail (res) { 
              console.log(res)
              callback(res);
            }
          })
        }
  })

}

module.exports = {
  wxPayment: wxPayment
}  

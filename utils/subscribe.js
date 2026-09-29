/**
 * 
 * 封装订阅功能
 */
var http = require("http.js");

function subscribeTemplate(tmplIds){
  wx.requestSubscribeMessage({ //微信消息订阅功能
    tmplIds:tmplIds,
    success:(res)=>{
      console.log(res)
    }
  })
}

// function getTemplate(subScene,cb){
//   let url  = "https://pangpai-car.com/car/route.php?service=getMsgTemplate&subScene="+subScene;
//   http.getReq(url,cb)
// }

module.exports ={
  subscribeTemplate,
  // getTemplate
};
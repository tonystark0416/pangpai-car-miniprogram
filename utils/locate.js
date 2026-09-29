/**
 * 用户定位能力
 */
//引入qq地图解析功能
const QQMapWX =  require('../utils/qqmap-wx-jssdk1.2/qqmap-wx-jssdk.js'); 

//获取用户地理位置，转成可解析的定位省份城市地址数据
function getLocate(callback){
  wx.getFuzzyLocation({
    success(res){
      console.log(res)
      let mapsdk = new QQMapWX({
        key:'DEYBZ-5CHKX-E7S4K-7P35C-JSVAT-TEBUQ'
      })
      mapsdk.reverseGeocoder({
        location: {
          latitude: res.latitude, 
          longitude: res.longitude
        },
        success(res){
          console.log(res);
          let type = 'auto';
          callback && callback(res,type);
        }
      })
    }
  })
}

//手动选地址
function chooseLocate(callback){
  console.log(1231231)
  wx.chooseLocation({
    success:(res)=>{
      console.log(res)
      let address_name = res.name;
      let mapsdk = new QQMapWX({
        key:'DEYBZ-5CHKX-E7S4K-7P35C-JSVAT-TEBUQ'
      })
      mapsdk.reverseGeocoder({
        location: {
          latitude: res.latitude,
          longitude: res.longitude
        },
        success:(res)=>{
          console.log(4141)
          let type = 'select';
          callback && callback(res,type,address_name);
        }
      })
    }
  })
}


module.exports = {getLocate,chooseLocate}
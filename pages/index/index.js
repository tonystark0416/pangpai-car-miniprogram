// index.js
// 首页

// 获取应用实例
const app = getApp();

//引入文件
const sub = require ("../../utils/subscribe.js");
const util = require('../../utils/util.js');
const locate = require('../../utils/locate.js');
// const QQMapWX =  require('../../utils/qqmap-wx-jssdk1.2/qqmap-wx-jssdk.js');

Page({
  data: {
    canCity:[
      '广州市','深圳市','佛山市'
    ],
    openid:'',
    pickup_address:"请选择您的取车地址",
    return_address:"请选择您的还车地址",
    recCarList:[],
    begin_time_txt:'选择取车时间',  //传给组件
    end_time_txt:'选择还车时间',  //传给组件
    quche_sourceTime:'',  //传给组件
    huanche_sourceTime:'', //传给组件
    subTemplate:[]
  },

  

  //初始化时间
  getNow (type) {
    const date = new Date();
    const nowYear = date.getFullYear();
    const nowMonth = date.getMonth();
    const nowDay = date.getDate();
    const nowHour = util.subTen(date.getHours());
    const nowMinute = util.subTen(date.getMinutes());
    if (type=='quche') {
      let showtime = (nowMonth+1)+"月"+nowDay+"日"+" "+nowHour+":"+nowMinute
      let timeInfo = nowYear+"/"+(nowMonth+1)+"/"+nowDay+" "+nowHour+":"+nowMinute
      app.globalData.pickUpTime = new Date(timeInfo).getTime();
      // console.log(new Date(timeInfo).getTime());
      return showtime
    }else if (type=='huanche') {
      let showtime = (nowMonth+1)+"月"+(nowDay+3)+"日"+" "+nowHour+":"+nowMinute
      let timeInfo = nowYear+"/"+(nowMonth+1)+"/"+(nowDay+3)+" "+nowHour+":"+nowMinute
      app.globalData.returnTime = new Date(timeInfo).getTime();
      // console.log(new Date(timeInfo).getTime());
      return showtime
    }

  },

  bindMultiPickerChange: function(e) {
    console.log('----------------公用日期时间选择器组件传回的值----------------');
    console.log(e);
    console.log(e.detail)
    let timeInfo = e.detail[0]+"/"+e.detail[1]+"/"+e.detail[2]+" "+e.detail[3]+":"+e.detail[4]
    console.log(timeInfo)
    console.log(new Date(timeInfo).getTime())
    if (e.currentTarget.dataset.type=='pickup') {
      app.globalData.pickUpTime = new Date(timeInfo).getTime()
    }else if (e.currentTarget.dataset.type=='return') {
      app.globalData.returnTime = new Date(timeInfo).getTime()
    }
  },

  //设置地址函数
  setAddress:function(res,type,e,add_name){
    console.log(res);
    const address = res.result.formatted_addresses.recommend
    switch (type) {
      case 'auto':
        console.log('it is auto locate');
        //如果定位城市不在业务范围，提示错误

        if (this.data.canCity.includes(res.result.ad_info.city)==false) { 
          wx.showToast({
            title: '暂不支持该市', 
          })
          return;
        }else if (this.data.canCity.includes(res.result.ad_info.city)==true) { 
          //如果定位城市在业务范围，设置初始地址
          app.globalData.pickUpAddress = address
          app.globalData.returnAddress = address
          this.setData({
            pickup_address:address,
            return_address:address
          })
        }
        break;

      case 'select':
        console.log('it is select locate');
        if (this.data.canCity.includes(res.result.ad_info.city)==false) {
          wx.showToast({
            title: '暂不支持该市',
          })
          return;
        }
        if(e.currentTarget.dataset.type == 'pickup'){
          app.globalData.pickUpAddress = add_name
          this.setData({
            pickup_address:add_name
          })
        }
        if(e.currentTarget.dataset.type == 'return'){
          app.globalData.returnAddress = add_name
          this.setData({
            return_address:add_name
          })
        }


      default:
        break;
    }
    

  },

  //手动选择地址
  getUserPoi () {
    locate.chooseLocate(this.setAddress)
    // console.log(e)
  },




  //用户点击tab时调用
  titleClick: function (e) {
    this.setData({
      //拿到当前索引并动态改变
      currentIndex: e.currentTarget.dataset.idx,
    })
    
  },


  //获取推荐汽车列表，页面加载调用
  getRecommendCarList:function (pageNum) {
    var that = this;
    let url = "https://pangpai-car.com/getCarList";
    wx.request({
      url: url,
      data:{
        pageNum:pageNum
      },
      success(res) {
        console.log(res)
        that.setData({
          recCarList: res.data.list
        })
      },
      fail(res){
        wx.showLoading({
          title: '网络有问题，请重启小程序',
        })
      }
    })
  },

  //首页点击列表item时调用
  clickItem:function(e){
    // sub.subscribeTemplate(this.data.subTemplate);
    if (!app.globalData.pickUpAddress||!app.globalData.returnAddress) {
      wx.showToast({
        title: '请先输入取车和还车地址',
        icon:'none'
      })
      return;
    }
    let carId = e.currentTarget.dataset.car_id;
    wx.navigateTo({
      url: "/pages/checkOut/checkOut?carId="+carId,
    })
    // if (app.globalData.userid == null) {
    //   wx.navigateTo({
    //     url: "/pages/login/login"
    //   })
    // }else{

    // }
  },



  //加载时调用
  onLoad(option) {
    //获取订阅模版
    // sub.getTemplate('index',(res)=>{
    //   this.data.subTemplate = res
    // })
    locate.getLocate(this.setAddress); //获取用户定位,传入设置地址的回调函数
    console.log(decodeURIComponent(option.scene)) 
    app.globalData.source = option.scene;
    //设置初始时间
    this.setData({
      quche_sourceTime:this.getNow('quche'),
      huanche_sourceTime:this.getNow('huanche'),
      date: new Date(Date.parse(new Date())+ 60*60*1000*8).toISOString().substring(0,10), //当前日期
      date2: new Date(Date.parse(new Date())+ 60*60*1000*8).toISOString().substring(0,10) //当前日期
    })

    if (app.globalData.openid){
      console.log('allreadyset')
      this.getRecommendCarList(1);
      
    }else{
      app.checkLoginReadyCallback = (res) => {
        console.log(res)
        this.setData({
          openid:res
        })
        this.getRecommendCarList(1);
      };
    }
  },

  onShow:function(){
    
  },
  onShareAppMessage(){ 
    wx.showShareMenu({
      withShareTicket:true,
      menu:['shareAppMessage','shareTimeline']
    })
  }

})

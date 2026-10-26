// index.js
// 首页

// 获取应用实例
const app = getApp();

//引入文件
const util = require('../../utils/util.js');
const locate = require('../../utils/locate.js');
const { request } = require('../../utils/request.js');
const auth = require('../../utils/auth.js');

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
    couponList:[],  //v1.7.3 首页可领取的券批次（为空时券区整块隐藏）
    receiving:false //领券防重复提交
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
        break;


      default:
        break;
    }
    

  },

  //手动选择地址
  getUserPoi (e) {
    // 接住点击事件（含 data-type 取车/还车标识），回调完成后转发给 setAddress
    locate.chooseLocate((res, type, add_name) => {
      this.setAddress(res, type, e, add_name)
    })
  },




  //用户点击tab时调用
  titleClick: function (e) {
    this.setData({
      //拿到当前索引并动态改变
      currentIndex: e.currentTarget.dataset.idx,
    })
    
  },


  //v1.7.3 首页派券：可领取的券批次（仅登录用户）
  //无活动批次时 couponList 为空，券区整块隐藏（后台开启活动后自动出现）
  getCouponList () {
    const uid = auth.getUid();
    if (!uid) {
      this.setData({
        couponList: []
      })
      return;
    }
    request({
      url: '/getCouponList',
      data: {
        uid: uid
      }
    }).then((data) => {
      if (!data || data.code !== 200) {
        console.log('[API] 首页可领券列表返回异常：');
        console.log(data);
        this.setData({
          couponList: []
        })
        return;
      }
      //can_receive 已由后端综合「库存 > 0」与「未达限领」，前端直接用它决定按钮能否点
      const list = (data.result || []).map((item) => {
        const canReceive = !!item.can_receive;
        let btnTxt = '领取';
        if (!canReceive) {
          btnTxt = Number(item.remain_stock) > 0 ? '已领取' : '已领完';
        }
        return Object.assign({}, item, {
          can_receive: canReceive,
          btnTxt: btnTxt,
          useTimeTxt: util.formatDate(item.use_start_time) + ' - ' + util.formatDate(item.use_end_time)
        });
      });
      this.setData({
        couponList: list
      })
    })
  },

  //领取优惠券（v1.7.3 POST /receiveCoupon）
  receiveCoupon (e) {
    const uid = auth.getUid();
    if (!uid) {
      auth.goLogin('/pages/index/index')
      return;
    }
    const index = Number(e.currentTarget.dataset.index);
    const item = this.data.couponList[index];
    if (!item || !item.can_receive) {
      return;
    }
    if (this.data.receiving) {
      return;
    }
    this.setData({
      receiving: true
    })
    wx.showLoading({
      title: '领取中',
      mask: true
    })
    request({
      url: '/receiveCoupon',
      method: 'POST',
      data: {
        uid: uid,
        couponId: item.coupon_id
      }
    }).then((data) => {
      wx.hideLoading();
      this.setData({
        receiving: false
      })
      //成功 {code:200, msg:'领取成功', result:{coupon_sn,...}}
      if (data && data.code === 200) {
        wx.showToast({
          title: data.msg || '领取成功',
          icon: 'success',
          mask: true
        })
        this.getCouponList() //刷新可领状态（库存/限领会变化）
      } else {
        wx.showToast({
          title: (data && data.msg) || '领取失败，请稍后重试',
          icon: 'none',
          duration: 2500
        })
      }
    }).catch(() => {
      wx.hideLoading();
      this.setData({
        receiving: false
      })
    })
  },

  //跳转领券中心 / 我的券包（未登录先引导登录，登录后回到首页券区）
  goCouponPage () {
    if (!auth.isLogin()) {
      auth.ensureLogin('/pages/index/index', '领取优惠券需要先登录，登录后即可领取。')
      return;
    }
    wx.navigateTo({
      url: '/pages/coupon/coupon'
    })
  },

  //获取推荐汽车列表，页面加载调用
  getRecommendCarList:function (pageNum) {
    request({
      url: '/getCarList',
      data:{
        pageNum:pageNum
      }
    }).then((data) => {
      console.log(data)
      //成功返回 {code:0, list:[...]}；v1.6.7 起后端已按 sort 排序且只返回上架车辆，前端不再二次排序
      //价格字段后端可能返回字符串（如 "300"），必须数值化再比较：
      //WXML 里直接写 a > b 会按字典序比较（"300" > "80" 为 false），导致优惠标签时有时无
      const list = ((data && data.list) || []).map((item) => {
        const dayPrice = Number(item.day_price) || 0;
        let promoPrice = Number(item.promotion_day_price) || 0;
        //优惠价缺失或为 0 时回退到原价，避免展示 ¥0 / ¥NaN
        if (promoPrice <= 0) {
          promoPrice = dayPrice;
        }
        const savePrice = dayPrice - promoPrice;
        return Object.assign({}, item, {
          payPrice: promoPrice,      //展示用的优惠价（已数值化）
          hasDiscount: savePrice > 0, //是否有差价
          savePrice: savePrice        //省多少钱
        });
      });
      //瀑布流：按索引奇偶拆成左右两列，卡片不等高，高度由图片与内容自适应
      this.setData({
        recCarList: list,
        carColLeft: list.filter((item, index) => index % 2 === 0),
        carColRight: list.filter((item, index) => index % 2 === 1)
      })
    })
  },

  //首页点击列表item时调用
  clickItem:function(e){
    const carId = e.currentTarget.dataset.car_id;
    //v1.7.0 入口强校验：未登录弹窗引导，登录后直接回到该车辆的结算页
    if (!auth.ensureLogin('/pages/checkOut/checkOut?carId=' + carId, '完成租车业务需要先登录，登录后可继续下单。')) {
      return;
    }
    if (!app.globalData.pickUpAddress||!app.globalData.returnAddress) {
      wx.showToast({
        title: '请先输入取车和还车地址',
        icon:'none'
      })
      return;
    }
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
    //领券后回到首页刷新可领状态与库存
    this.getCouponList()
  },
  onShareAppMessage(){ 
    wx.showShareMenu({
      withShareTicket:true,
      menu:['shareAppMessage','shareTimeline']
    })
  }

})

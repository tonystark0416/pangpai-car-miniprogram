// pages/orderList/orderList.js

const { request } = require('../../utils/request.js');
const { getOrderStatus } = require('../../utils/orderStatus.js');
const util = require('../../utils/util.js');
const auth = require('../../utils/auth.js');

// 获取应用实例
const app = getApp();

//订单状态 Tab（v1.6.17：筛选在后端 SQL 层完成，前端只按文档建议传参）
const TABS = [
  { key: 'all', name: '全部', params: {} },
  { key: 'unpay', name: '待支付', params: { pay_status: '0' } },
  { key: 'ongoing', name: '进行中', params: { pay_status: '1', order_status: '0,1' } },
  { key: 'done', name: '已完成', params: { order_status: '2,3' } },
  { key: 'closed', name: '已取消/退款', params: { order_status: '4' } }
];

Page({

  /**
   * 页面的初始数据
   */
  data: {
    islogin:false,
    tabs:TABS,
    currentTab:0,
    orderList:[],
    page:1,
    pageSize:10,
    total:0,
    loading:false,   //请求进行中，避免重复触发
    empty:false,     //当前筛选无数据
    noMore:false     //已到末页（后端返回条数不足或为空）
  },

  //跳转登录（带上回跳地址，登录后回到订单列表）
  goLogin(){
    auth.goLogin('/pages/orderList/orderList')
  },

  // 获取用户订单（append=true 时为上拉追加）
  getOrderList(pageNumber, append){
    pageNumber = pageNumber || 1;
    append = !!append;
    if (this.data.loading) {
      return;
    }
    const tab = TABS[this.data.currentTab] || TABS[0];
    //筛选参数由后端 SQL 层全局过滤（不是当前页过滤）；非法值后端会忽略，等同不传
    const params = Object.assign({
      uid:auth.getUid(), //以登录态工具取 uid（globalData 未就绪时回退本地缓存）
      pageNumber:pageNumber //页码从 1 开始，不能为 0
    }, tab.params);

    this.setData({
      loading:true
    })
    request({
      url: '/getOrderList',
      data: params
    }).then((data) => {
      this.setData({
        loading:false
      })
      //空数据返回 {code:201, msg:'无订单数据'}（筛选无命中同样走这里）
      if (data && data.code == 200 && data.result) {
        //状态文案/配色由 getOrderStatus 统一映射；取还车时间为毫秒时间戳，需格式化
        const list = data.result.map((item) => {
          const status = getOrderStatus(item);
          return Object.assign({}, item, {
            statusText: status.text,
            statusClass: status.class,
            canCancel: status.canCancel,
            pickup_time_txt: util.formatOrderTime(item.pickup_time),
            return_time_txt: util.formatOrderTime(item.return_time)
          })
        })
        const merged = append ? this.data.orderList.concat(list) : list;
        //v1.6.17 新增 total/page/pageSize（可选字段，缺失时按返回条数兜底）
        const pageSize = Number(data.pageSize) || (list.length || 10);
        this.setData({
          orderList: merged,
          page: Number(data.page) || pageNumber,
          pageSize: pageSize,
          total: data.total !== undefined && data.total !== null ? Number(data.total) : merged.length,
          empty: false,
          noMore: list.length === 0 || list.length < pageSize
        })
      }else{
        //无数据：追加场景保留已加载数据，仅标记没有更多
        this.setData({
          orderList: append ? this.data.orderList : [],
          empty: !append,
          noMore: true
        })
      }
    }).catch(() => {
      this.setData({
        loading:false
      })
    })
  },

  //切换订单状态 Tab：清空列表并重新拉取该分类第一页
  switchTab(e){
    const index = Number(e.currentTarget.dataset.index);
    if (isNaN(index) || index === this.data.currentTab) {
      return;
    }
    this.setData({
      currentTab:index,
      orderList:[],
      page:1,
      total:0,
      empty:false,
      noMore:false
    }, () => {
      this.getOrderList(1, false)
    })
  },

  //上拉加载下一页
  loadMore(){
    if (this.data.loading || this.data.noMore || this.data.empty) {
      return;
    }
    this.getOrderList(this.data.page + 1, true)
  },

  goOrderDetail(e){
    let orderSn = e.currentTarget.dataset.ordersn;
    wx.navigateTo({
      url: '/pages/orderDetail/orderDetail?orderSn='+orderSn,
    })
  },

  //列表内直接取消未支付订单（v1.6.16 POST /cancelOrder）
  cancelOrder(e){
    const orderSn = e.currentTarget.dataset.ordersn;
    if (!orderSn) {
      return;
    }
    wx.showModal({
      title: '取消订单',
      content: '确认取消该未支付订单吗？取消后不可恢复。',
      success: (modalRes) => {
        if (!modalRes.confirm) {
          return;
        }
        wx.showLoading({
          title: '处理中',
          mask: true
        })
        request({
          url: '/cancelOrder',
          method: 'POST',
          data:{
            orderSn: orderSn,
            uid: auth.getUid()
          }
        }).then((data) => {
          wx.hideLoading();
          //成功 {code:200, msg:'订单已取消'}；失败按 res.msg 提示
          const ok = data && data.code === 200;
          wx.showToast({
            title: ok ? (data.msg || '订单已取消') : ((data && data.msg) || '取消失败，请稍后重试'),
            icon: ok ? 'success' : 'none',
            duration: 2500
          })
          //取消后订单可能移出当前筛选分类，回到第一页重新拉取
          this.setData({
            page:1,
            noMore:false
          })
          this.getOrderList(1, false)
        }).catch(() => {
          wx.hideLoading();
        })
      }
    })
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    //v1.7.0 入口强校验：未登录弹窗引导，登录后回到订单列表
    if (!auth.isLogin()) {
      this.setData({
        islogin:false,
        orderList:[],
        empty:false
      })
      auth.ensureLogin('/pages/orderList/orderList', '查看和管理订单需要先登录，登录后可查看全部订单。')
      return;
    }else{
      this.setData({
        islogin:true
      })
      this.getOrderList(1, false)
    }
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    this.loadMore()
  },
})

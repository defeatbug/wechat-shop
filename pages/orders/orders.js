const api = require('../../services/api')

const STATUS = {
  pending: '待确认',
  confirmed: '已确认',
  done: '已完成',
  canceled: '已取消'
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function fmtTime(ts) {
  const d = new Date(ts || Date.now())
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    ' ' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  )
}

Page({
  data: {
    orders: [],
    cloudHint: ''
  },

  onShow() {
    this.load()
  },

  onPullDownRefresh() {
    this.load(() => wx.stopPullDownRefresh())
  },

  load(done) {
    api
      .getMyOrders()
      .then(list => {
        const orders = (list || []).map(o => {
          const items = (o.items || []).map(it =>
            Object.assign({}, it, { lineText: api.fmtPrice(it.price * it.qty) })
          )
          return Object.assign({}, o, {
            items,
            statusText: STATUS[o.status] || o.status,
            totalText: api.fmtPrice(o.total),
            timeText: fmtTime(o.createdAt)
          })
        })
        this.setData({
          orders,
          cloudHint: api.isCloud()
            ? ''
            : '当前是演示模式：订单只存在这台手机上。接入云开发后，所有人的订单会汇总到云端，店主在后台统一看。'
        })
        if (done) done()
      })
      .catch(() => {
        if (done) done()
      })
  },

  goShop() {
    wx.reLaunch({ url: '/pages/index/index' })
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' })
  }
})

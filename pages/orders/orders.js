const api = require('../../services/api')
const config = require('../../services/config')

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
    cloudHint: '',
    isAdmin: false,
    isLocal: false,
    showAdminEntry: false
  },

  onShow() {
    this.load()
    this.checkIdentity()
  },

  checkIdentity() {
    api.whoami().then(r => {
      const isLocal = !!r.local
      const isAdmin = !!r.isAdmin
      this.setData({ isLocal, isAdmin, showAdminEntry: isAdmin || isLocal })
    })
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
    if (this.data.isAdmin) {
      wx.navigateTo({ url: '/pages/admin/admin' })
      return
    }
    if (!this.data.isLocal) {
      wx.showToast({ title: '无管理员权限', icon: 'none' })
      return
    }
    // 本地演示模式：输入管理密码后才进入
    wx.showModal({
      title: '店主验证',
      editable: true,
      placeholderText: '请输入管理密码',
      success: res => {
        if (!res.confirm) return
        if ((res.content || '').trim() !== config.localAdminPin) {
          wx.showToast({ title: '密码不对', icon: 'none' })
          return
        }
        wx.setStorageSync('admin_ok', 1)
        wx.navigateTo({ url: '/pages/admin/admin' })
      }
    })
  }
})

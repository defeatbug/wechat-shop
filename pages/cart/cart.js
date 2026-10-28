const api = require('../../services/api')
const store = require('../../services/store')
const config = require('../../services/config')

Page({
  data: {
    lines: [],
    count: 0,
    totalText: '0.00',
    name: '',
    phone: '',
    wechat: '',
    remark: '',
    pickups: ['到店自提', '同城面交', '其他（备注说明）'],
    pickupIndex: 0,
    submitting: false
  },

  onLoad() {
    this.load()
  },

  load() {
    const cart = store.getCart()
    api.getCatalog().then(cat => {
      const map = {}
      api.decorate(cat.products).forEach(p => {
        map[p._id] = p
      })
      const lines = Object.keys(cart)
        .filter(id => map[id])
        .map(id => Object.assign({}, map[id], { qty: cart[id] }))
      this.setData({ lines }, () => this.recalc())
    })
  },

  recalc() {
    const lines = this.data.lines
    const count = lines.reduce((s, l) => s + l.qty, 0)
    const total = lines.reduce((s, l) => s + l.price * l.qty, 0)
    this.setData({ count, totalText: api.fmtPrice(total) })
  },

  onPlus(e) {
    this.changeQty(e.currentTarget.dataset.id, 1)
  },

  onMinus(e) {
    this.changeQty(e.currentTarget.dataset.id, -1)
  },

  changeQty(id, delta) {
    const lines = this.data.lines
      .map(l => (l._id === id ? Object.assign({}, l, { qty: l.qty + delta }) : l))
      .filter(l => l.qty > 0)
    store.setCart(
      lines.reduce((acc, l) => {
        acc[l._id] = l.qty
        return acc
      }, {})
    )
    this.setData({ lines }, () => this.recalc())
  },

  onName(e) {
    this.setData({ name: e.detail.value })
  },
  onPhone(e) {
    this.setData({ phone: e.detail.value })
  },
  onWechat(e) {
    this.setData({ wechat: e.detail.value })
  },
  onRemark(e) {
    this.setData({ remark: e.detail.value })
  },
  onPickup(e) {
    this.setData({ pickupIndex: Number(e.detail.value) })
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  },

  onSubmit() {
    if (this.data.submitting || !this.data.lines.length) return
    const name = (this.data.name || '').trim()
    const phone = (this.data.phone || '').trim()
    if (!name) {
      wx.showToast({ title: '请填写称呼', icon: 'none' })
      return
    }
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请填写正确的手机号', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    const payload = {
      items: this.data.lines.map(l => ({
        _id: l._id,
        name: l.name,
        price: l.price,
        qty: l.qty
      })),
      contactName: name,
      contactPhone: phone,
      contactWechat: (this.data.wechat || '').trim(),
      pickup: this.data.pickups[this.data.pickupIndex],
      remark: (this.data.remark || '').trim()
    }

    api
      .submitOrder(payload)
      .then(order => {
        store.clearCart()
        this.setData({ submitting: false })
        const money = api.fmtPrice(order.total)
        wx.showModal({
          title: '提交成功',
          content: '本单合计 ¥' + money + '。' + config.submitTip,
          showCancel: false,
          confirmText: '查看订单',
          success: () => {
            wx.redirectTo({ url: '/pages/orders/orders' })
          }
        })
      })
      .catch(err => {
        this.setData({ submitting: false })
        wx.showToast({ title: (err && err.message) || '提交失败，请重试', icon: 'none' })
      })
  }
})

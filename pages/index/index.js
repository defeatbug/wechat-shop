const api = require('../../services/api')
const store = require('../../services/store')

Page({
  data: {
    shop: {},
    groups: [],
    activeCat: '',
    anchor: '',
    count: 0,
    totalText: '0.00',
    shopOpen: false
  },

  onLoad() {
    const app = getApp()
    this.setData({ shop: (app && app.globalData && app.globalData.shop) || {} })
    this._map = {}
    api.getCatalog().then(cat => {
      const groups = this.buildGroups(cat.categories, cat.products)
      this.setData({ groups, activeCat: groups.length ? groups[0].id : '' }, () => {
        this.measure()
      })
      this.refreshCart()
    })
  },

  onShow() {
    this.refreshCart()
  },

  onUnload() {
    if (this._timer) clearTimeout(this._timer)
  },

  buildGroups(categories, products) {
    const list = api.decorate(products)
    const map = {}
    list.forEach(p => {
      map[p._id] = p
    })
    this._map = map
    return (categories || [])
      .map(c =>
        Object.assign({}, c, {
          products: list.filter(p => p.catId === c.id && p.on !== false)
        })
      )
      .filter(g => g.products.length)
  },

  refreshCart() {
    const cart = store.getCart()
    const map = this._map || {}
    let count = 0
    let total = 0
    Object.keys(cart).forEach(id => {
      const p = map[id]
      if (!p) return
      count += cart[id]
      total += p.price * cart[id]
    })
    this.setData({ count, totalText: api.fmtPrice(total) })
  },

  // 测量右侧每个分类区块的纵向偏移，供滚动联动使用
  measure() {
    const q = wx.createSelectorQuery().in(this)
    q.select('.goods').boundingClientRect()
    q.selectAll('.group').boundingClientRect()
    q.exec(res => {
      const box = res && res[0]
      const rects = res && res[1]
      if (!box || !rects || !rects.length) {
        // 布局未就绪时重试一次
        if (!this._retried) {
          this._retried = true
          setTimeout(() => this.measure(), 300)
        }
        return
      }
      this._offsets = rects.map(r => r.top - box.top)
    })
  },

  onGoodsScroll(e) {
    this._scrollTop = e.detail.scrollTop
    if (this._lock) return
    if (this._timer) clearTimeout(this._timer)
    this._timer = setTimeout(() => this.syncActive(), 80)
  },

  syncActive() {
    const offsets = this._offsets
    if (!offsets || !offsets.length) return
    const st = this._scrollTop || 0
    let idx = 0
    for (let i = 0; i < offsets.length; i++) {
      if (offsets[i] <= st + 12) idx = i
    }
    const g = this.data.groups[idx]
    if (g && g.id !== this.data.activeCat) {
      this.setData({ activeCat: g.id })
    }
  },

  onCatTap(e) {
    const id = e.currentTarget.dataset.id
    this._lock = true
    this.setData({ activeCat: id, anchor: 'cat-' + id })
    setTimeout(() => {
      this._lock = false
    }, 420)
  },

  onAdd(e) {
    const id = e.currentTarget.dataset.id
    store.addToCart(id, 1)
    this.refreshCart()
    try {
      wx.vibrateShort({ type: 'light' })
    } catch (err) {}
  },

  // ---------- 店铺资料 ----------
  onShopInfo() {
    this.setData({ shopOpen: true })
  },

  closeShopInfo() {
    this.setData({ shopOpen: false })
  },

  onCall() {
    const phone = this.data.shop.phone
    if (!phone) return
    wx.makePhoneCall({ phoneNumber: phone })
  },

  onCopyAddr() {
    const addr = this.data.shop.address
    if (!addr) return
    wx.setClipboardData({ data: addr })
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  goCart() {
    if (!this.data.count) {
      wx.showToast({ title: '先选几款吧', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/cart/cart' })
  },

  goOrders() {
    wx.navigateTo({ url: '/pages/orders/orders' })
  }
})

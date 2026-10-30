const api = require('../../services/api')
const store = require('../../services/store')

Page({
  data: {
    kw: '',
    focus: true,
    products: [],
    results: []
  },

  onLoad() {
    api.getCatalog().then(cat => {
      const products = api.decorate(cat.products).filter(p => p.on !== false)
      this.setData({ products })
    })
  },

  onInput(e) {
    this.setData({ kw: e.detail.value }, () => this.filter())
  },

  filter() {
    const kw = (this.data.kw || '').trim().toLowerCase()
    if (!kw) {
      this.setData({ results: [] })
      return
    }
    const results = this.data.products.filter(
      p =>
        (p.name || '').toLowerCase().indexOf(kw) >= 0 ||
        (p.desc || '').toLowerCase().indexOf(kw) >= 0
    )
    this.setData({ results })
  },

  onClear() {
    this.setData({ kw: '', results: [] })
  },

  onCancel() {
    wx.navigateBack({ delta: 1 })
  },

  onAdd(e) {
    const id = e.currentTarget.dataset.id
    store.addToCart(id, 1)
    try {
      wx.vibrateShort({ type: 'light' })
    } catch (err) {}
    wx.showToast({ title: '已加入选款', icon: 'none', duration: 800 })
  }
})

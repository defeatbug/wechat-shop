const api = require('../../services/api')

// 分类对应的缩略图渐变（新增/编辑时自动取色）
const BG = {
  must: 'linear-gradient(135deg,#f6dede,#d9a3a8)',
  new: 'linear-gradient(135deg,#b9a3d0,#7f6aa8)',
  necklace: 'linear-gradient(135deg,#f2d3a8,#c9974f)',
  earring: 'linear-gradient(135deg,#e9e3f6,#b3a2d6)',
  bracelet: 'linear-gradient(135deg,#f6d6d4,#cf7f7a)',
  ring: 'linear-gradient(135deg,#f0e8da,#c8b394)',
  hair: 'linear-gradient(135deg,#f8dfe4,#d9a3b4)',
  hat: 'linear-gradient(135deg,#e6e9d8,#aeb894)',
  bag: 'linear-gradient(135deg,#efe7d8,#c2ac86)',
  other: 'linear-gradient(135deg,#e4eee9,#a3c0b4)'
}

Page({
  data: {
    id: '',
    cats: [],
    catNames: [],
    form: { name: '', catIndex: 0, priceYuan: '', desc: '', emoji: '🧸', on: true },
    saving: false
  },

  onLoad(query) {
    const id = (query && query.id) || ''
    wx.setNavigationBarTitle({ title: id ? '编辑商品' : '新增商品' })
    api.getCatalog().then(cat => {
      const cats = cat.categories || []
      const catNames = cats.map(c => c.name + (c.emoji || ''))
      let form = { name: '', catIndex: 0, priceYuan: '', desc: '', emoji: '🧸', on: true }
      if (id) {
        const p = (cat.products || []).filter(x => x._id === id)[0]
        if (p) {
          let catIndex = cats.findIndex(c => c.id === p.catId)
          if (catIndex < 0) catIndex = 0
          form = {
            name: p.name,
            catIndex,
            priceYuan: (p.price / 100).toFixed(2),
            desc: p.desc || '',
            emoji: p.emoji || '🧸',
            on: p.on !== false
          }
        }
      }
      this.setData({ id, cats, catNames, form })
    })
  },

  onField(e) {
    const k = e.currentTarget.dataset.k
    const form = Object.assign({}, this.data.form)
    form[k] = e.detail.value
    this.setData({ form })
  },

  onCatChange(e) {
    this.setData({ form: Object.assign({}, this.data.form, { catIndex: Number(e.detail.value) }) })
  },

  onSwitchOn(e) {
    this.setData({ form: Object.assign({}, this.data.form, { on: e.detail.value }) })
  },

  onCancel() {
    wx.navigateBack({ delta: 1 })
  },

  onSave() {
    if (this.data.saving) return
    const f = this.data.form
    const name = (f.name || '').trim()
    const priceYuan = parseFloat(f.priceYuan)
    if (!name) {
      wx.showToast({ title: '请填写商品名称', icon: 'none' })
      return
    }
    if (isNaN(priceYuan) || priceYuan < 0) {
      wx.showToast({ title: '请填写正确价格', icon: 'none' })
      return
    }
    const cat = this.data.cats[f.catIndex] || this.data.cats[0]
    if (!cat) {
      wx.showToast({ title: '请先选择分类', icon: 'none' })
      return
    }

    const product = {
      _id: this.data.id || undefined,
      catId: cat.id,
      name,
      price: Math.round(priceYuan * 100),
      desc: (f.desc || '').trim(),
      emoji: (f.emoji || '🧸').trim() || '🧸',
      bg: BG[cat.id] || BG.other,
      on: f.on !== false
    }
    if (!product._id) delete product._id

    this.setData({ saving: true })
    api
      .saveProduct(product)
      .then(() => {
        this.setData({ saving: false })
        wx.showToast({ title: '已保存', icon: 'success' })
        setTimeout(() => wx.navigateBack({ delta: 1 }), 500)
      })
      .catch(err => {
        this.setData({ saving: false })
        wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' })
      })
  }
})

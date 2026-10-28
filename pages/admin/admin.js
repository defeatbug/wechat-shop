const api = require('../../services/api')

const STATUS = {
  pending: '待确认',
  confirmed: '已确认',
  done: '已完成',
  canceled: '已取消'
}

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
    tab: 'orders',
    orders: [],
    products: [],
    isLocal: true,
    cats: [],
    catNames: [],
    editing: false,
    form: {},
    ready: false,
    denied: false
  },

  onLoad() {
    // 权限：云模式看 openid 白名单；本地演示模式需要管理密码
    api.whoami().then(r => {
      if (r.isAdmin) {
        this.setData({ isLocal: false, ready: true })
        this.refresh()
        return
      }
      if (r.local && wx.getStorageSync('admin_ok')) {
        this.setData({ isLocal: true, ready: true })
        this.refresh()
        return
      }
      this.setData({ denied: true })
    })
  },

  onShow() {
    if (this.data.ready) this.refresh()
  },

  onExitAdmin() {
    wx.removeStorageSync('admin_ok')
    wx.navigateBack({ delta: 1 })
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
    this.refresh()
  },

  refresh() {
    if (this.data.tab === 'orders') this.loadOrders()
    else this.loadProducts()
  },

  loadOrders() {
    api.listOrders().then(list => {
      const orders = (list || []).map(o => {
        const summary = (o.items || []).map(it => it.name + '×' + it.qty).join('、')
        return Object.assign({}, o, {
          statusText: STATUS[o.status] || o.status,
          totalText: api.fmtPrice(o.total),
          summary
        })
      })
      this.setData({ orders })
    })
  },

  loadProducts() {
    api.getCatalog().then(cat => {
      const cats = cat.categories || []
      const nameMap = {}
      cats.forEach(c => {
        nameMap[c.id] = c.name
      })
      this.setData({
        cats,
        catNames: cats.map(c => c.name + (c.emoji || '')),
        products: api.decorate(cat.products).map(p =>
          Object.assign({}, p, { catName: nameMap[p.catId] || '' })
        )
      })
    })
  },

  onAdvance(e) {
    const id = e.currentTarget.dataset.id
    const order = this.data.orders.filter(o => o._id === id)[0]
    if (!order) return
    const next = order.status === 'pending' ? 'confirmed' : 'done'
    api.updateOrderStatus(id, next).then(() => this.loadOrders())
  },

  onToggle(e) {
    const id = e.currentTarget.dataset.id
    const on = e.detail.value
    const product = this.data.products.filter(p => p._id === id)[0]
    if (!product) return
    api.saveProduct(Object.assign({}, product, { on })).then(() => {
      wx.showToast({ title: on ? '已上架' : '已下架', icon: 'none' })
      if (api.isCloud()) this.loadProducts()
    })
  },

  // ---------- 商品新增 / 编辑 ----------
  onAddProduct() {
    this.setData({
      editing: true,
      form: { name: '', catIndex: 0, priceYuan: '', desc: '', emoji: '🧸', on: true }
    })
  },

  onEditProduct(e) {
    const id = e.currentTarget.dataset.id
    const p = this.data.products.filter(x => x._id === id)[0]
    if (!p) return
    let catIndex = this.data.cats.findIndex(c => c.id === p.catId)
    if (catIndex < 0) catIndex = 0
    this.setData({
      editing: true,
      form: {
        _id: p._id,
        name: p.name,
        catIndex,
        priceYuan: (p.price / 100).toFixed(2),
        desc: p.desc || '',
        emoji: p.emoji || '🧸',
        on: p.on !== false
      }
    })
  },

  onField(e) {
    const k = e.currentTarget.dataset.k
    const form = Object.assign({}, this.data.form)
    form[k] = e.detail.value
    this.setData({ form })
  },

  onCatChange(e) {
    const form = Object.assign({}, this.data.form, { catIndex: Number(e.detail.value) })
    this.setData({ form })
  },

  onSwitchOn(e) {
    const form = Object.assign({}, this.data.form, { on: e.detail.value })
    this.setData({ form })
  },

  closeEditor() {
    this.setData({ editing: false })
  },

  onSaveProduct() {
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
      _id: f._id,
      catId: cat.id,
      name,
      price: Math.round(priceYuan * 100),
      desc: (f.desc || '').trim(),
      emoji: (f.emoji || '🧸').trim() || '🧸',
      bg: BG[cat.id] || BG.other,
      on: f.on !== false
    }
    // 新增时去掉 _id，让数据层生成
    if (!product._id) delete product._id

    api.saveProduct(product).then(() => {
      this.setData({ editing: false })
      this.loadProducts()
      wx.showToast({ title: '已保存', icon: 'success' })
    })
  },

  onDeleteProduct(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除商品',
      content: '删除后顾客就看不到这个商品了',
      confirmColor: '#ff3b30',
      success: r => {
        if (!r.confirm) return
        api.deleteProduct(id).then(() => {
          this.loadProducts()
          wx.showToast({ title: '已删除', icon: 'none' })
        })
      }
    })
  }
})

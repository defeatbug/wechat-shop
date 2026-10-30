const api = require('../../services/api')

const STATUS = {
  pending: '待确认',
  confirmed: '已确认',
  done: '已完成',
  canceled: '已取消'
}

Page({
  data: {
    tab: 'orders',
    orders: [],
    products: [],
    isLocal: true,
    cats: [],
    catNames: [],
    ready: false,
    denied: false,
    myOpenid: '',
    pendingCount: 0
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
      // 把访问者自己的 openid 显示出来，方便店主把它加进 ADMIN_OPENIDS
      this.setData({ denied: true, myOpenid: r.openid || '' })
    })
  },

  onShow() {
    if (this.data.ready) this.refresh()
  },

  onPullDownRefresh() {
    this.refresh()
    setTimeout(() => wx.stopPullDownRefresh(), 500)
  },

  onCopyOpenid() {
    if (!this.data.myOpenid) return
    wx.setClipboardData({ data: this.data.myOpenid })
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
      this.setData({
        orders,
        pendingCount: orders.filter(o => o.status === 'pending').length
      })
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

  onAddProduct() {
    wx.navigateTo({ url: '/pages/product-edit/product-edit' })
  },

  onEditProduct(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/product-edit/product-edit?id=' + id })
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

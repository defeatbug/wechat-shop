const api = require('../../services/api')
const store = require('../../services/store')

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
    isLocal: true
  },

  onLoad() {
    this.setData({ isLocal: !api.isCloud() })
  },

  onShow() {
    this.refresh()
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
        const summary = (o.items || [])
          .map(it => it.name + '×' + it.qty)
          .join('、')
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
      this.setData({ products: api.decorate(cat.products) })
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
    if (api.isCloud()) {
      api.saveProduct(Object.assign({}, product, { on })).then(() => {
        wx.showToast({ title: '已保存', icon: 'success' })
        this.loadProducts()
      })
    } else {
      store.setProductOverride(id, { on })
      wx.showToast({ title: on ? '已上架' : '已下架', icon: 'none' })
    }
  }
})

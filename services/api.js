// 数据访问层：有云环境走云函数；没有则用本地存储，保证开箱即跑。
const config = require('./config')
const store = require('./store')
const mock = require('../data/products')

let cloudReady = false

function init() {
  if (config.cloudEnv && wx.cloud) {
    try {
      wx.cloud.init({ env: config.cloudEnv, traceUser: true })
      cloudReady = true
    } catch (e) {
      cloudReady = false
    }
  }
  return cloudReady
}

function isCloud() {
  return cloudReady
}

function call(action, data) {
  return wx.cloud
    .callFunction({ name: 'shop', data: Object.assign({ action }, data || {}) })
    .then(r => {
      const res = (r && r.result) || {}
      if (res.ok === false) throw new Error(res.error || '操作失败')
      return res.data
    })
}

function fmtPrice(fen) {
  return (Number(fen || 0) / 100).toFixed(2)
}

function decorate(list) {
  return (list || []).map(p => Object.assign({}, p, { priceText: fmtPrice(p.price) }))
}

function getCatalog() {
  if (cloudReady) {
    return call('catalog')
      .then(d => (d && d.products && d.products.length ? d : mock))
      .catch(() => mock)
  }
  // 本地模式：叠加店主在 admin 页面做过的上架/改价
  const overrides = store.getProductOverrides()
  const products = mock.products.map(p =>
    overrides[p._id] ? Object.assign({}, p, overrides[p._id]) : p
  )
  return Promise.resolve({ categories: mock.categories, products, shop: mock.shop })
}

function buildOrder(payload) {
  const items = (payload.items || []).map(it => ({
    id: it._id,
    name: it.name,
    price: it.price,
    qty: it.qty
  }))
  const total = items.reduce((s, it) => s + it.price * it.qty, 0)
  return {
    no: 'D' + Date.now(),
    items,
    total,
    itemCount: items.reduce((s, it) => s + it.qty, 0),
    contactName: payload.contactName,
    contactPhone: payload.contactPhone,
    contactWechat: payload.contactWechat || '',
    pickup: payload.pickup || '自提',
    remark: payload.remark || '',
    status: 'pending',
    createdAt: Date.now()
  }
}

function submitOrder(payload) {
  const order = buildOrder(payload)
  if (cloudReady) {
    return call('submitOrder', { order }).then(d => (d && d.order) || order)
  }
  order._id = 'local_' + order.no
  store.addLocalOrder(order)
  return Promise.resolve(order)
}

function getMyOrders() {
  if (cloudReady) {
    return call('myOrders').then(d => (d && d.orders) || [])
  }
  return Promise.resolve(store.getLocalOrders())
}

function listOrders() {
  if (cloudReady) {
    return call('listOrders').then(d => (d && d.orders) || [])
  }
  return Promise.resolve(store.getLocalOrders())
}

function updateOrderStatus(id, status) {
  if (cloudReady) {
    return call('updateOrderStatus', { id, status }).then(() => true)
  }
  store.updateLocalOrder(id, { status })
  return Promise.resolve(true)
}

function saveProduct(product) {
  if (cloudReady) return call('saveProduct', { product }).then(() => true)
  return Promise.resolve(true)
}

module.exports = {
  init, isCloud, getCatalog, submitOrder, getMyOrders, listOrders,
  updateOrderStatus, saveProduct, fmtPrice, decorate
}

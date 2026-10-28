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

// 本地模式：演示数据 + 店主新增 - 删除，再叠加改价/上下架覆盖
function localCatalog() {
  const overrides = store.getProductOverrides()
  const custom = store.getCustomProducts()
  const deleted = store.getDeletedProducts()
  const products = mock.products
    .concat(custom)
    .filter(p => deleted.indexOf(p._id) < 0)
    .map(p => (overrides[p._id] ? Object.assign({}, p, overrides[p._id]) : p))
  return { categories: mock.categories, products, shop: mock.shop }
}

function getCatalog() {
  if (cloudReady) {
    return call('catalog')
      .then(d => (d && d.products && d.products.length ? d : mock))
      .catch(() => mock)
  }
  return Promise.resolve(localCatalog())
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

// 当前访问者身份：云模式返回 openid + 是否管理员；本地模式返回 local
function whoami() {
  if (cloudReady) {
    return call('whoami').catch(() => ({ openid: '', isAdmin: false, local: false }))
  }
  return Promise.resolve({ openid: 'local', isAdmin: false, local: true })
}

function saveProduct(product) {
  if (cloudReady) return call('saveProduct', { product }).then(d => (d && d.product) || product)
  const p = Object.assign({}, product)
  const custom = store.getCustomProducts()
  // 新增
  if (!p._id) {
    p._id = 'c_' + Date.now()
    store.setCustomProducts(custom.concat([p]))
    return Promise.resolve(p)
  }
  // 编辑自定义商品
  if (custom.some(c => c._id === p._id)) {
    store.setCustomProducts(
      custom.map(c => (c._id === p._id ? Object.assign({}, c, p) : c))
    )
    return Promise.resolve(p)
  }
  // 编辑演示商品：写覆盖层
  store.setProductOverride(p._id, p)
  return Promise.resolve(p)
}

function deleteProduct(id) {
  if (cloudReady) return call('deleteProduct', { id }).then(() => true)
  const custom = store.getCustomProducts()
  if (custom.some(c => c._id === id)) {
    store.setCustomProducts(custom.filter(c => c._id !== id))
  } else {
    const deleted = store.getDeletedProducts()
    if (deleted.indexOf(id) < 0) {
      deleted.push(id)
      store.setDeletedProducts(deleted)
    }
  }
  return Promise.resolve(true)
}

module.exports = {
  init, isCloud, getCatalog, submitOrder, getMyOrders, listOrders,
  updateOrderStatus, saveProduct, deleteProduct, whoami, fmtPrice, decorate
}

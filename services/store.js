// 极简状态管理：购物车（选款清单）+ 本地订单
const CART_KEY = 'shop_cart_v1'
const ORDER_KEY = 'shop_orders_v1'
const PROD_OVERRIDE_KEY = 'shop_product_overrides_v1'
const CUSTOM_PRODUCT_KEY = 'shop_custom_products_v1'
const DELETED_PRODUCT_KEY = 'shop_deleted_products_v1'

function read(key, def) {
  try {
    const v = wx.getStorageSync(key)
    return v || def
  } catch (e) {
    return def
  }
}

function write(key, val) {
  try {
    wx.setStorageSync(key, val)
  } catch (e) {}
}

// { productId: qty }
function getCart() {
  return read(CART_KEY, {})
}

function setCart(cart) {
  write(CART_KEY, cart)
  return cart
}

function addToCart(id, n) {
  const cart = getCart()
  cart[id] = (cart[id] || 0) + (n === undefined ? 1 : n)
  if (cart[id] <= 0) delete cart[id]
  return setCart(cart)
}

function setQty(id, qty) {
  const cart = getCart()
  if (qty <= 0) delete cart[id]
  else cart[id] = qty
  return setCart(cart)
}

function clearCart() {
  return setCart({})
}

function cartCount(cart) {
  return Object.keys(cart || getCart()).reduce((s, k) => s + cart[k], 0)
}

// 本地订单（仅演示模式使用）
function getLocalOrders() {
  return read(ORDER_KEY, [])
}

function addLocalOrder(order) {
  const list = getLocalOrders()
  list.unshift(order)
  write(ORDER_KEY, list)
  return order
}

function updateLocalOrder(id, patch) {
  const list = getLocalOrders().map(o => (o._id === id ? Object.assign({}, o, patch) : o))
  write(ORDER_KEY, list)
  return list
}

// 演示模式下的商品管理：覆盖（改）/ 新增 / 删除 三份本地数据
function getProductOverrides() {
  return read(PROD_OVERRIDE_KEY, {})
}

function getCustomProducts() {
  return read(CUSTOM_PRODUCT_KEY, [])
}

function setCustomProducts(list) {
  write(CUSTOM_PRODUCT_KEY, list)
  return list
}

function getDeletedProducts() {
  return read(DELETED_PRODUCT_KEY, [])
}

function setDeletedProducts(list) {
  write(DELETED_PRODUCT_KEY, list)
  return list
}

function setProductOverride(id, patch) {
  const o = getProductOverrides()
  o[id] = Object.assign({}, o[id], patch)
  write(PROD_OVERRIDE_KEY, o)
  return o
}

module.exports = {
  getCart, setCart, addToCart, setQty, clearCart, cartCount,
  getLocalOrders, addLocalOrder, updateLocalOrder,
  getProductOverrides, setProductOverride,
  getCustomProducts, setCustomProducts, getDeletedProducts, setDeletedProducts
}

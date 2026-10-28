// 云函数 shop：一个函数按 action 路由，减少部署数量
// 部署：微信开发者工具 -> cloudfunctions/shop -> 右键「上传并部署：云端安装依赖」
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const seed = require('./seed')

const PRODUCTS = 'products'
const ORDERS = 'orders'
const ADMINS = (process.env.ADMIN_OPENIDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

function ok(data) {
  return { ok: true, data: data || {} }
}
function fail(error) {
  return { ok: false, error: error || '操作失败' }
}

function isAdmin(openid) {
  return ADMINS.indexOf(openid) >= 0
}

async function catalog() {
  const res = await db.collection(PRODUCTS).limit(100).get()
  return ok({ categories: seed.categories, products: res.data || [], shop: seed.shop })
}

async function seedData() {
  const res = await db.collection(PRODUCTS).count()
  if (res.total > 0) return ok({ inserted: 0 })
  const tasks = seed.products.map(p => db.collection(PRODUCTS).add({ data: p }))
  await Promise.all(tasks)
  return ok({ inserted: seed.products.length })
}

async function submitOrder(event, openid) {
  const order = event.order || {}
  if (!order.items || !order.items.length) return fail('购物车为空')
  if (!order.contactName || !order.contactPhone) return fail('请填写称呼和手机号')

  const doc = {
    openid,
    no: order.no,
    items: order.items,
    total: order.total,
    itemCount: order.itemCount,
    contactName: order.contactName,
    contactPhone: order.contactPhone,
    contactWechat: order.contactWechat || '',
    pickup: order.pickup || '',
    remark: order.remark || '',
    status: 'pending',
    createdAt: Date.now()
  }
  const res = await db.collection(ORDERS).add({ data: doc })
  return ok({ order: Object.assign({ _id: res._id }, doc) })
}

async function myOrders(openid) {
  const res = await db
    .collection(ORDERS)
    .where({ openid })
    .orderBy('createdAt', 'desc')
    .limit(30)
    .get()
  return ok({ orders: res.data || [] })
}

async function listOrders(openid) {
  if (!isAdmin(openid)) return fail('无管理员权限')
  const res = await db
    .collection(ORDERS)
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get()
  return ok({ orders: res.data || [] })
}

async function updateOrderStatus(event, openid) {
  if (!isAdmin(openid)) return fail('无管理员权限')
  const { id, status } = event
  if (!id || !status) return fail('参数不全')
  await db.collection(ORDERS).doc(id).update({ data: { status } })
  return ok({})
}

async function saveProduct(event, openid) {
  if (!isAdmin(openid)) return fail('无管理员权限')
  const p = Object.assign({}, event.product || {})
  const id = p._id
  delete p._id
  delete p.priceText
  delete p.catName
  // 没有 _id = 新增，有 = 编辑
  if (!id) {
    const res = await db.collection(PRODUCTS).add({ data: p })
    return ok({ product: Object.assign({ _id: res._id }, p) })
  }
  await db.collection(PRODUCTS).doc(id).update({ data: p })
  return ok({ product: Object.assign({ _id: id }, p) })
}

async function deleteProduct(event, openid) {
  if (!isAdmin(openid)) return fail('无管理员权限')
  if (!event.id) return fail('缺少商品 id')
  await db.collection(PRODUCTS).doc(event.id).remove()
  return ok({})
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const action = event.action
  try {
    switch (action) {
      case 'catalog':
        return await catalog()
      case 'seed':
        return await seedData()
      case 'submitOrder':
        return await submitOrder(event, OPENID)
      case 'myOrders':
        return await myOrders(OPENID)
      case 'listOrders':
        return await listOrders(OPENID)
      case 'updateOrderStatus':
        return await updateOrderStatus(event, OPENID)
      case 'saveProduct':
        return await saveProduct(event, OPENID)
      case 'deleteProduct':
        return await deleteProduct(event, OPENID)
      default:
        return fail('未知 action: ' + action)
    }
  } catch (e) {
    return fail((e && e.message) || '服务异常')
  }
}

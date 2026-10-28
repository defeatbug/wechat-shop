// 端到端冒烟测试：用 mock 的 wx 能力把「首页 → 加购 → 确认 → 提交 → 订单」跑一遍
// 运行：node scripts/smoke-test.js
const path = require('path')
const mem = {}

global.wx = {
  getStorageSync: k => mem[k],
  setStorageSync: (k, v) => {
    mem[k] = v
  },
  showToast: o => console.log('   [toast]', o.title),
  showModal: o => {
    console.log('   [modal]', o.title, '|', o.content)
    if (o.success) o.success()
  },
  navigateTo: o => console.log('   [navigate]', o.url),
  redirectTo: o => console.log('   [redirect]', o.url),
  reLaunch: o => console.log('   [relaunch]', o.url),
  vibrateShort: () => {},
  createSelectorQuery: () => {
    const q = {
      in: () => q,
      select: () => q,
      selectAll: () => q,
      boundingClientRect: () => q,
      exec: cb => cb([{ top: 0 }, [{ top: 0 }, { top: 300 }, { top: 600 }]])
    }
    return q
  }
}

const shop = require('../data/products').shop
global.getApp = () => ({ globalData: { shop } })

let captured = null
global.Page = cfg => {
  captured = cfg
}

const root = path.join(__dirname, '..')
function loadPage(rel) {
  delete require.cache[require.resolve(path.join(root, rel))]
  captured = null
  require(path.join(root, rel))
  const cfg = captured
  const inst = Object.assign({}, cfg)
  inst.data = JSON.parse(JSON.stringify(cfg.data || {}))
  inst.setData = function (patch, cb) {
    Object.assign(this.data, patch)
    if (cb) cb()
  }
  return inst
}

const tick = ms => new Promise(r => setTimeout(r, ms || 30))
let failed = 0
function check(name, cond, extra) {
  if (cond) console.log('✅', name)
  else {
    failed++
    console.log('❌', name, extra === undefined ? '' : JSON.stringify(extra))
  }
}

;(async () => {
  console.log('=== 1. 首页加载 ===')
  const index = loadPage('pages/index/index.js')
  index.onLoad()
  await tick(50)
  check('分类分组已生成', index.data.groups.length === 10, index.data.groups.length)
  check('默认选中第一个分类', index.data.activeCat === 'must', index.data.activeCat)
  check('商品总数正确', index.data.groups.reduce((s, g) => s + g.products.length, 0) === 22)

  console.log('=== 2. 加购 ===')
  index.onAdd({ currentTarget: { dataset: { id: 'p_necklace' } } })
  index.onAdd({ currentTarget: { dataset: { id: 'p_necklace' } } })
  index.onAdd({ currentTarget: { dataset: { id: 'p_hat50' } } })
  await tick()
  check('已选 3 件', index.data.count === 3, index.data.count)
  check('合计 ¥118.00', index.data.totalText === '118.00', index.data.totalText)

  console.log('=== 3. 确认页 ===')
  const cart = loadPage('pages/cart/cart.js')
  cart.onLoad()
  await tick(50)
  check('清单 2 行', cart.data.lines.length === 2, cart.data.lines.length)
  check('数量正确', cart.data.lines.find(l => l._id === 'p_necklace').qty === 2)

  cart.onMinus({ currentTarget: { dataset: { id: 'p_necklace' } } })
  check('减数量后合计 ¥59.00', cart.data.totalText === '59.00', cart.data.totalText)
  cart.onPlus({ currentTarget: { dataset: { id: 'p_necklace' } } })

  cart.onName({ detail: { value: '测试用户' } })
  cart.onPhone({ detail: { value: '123' } })
  cart.onSubmit()
  check('手机号非法时不提交', cart.data.submitting === false)

  cart.onPhone({ detail: { value: '13800138000' } })
  cart.onSubmit()
  await tick(80)
  const orders = JSON.parse(JSON.stringify(mem['shop_orders_v1'] || []))
  check('订单已写入', orders.length === 1, orders.length)
  check('订单金额 ¥118.00', orders[0] && (orders[0].total / 100).toFixed(2) === '118.00')
  check('0 元商品也在订单里', orders[0] && orders[0].items.some(i => i.price === 0))
  check('提交后购物车已清空', Object.keys(mem['shop_cart_v1'] || {}).length === 0)

  console.log('=== 4. 我的订单 ===')
  const op = loadPage('pages/orders/orders.js')
  op.onShow()
  await tick(50)
  check('订单列表 1 条', op.data.orders.length === 1, op.data.orders.length)
  check('状态文案正确', op.data.orders[0].statusText === '待确认', op.data.orders[0].statusText)

  console.log('=== 5. 店主后台 ===')
  const admin = loadPage('pages/admin/admin.js')
  admin.onLoad()
  admin.onShow()
  await tick(50)
  check('后台能看到订单', admin.data.orders.length === 1)
  admin.onAdvance({ currentTarget: { dataset: { id: admin.data.orders[0]._id } } })
  await tick(50)
  check('订单状态推进到已确认', admin.data.orders[0].status === 'confirmed', admin.data.orders[0].status)

  console.log('=== 6. 商品上下架 ===')
  admin.onTab({ currentTarget: { dataset: { tab: 'goods' } } })
  await tick(50)
  check('商品列表 22 条', admin.data.products.length === 22, admin.data.products.length)
  admin.onToggle({ currentTarget: { dataset: { id: 'p_nail' } }, detail: { value: false } })
  const idx2 = loadPage('pages/index/index.js')
  idx2.onLoad()
  await tick(50)
  check('下架后首页不再出现该商品', !idx2.data.groups.some(g => g.products.some(p => p._id === 'p_nail')))

  console.log(failed ? `\n❌ ${failed} 项失败` : '\n✅ 全部通过')
  process.exit(failed ? 1 : 0)
})()

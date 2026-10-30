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
    if (o.success) o.success({ confirm: true, cancel: false })
  },
  navigateTo: o => console.log('   [navigate]', o.url),
  redirectTo: o => console.log('   [redirect]', o.url),
  reLaunch: o => console.log('   [relaunch]', o.url),
  vibrateShort: () => {},
  makePhoneCall: o => console.log('   [call]', o.phoneNumber),
  setClipboardData: o => console.log('   [clipboard]', o.data),
  navigateBack: o => console.log('   [back]', JSON.stringify(o || {})),
  setNavigationBarTitle: o => console.log('   [title]', o.title),
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
  await tick(30)
  check('订单列表 1 条', op.data.orders.length === 1, op.data.orders.length)
  check('本地模式显示店主入口', op.data.showAdminEntry === true)
  check('状态文案正确', op.data.orders[0].statusText === '待确认', op.data.orders[0].statusText)

  console.log('=== 5. 店主后台 ===')
  mem['admin_ok'] = 1 // 本地演示模式：先通过管理密码
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

  console.log('=== 7. 商品新增 / 编辑 / 删除（独立页面）===')
  const pe = loadPage('pages/product-edit/product-edit.js')
  pe.onLoad({})
  await tick(60)
  check('新增页载入分类', pe.data.cats.length === 10, pe.data.cats.length)
  pe.onField({ currentTarget: { dataset: { k: 'name' } }, detail: { value: '测试耳夹' } })
  pe.onField({ currentTarget: { dataset: { k: 'priceYuan' } }, detail: { value: '19.9' } })
  pe.onField({ currentTarget: { dataset: { k: 'desc' } }, detail: { value: '测试用' } })
  pe.onField({ currentTarget: { dataset: { k: 'emoji' } }, detail: { value: '📎' } })
  pe.onCatChange({ detail: { value: 3 } })
  pe.onSave()
  await tick(80)
  admin.loadProducts()
  await tick(60)
  check('新增后商品 23 条', admin.data.products.length === 23, admin.data.products.length)
  const added = admin.data.products.filter(p => p.name === '测试耳夹')[0]
  check('新商品价格 19.90', added && added.priceText === '19.90', added && added.priceText)
  check('新商品落在所选分类', added && added.catId === admin.data.cats[3].id, added && added.catId)

  const pe2 = loadPage('pages/product-edit/product-edit.js')
  pe2.onLoad({ id: added._id })
  await tick(60)
  check('编辑页带出原值', pe2.data.form.name === '测试耳夹')
  pe2.onField({ currentTarget: { dataset: { k: 'priceYuan' } }, detail: { value: '29' } })
  pe2.onSave()
  await tick(80)
  admin.loadProducts()
  await tick(60)
  const edited = admin.data.products.filter(p => p._id === added._id)[0]
  check('改价后 29.00', edited && edited.priceText === '29.00', edited && edited.priceText)

  admin.onDeleteProduct({ currentTarget: { dataset: { id: added._id } } })
  await tick(60)
  check('删除后回到 22 条', admin.data.products.length === 22, admin.data.products.length)

  const idx3 = loadPage('pages/index/index.js')
  idx3.onLoad()
  await tick(50)
  check('首页不出现已删除商品', !idx3.data.groups.some(g => g.products.some(p => p.name === '测试耳夹')))

  console.log('=== 8. 店铺资料弹层 ===')
  const idx4 = loadPage('pages/index/index.js')
  idx4.onLoad()
  await tick(50)
  check('店铺信息带电话/地址', idx4.data.shop.phone === '13800000000' && !!idx4.data.shop.address)
  idx4.onShopInfo()
  check('点店名打开资料弹层', idx4.data.shopOpen === true)
  idx4.onCall()
  idx4.onCopyAddr()
  idx4.closeShopInfo()
  check('关闭资料弹层', idx4.data.shopOpen === false)

  console.log('=== 9. 搜索商品 ===')
  const sp = loadPage('pages/search/search.js')
  sp.onLoad()
  await tick(50)
  // 前面第 6 节把 p_nail 下架了，所以这里只应有 21 款在售
  check('搜索页只拿在售商品', sp.data.products.length === 21 && sp.data.products.every(p => p.on !== false), sp.data.products.length)
  sp.onInput({ detail: { value: '珍珠' } })
  check('搜「珍珠」有结果', sp.data.results.length >= 2, sp.data.results.length)
  check('结果名含关键词', sp.data.results.every(p => p.name.indexOf('珍珠') >= 0 || (p.desc || '').indexOf('珍珠') >= 0))
  sp.onInput({ detail: { value: '不存在的款' } })
  check('无结果时为空', sp.data.results.length === 0)
  sp.onClear()
  check('清空关键词', sp.data.kw === '' && sp.data.results.length === 0)
  sp.onInput({ detail: { value: '耳' } })
  const first = sp.data.results[0]
  sp.onAdd({ currentTarget: { dataset: { id: first._id } } })
  const cartNow = mem['shop_cart_v1'] || {}
  check('搜索结果可直接加购', cartNow[first._id] === 1, cartNow)

  console.log('=== 10. 后台权限 ===')
  delete mem['admin_ok']
  const admin2 = loadPage('pages/admin/admin.js')
  admin2.onLoad()
  await tick(50)
  check('未通过密码时后台被拒', admin2.data.denied === true)
  check('被拒时不加载订单', admin2.data.orders.length === 0)

  mem['admin_ok'] = 1
  const admin3 = loadPage('pages/admin/admin.js')
  admin3.onLoad()
  await tick(50)
  check('通过密码后可进入', admin3.data.ready === true && admin3.data.denied === false)

  console.log(failed ? `\n❌ ${failed} 项失败` : '\n✅ 全部通过')
  process.exit(failed ? 1 : 0)
})()

// 演示数据：分类 + 商品（价格单位为「分」，避免浮点误差）
// 类目对应微信「商家自营-时尚首饰 / 服饰内衣 / 个护家清」
// 真机上线后，商品改由云数据库 products 集合维护（云开发控制台或店主后台）
const categories = [
  { id: 'must', name: '必选商品' },
  { id: 'new', name: '上新', emoji: '🛍️' },
  { id: 'necklace', name: '项链' },
  { id: 'earring', name: '耳饰' },
  { id: 'bracelet', name: '手链/手镯' },
  { id: 'ring', name: '戒指' },
  { id: 'hair', name: '发饰' },
  { id: 'hat', name: '帽子/围巾' },
  { id: 'bag', name: '包包', emoji: '🎒' },
  { id: 'other', name: '其他小物' }
]

const products = [
  // 必选：0 元礼盒，用来演示「必选款 + 0 元」
  { _id: 'p_giftbox', catId: 'must', name: '包装礼盒', price: 0, desc: '必选 · 送礼袋与贺卡', emoji: '🎁', bg: 'linear-gradient(135deg,#f6dede,#d9a3a8)', on: true },

  // 上新
  { _id: 'p_hat50', catId: 'new', name: '帽子50', price: 0, desc: '0 元福利款 · 每人限 1 件', emoji: '🧢', bg: 'linear-gradient(135deg,#b9a3d0,#7f6aa8)', on: true },
  { _id: 'p_necklace', catId: 'new', name: '沙金项链', price: 5900, desc: '不掉色 · 送礼袋', emoji: '📿', bg: 'linear-gradient(135deg,#f2d3a8,#c9974f)', on: true },
  { _id: 'p_earring_pearl', catId: 'new', name: '珍珠耳钉', price: 3900, desc: '925 银针 · 不过敏', emoji: '🦪', bg: 'linear-gradient(135deg,#f3ece6,#c9b8a8)', on: true },
  { _id: 'p_eyemask', catId: 'new', name: '小熊眼罩', price: 2900, desc: '真丝双面 · 遮光透气', emoji: '🧸', bg: 'linear-gradient(135deg,#f7e4e6,#d9a7b0)', on: true },
  { _id: 'p_nail', catId: 'new', name: '指甲刀', price: 1590, desc: '便携钥匙扣款', emoji: '✂️', bg: 'linear-gradient(135deg,#dfe8e3,#9fb8ae)', on: true },

  // 项链
  { _id: 'p_chain', catId: 'necklace', name: '细锁骨链', price: 4500, desc: '40+5cm 可调', emoji: '⛓️', bg: 'linear-gradient(135deg,#efe6d8,#c2ab84)', on: true },
  { _id: 'p_pearlneck', catId: 'necklace', name: '珍珠项链', price: 6800, desc: '淡水珍珠 · 送绒布袋', emoji: '📿', bg: 'linear-gradient(135deg,#f6f0ea,#d3c3b4)', on: true },

  // 耳饰
  { _id: 'p_earclip', catId: 'earring', name: '蝴蝶耳夹', price: 2500, desc: '无耳洞可戴', emoji: '🦋', bg: 'linear-gradient(135deg,#e9e3f6,#b3a2d6)', on: true },
  { _id: 'p_hoop', catId: 'earring', name: '圈圈耳环', price: 1990, desc: '轻量 · 一天不坠耳', emoji: '⭕', bg: 'linear-gradient(135deg,#f1e7d9,#c9b28c)', on: true },

  // 手链
  { _id: 'p_redstring', catId: 'bracelet', name: '幸运红绳手链', price: 1990, desc: '可调节 · 本命年', emoji: '🧵', bg: 'linear-gradient(135deg,#f6d6d4,#cf7f7a)', on: true },
  { _id: 'p_bead', catId: 'bracelet', name: '串珠手链', price: 3200, desc: '天然石 · 每颗不同', emoji: '🔮', bg: 'linear-gradient(135deg,#e3e9f3,#9fb0cc)', on: true },

  // 戒指
  { _id: 'p_ring', catId: 'ring', name: '素圈戒指', price: 2200, desc: '开口可调 · 百搭', emoji: '💍', bg: 'linear-gradient(135deg,#f0e8da,#c8b394)', on: true },
  { _id: 'p_ring2', catId: 'ring', name: '开口戒', price: 2600, desc: '叠戴好看', emoji: '💫', bg: 'linear-gradient(135deg,#efe3ef,#c2a5c4)', on: true },

  // 发饰
  { _id: 'p_scrunchy', catId: 'hair', name: '大肠发圈', price: 1200, desc: '不勒头发 · 三色随机', emoji: '🎀', bg: 'linear-gradient(135deg,#f8dfe4,#d9a3b4)', on: true },
  { _id: 'p_hairclip', catId: 'hair', name: '珍珠发夹', price: 1500, desc: '一字夹 · 碎发救星', emoji: '🪮', bg: 'linear-gradient(135deg,#f5efe7,#d3c1a9)', on: true },

  // 帽子/围巾
  { _id: 'p_bucket', catId: 'hat', name: '渔夫帽', price: 3500, desc: '可折叠 · 防晒', emoji: '👒', bg: 'linear-gradient(135deg,#e6e9d8,#aeb894)', on: true },
  { _id: 'p_scarf', catId: 'hat', name: '针织围巾', price: 3900, desc: '加厚 · 不扎脖', emoji: '🧣', bg: 'linear-gradient(135deg,#ecdcd6,#c29a90)', on: true },

  // 包包
  { _id: 'p_tote', catId: 'bag', name: '帆布托特包', price: 4500, desc: '大容量 · 通勤', emoji: '👜', bg: 'linear-gradient(135deg,#efe7d8,#c2ac86)', on: true },
  { _id: 'p_mini', catId: 'bag', name: '迷你斜挎包', price: 5900, desc: '链条可拆', emoji: '👝', bg: 'linear-gradient(135deg,#e8e0ef,#b3a0c4)', on: true },

  // 其他小物
  { _id: 'p_keyring', catId: 'other', name: '钥匙扣', price: 990, desc: '软胶挂件', emoji: '🔑', bg: 'linear-gradient(135deg,#e4eee9,#a3c0b4)', on: true },
  { _id: 'p_mirror', catId: 'other', name: '随身化妆镜', price: 1800, desc: '双面 · 放包里不占位', emoji: '🪞', bg: 'linear-gradient(135deg,#f2e6ea,#cba7b4)', on: true }
]

const shop = {
  name: '喜欢温柔',
  avatar: '🐻',
  notice: '选好款提交即可，免配送费；提交后店主会联系你确认，线下付款。',
  phone: '18348259989',
  address: '盛世新天地10号楼106商铺 喜欢温柔集合店',
  hours: '每天 10:00 - 21:30',
  wechat: '微信同号，可私信'
}

module.exports = { categories, products, shop }

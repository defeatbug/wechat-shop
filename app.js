const api = require('./services/api')
const config = require('./services/config')

App({
  globalData: {
    cloudReady: false,
    shop: require('./data/products').shop
  },
  onLaunch() {
    this.globalData.cloudReady = api.init()
    // 首次启动灌入演示数据（仅本地模式）
    if (!api.isCloud() && !wx.getStorageSync('shop_seeded')) {
      wx.setStorageSync('shop_seeded', 1)
    }
    if (config.cloudEnv) {
      wx.cloud.callFunction({ name: 'shop', data: { action: 'seed' } }).catch(() => {})
    }
  }
})

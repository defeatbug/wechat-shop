// 全局配置
// cloudEnv 为空时，全部走「本地存储」演示模式，无需任何云环境即可跑通流程。
// 申请到云开发环境后，把环境 ID 填进来（形如 shop-3g0xxxxxx），即可切换为多人真实下单。
module.exports = {
  cloudEnv: '',
  // 管理员 openid 白名单（云函数侧也应校验；这里仅用于前端入口显示）
  adminOpenids: [],
  // 订单提交后给用户的提示
  submitTip: '提交成功，请加店主微信 / 到店确认后付款'
}

# 注意：这是「浏览器预览稿」，不是小程序本体

- 这个目录里的 `index.html` 只是把小程序界面用 HTML/CSS 重画了一遍，**用来在没有微信开发者工具的环境里看效果、出截图**。
- **真正要上线的小程序代码在上一级目录**：`app.json`、`app.js`、`pages/`、`services/`、`data/`、`cloudfunctions/`、`project.config.json`。
- 导入方式：微信开发者工具 → 导入项目 → 选择 `wechat-shop` 目录（不是 `preview` 目录）→ AppID 用测试号即可。

小程序代码无法在浏览器里直接运行（WXML/WXSS 依赖微信运行时），所以需要这份预览稿来「看」效果。

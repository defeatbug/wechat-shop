// 小程序工程结构校验：检查页面四件套、事件处理函数、WXML 标签闭合、WXSS 括号
// 运行：node scripts/validate-miniapp.js
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
let errors = 0
const ok = m => console.log('✅', m)
const bad = m => {
  errors++
  console.log('❌', m)
}

// 1. app.json 与页面四件套
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))
ok(`app.json 合法，共 ${app.pages.length} 个页面`)

for (const page of app.pages) {
  const base = path.join(root, page)
  for (const ext of ['.js', '.json', '.wxml', '.wxss']) {
    if (!fs.existsSync(base + ext)) bad(`${page}${ext} 缺失`)
  }
  try {
    JSON.parse(fs.readFileSync(base + '.json', 'utf8'))
  } catch (e) {
    bad(`${page}.json 不是合法 JSON`)
  }
}
ok('所有页面 .js/.json/.wxml/.wxss 齐全且 JSON 合法')

// 2. WXML 事件绑定的处理函数必须在页面 js 里存在
const EVENTS = /\b(?:bind|catch)(?:tap|input|change|scroll|blur|confirm|longpress|touchstart|touchend)\s*=\s*"([A-Za-z_$][\w$]*)"/g
for (const page of app.pages) {
  const wxml = fs.readFileSync(path.join(root, page + '.wxml'), 'utf8')
  const js = fs.readFileSync(path.join(root, page + '.js'), 'utf8')
  const handlers = new Set()
  let m
  EVENTS.lastIndex = 0
  while ((m = EVENTS.exec(wxml))) handlers.add(m[1])
  const missing = [...handlers].filter(h => !new RegExp(`\\b${h}\\s*\\(`).test(js))
  if (missing.length) bad(`${page} 缺少事件处理函数: ${missing.join(', ')}`)
  else ok(`${page} 的 ${handlers.size} 个事件处理函数都存在`)
}

// 3. WXML 标签闭合
const SELF_CLOSE = /\/>$/
for (const page of app.pages) {
  const wxml = fs.readFileSync(path.join(root, page + '.wxml'), 'utf8').replace(/<!--[\s\S]*?-->/g, '')
  const stack = []
  const re = /<\/?([a-zA-Z][\w-]*)(?:\s[^>]*)?>/g
  let m
  let balanced = true
  while ((m = re.exec(wxml))) {
    const token = m[0]
    const tag = m[1]
    if (token.startsWith('</')) {
      const top = stack.pop()
      if (top !== tag) {
        balanced = false
        bad(`${page}.wxml 标签不匹配: </${tag}> 对应 <${top}>`)
        break
      }
    } else if (!SELF_CLOSE.test(token)) {
      stack.push(tag)
    }
  }
  if (balanced && stack.length) {
    balanced = false
    bad(`${page}.wxml 未闭合: ${stack.join(',')}`)
  }
  if (balanced) ok(`${page}.wxml 标签闭合正确`)
}

// 4. WXSS 括号平衡
for (const page of app.pages) {
  for (const f of [page + '.wxss', 'app.wxss']) {
    const css = fs.readFileSync(path.join(root, f), 'utf8')
    const open = (css.match(/{/g) || []).length
    const close = (css.match(/}/g) || []).length
    if (open !== close) bad(`${f} 花括号不平衡 (${open}/${close})`)
  }
}
ok('WXSS 花括号平衡')

// 5. 云函数依赖与入口
const cf = path.join(root, 'cloudfunctions/shop')
for (const f of ['index.js', 'package.json', 'seed.js']) {
  if (!fs.existsSync(path.join(cf, f))) bad(`云函数缺少 ${f}`)
}
const pkg = JSON.parse(fs.readFileSync(path.join(cf, 'package.json'), 'utf8'))
if (!pkg.dependencies || !pkg.dependencies['wx-server-sdk']) bad('云函数 package.json 缺少 wx-server-sdk')
else ok('云函数结构与依赖正常')

// 6. project.config.json
const pc = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'))
if (pc.compileType !== 'miniprogram') bad('project.config.json compileType 错误')
if (!pc.cloudfunctionRoot) bad('project.config.json 缺少 cloudfunctionRoot')
else ok(`project.config.json 正常（appid=${pc.appid}，云函数目录=${pc.cloudfunctionRoot}）`)

console.log(errors ? `\n❌ 共 ${errors} 处问题` : '\n✅ 小程序工程结构校验通过')
process.exit(errors ? 1 : 0)

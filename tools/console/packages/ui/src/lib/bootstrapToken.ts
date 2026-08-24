// 必须是 main.tsx 里第一个被求值的本地模块（导入顺序早于 './app/routes'）。
//
// 为什么需要这个专门的文件：ES Module 求值顺序是「整棵 import 图先跑完，宿主模块的语句才跑」——
// createHashRouter()（app/routes.tsx 顶层）会在 main.tsx 自己的任何语句之前就已经执行，读取当时
// window.location.hash 的原始值。首次打开时 hash 是 server 注入的 `#token=…`（02 §2.0/§2.8 约定），
// HashRouter 会把它整段当成 pathname（`/token=…`），匹配不到任何路由，触发 react-router 内建默认
// ErrorBoundary 打一条 console.error（"Error handled by React Router default ErrorBoundary"）——
// 实测：真实 server 起在 5170 时用 playwright 复现，每次带 token 打开首屏都会炸这一下，虽然界面
// 最终仍会自愈（getToken() 的 history.replaceState 会把 hash 清掉，下一次渲染看着一切正常），
// 但白炸一次控制台错误不是可接受的稳态。
//
// 修法：让 getToken()（读 hash → 存 localStorage → replaceState 清 hash）在 createHashRouter 读取
// window.location.hash 之前先跑一遍。main.tsx 把这个文件排在 `import './app/routes'` 之前 import
// 即可——单次副作用，ES Module 天然幂等缓存，之后各处再 `import { getToken } from './api'` 拿到的
// 是同一份已求值模块，不会重复执行。
import { getToken } from './api'

getToken()

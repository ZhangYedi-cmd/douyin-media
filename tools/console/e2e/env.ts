// 环境加载（被 playwright.config.ts 首行 import，承担 dotenv 副作用）。
// 别把 dotenv 挪回 config：import 会被提升，其他模块会先于 dotenv 求值读到 undefined。
//
// 安全红线：模型网关域名、密钥、内部服务名一律只住 .env.e2e（gitignored），
// 本仓任何入库文件不得出现公司内部标识（npm test 前置的 guard 脚本会拦）。
import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
config({ path: join(here, '.env.e2e') })

// 与供应商无关的通用缺省（.env.e2e 可覆盖）
process.env['MIDSCENE_MODEL_TIMEOUT'] ||= '60000' // 请求级超时：防单请求挂死吃光用例预算
process.env['MIDSCENE_MODEL_RETRY_COUNT'] ||= '2'
process.env['MIDSCENE_PREFERRED_LANGUAGE'] ||= 'zh-CN'

export const CONSOLE_URL = process.env['CONSOLE_URL'] ?? 'http://127.0.0.1:5170'

const REQUIRED = ['MIDSCENE_MODEL_BASE_URL', 'MIDSCENE_MODEL_API_KEY', 'MIDSCENE_MODEL_NAME'] as const
export const missingModelEnv = REQUIRED.filter((k) => !process.env[k])
if (missingModelEnv.length > 0) {
  // 用例池未全启用前只警告不拦截；G3 取消 skip 后跑 ai* 步骤缺配会直接失败
  console.warn(`[e2e] midscene 模型配置缺失: ${missingModelEnv.join(', ')}（cp .env.e2e.example .env.e2e 填真值）`)
}

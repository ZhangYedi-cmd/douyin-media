// 信息安全闸：扫描全部已跟踪文件（内容 + 文件名），禁公司内部标识入库。
// 关键词按片段拼接构造——避免本文件自身携带完整关键词被扫描器命中。
// 命中处置见 05 实施计划 §3 红线：新增文件改干净重提交；若已产生含关键词的 commit，删仓重建历史。
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const banned = [
  ['san', 'kuai'],
  ['mei', 'tuan'],
  ['dian', 'ping'],
  ['satur', 'day'],
  ['nib', 'fe'],
].map((p) => p.join(''))

const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean)
const hits = []

// commit 作者身份也进历史元数据，一样会被扫——corp 邮箱在这仓不许用
for (const key of ['user.name', 'user.email']) {
  let v = ''
  try {
    v = execSync(`git config ${key}`, { encoding: 'utf8' }).trim().toLowerCase()
  } catch {}
  for (const w of banned) if (v.includes(w)) hits.push(`git config ${key} = ${v}（改用 GitHub 身份：git config ${key} <safe>）`)
}

for (const file of files) {
  const nameLower = file.toLowerCase()
  for (const w of banned) if (nameLower.includes(w)) hits.push(`${file}（文件名）: ${w}`)
  let text
  try {
    text = readFileSync(file, 'utf8').toLowerCase()
  } catch {
    continue // 读不了的（二进制/已删除）跳过
  }
  for (const w of banned) {
    if (text.includes(w)) {
      const line = text.split('\n').findIndex((l) => l.includes(w)) + 1
      hits.push(`${file}:${line}: ${w}`)
    }
  }
}

if (hits.length > 0) {
  console.error('✗ 信息安全闸拦截——入库内容含内部标识关键词：')
  for (const h of hits) console.error('  ' + h)
  console.error('处置：把敏感值挪进 gitignored 的本地文件（如 e2e/.env.e2e）后重提交。')
  process.exit(1)
}
console.log(`✓ guard: ${files.length} 个入库文件无内部标识关键词`)

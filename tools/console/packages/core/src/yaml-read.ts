// 只读 YAML 解析（非系统真相源文件用，如 backlog add 的候选输入文件）。
// 与 yaml-edit.ts 的点位编辑体系无关——那份是「改系统文件禁整篇重写」的红线；
// 这里解析的是一次性读入即弃的外部输入，用 yaml 包的 parse() 直接吃成 JS 值完全安全。
// 之所以从 core 转一手而不让 cli 直接 `import 'yaml'`：cli 的依赖表按拍板 §2.17 锁定为
// commander + @console/core「到此为止」，不再单独登记 yaml——core 已经依赖它，经此复用。
import { parse } from 'yaml'

export function parseYamlValue(raw: string): unknown {
  return parse(raw)
}

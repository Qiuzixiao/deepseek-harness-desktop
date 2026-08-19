#!/usr/bin/env node
/**
 * Sync the current branch with upstream/master.
 *
 * Safe to rerun. Never touches the working tree destructively:
 *  - aborts (with instructions) if the working tree is dirty
 *  - fetches upstream, reports how far behind/ahead we are
 *  - merges upstream/master
 *  - prints the next step, whatever the outcome
 */
import { execFileSync } from 'node:child_process'

const RUN = (args) => execFileSync('git', args, { stdio: ['ignore', 'inherit', 'inherit'] })

function print(line = '') { console.log(line) }
function warn(line) { console.error(`\x1b[33m${line}\x1b[0m`) }
function ok(line) { console.log(`\x1b[32m${line}\x1b[0m`) }
function step(n, text) { print(`\n\x1b[36m[${n}] ${text}\x1b[0m`) }

function tryRun(args) {
  try { RUN(args); return true }
  catch { return false }
}

// -- 0. safety gate: the working tree must be clean before we merge
step(1, '检查工作区是否干净')
const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' })
if (dirty.trim().length > 0) {
  warn(`工作区有未提交的改动，先处理它们再同步：`)
  print(dirty)
  print('  → 想保留改动：  git add . && git commit -m "wip"')
  print('  → 先放一边：    git stash')
  print('  完成后重新运行：  yarn upstream:sync')
  process.exit(1)
}
ok('工作区干净 ✓')

// -- 1. fetch upstream
step(2, '拉取上游最新提交')
if (tryRun(['fetch', 'upstream', 'master']) === null) {
  warn('fetch 失败（网络问题？），请稍后重试。')
  process.exit(1)
}
ok('上游已拉取 ✓')

// -- 2. how far apart are we?
step(3, '对比本地与上游的差异')
const count = execFileSync(
  'git', ['rev-list', '--left-right', '--count', 'upstream/master...HEAD'],
  { encoding: 'utf8' },
).trim().split(/\s+/)
const [behind, ahead] = count.map(Number)
print(`上游有 ${behind} 个新提交未合并`)
print(`本地有 ${ahead} 个提交未推送到上游`)

if (behind === 0) {
  ok('已经是最新，无需合并 ✓')
  process.exit(0)
}

// -- 3. merge
step(4, `合并上游（${behind} 个提交）`)
const merged = tryRun(['merge', 'upstream/master', '--no-edit'])

if (!merged) {
  warn('合并遇到冲突，需要手动处理：')
  print('  1. 打开冲突文件，搜索 <<<<<<< HEAD 标记')
  print('  2. 保留你想要的两边内容，删掉标记行')
  print('  3. 处理完后：')
  print('       git add <文件>')
  print('       git commit --no-edit   # 完成合并')
  print('  处理冲突拿不准时，随时可以： git merge --abort 回到合并前')
  process.exit(1)
}

ok('合并成功 ✓')
print('\n接下来建议：')
print('  1. 重新安装依赖：        corepack yarn install')
print('  2. 跑类型检查：          corepack yarn typecheck')
print('  3. 跑测试：              corepack yarn test')
print('  如果有失败，多半是上游改了行为，检查测试和代码再决定。')

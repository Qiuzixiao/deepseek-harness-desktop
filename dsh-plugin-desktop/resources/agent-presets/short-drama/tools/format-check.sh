#!/usr/bin/env bash
set -uo pipefail

# ============================================================
# 短剧正文格式校验脚本（机器可程序化校验的格式红线）
# 用法: bash format-check.sh <正文文件> [long|short]
#   long  = 长制式 1200–2000 字（默认）
#   short = 短视频制式 约 500 字（参考 300–700）
# 退出码: 0 = 全部通过, 1 = 存在格式问题
# ============================================================

FILE="${1:-}"
MODE="${2:-long}"

if [ -z "$FILE" ]; then
  echo "用法: bash format-check.sh <正文文件> [long|short]" >&2
  exit 2
fi
if [ ! -f "$FILE" ]; then
  echo "错误: 文件不存在: $FILE" >&2
  exit 2
fi

FAIL=0
ok()   { echo "  [通过] $1"; }
warn() { echo "  [失败] $1"; FAIL=1; }

echo "校验文件: $FILE  (制式: $MODE)"
echo "--------------------------------"

# 1. 集标题（首行应为「第N集」）
first_line=$(head -1 "$FILE" | tr -d '\r')
if printf '%s' "$first_line" | grep -qE '^第[0-9]+集$'; then
  ok "集标题: $first_line"
else
  warn "集标题格式错误（应为「第N集」）: $first_line"
fi

# 2. 场次头（N-M 地点 时间 内/外）
if grep -qE '^[0-9]+-[0-9]+[[:space:]]+.+[[:space:]](内|外)$' "$FILE"; then
  ok "场次头存在（集数-场次 地点 时间 内/外）"
else
  warn "未检测到合法场次头（格式「集数-场次 地点 时间 内/外」）"
fi

# 3. 人物行（场次头下一行应为「人物：」）
if grep -qE '^人物：' "$FILE"; then
  ok "人物行存在"
else
  warn "缺少「人物：」行"
fi

# 4. 动作行（以 △ 开头）
if grep -qE '^△' "$FILE"; then
  ok "存在 △ 动作行"
else
  warn "未检测到 △ 动作行"
fi

# 5. OS 条数（≤3）
os_count=$(grep -c '（OS）' "$FILE" || true)
if [ "$os_count" -le 3 ]; then
  ok "OS 条数: $os_count (上限 3)"
else
  warn "OS 条数超标: $os_count (上限 3)"
fi

# 6. 中文破折号（禁用）
if grep -q '——' "$FILE"; then
  warn "含中文破折号「——」（应禁用）"
else
  ok "无中文破折号"
fi

# 7. 拟声词开头（单集不以拟声词开头）
if printf '%s' "$first_line" | grep -qE '^(砰|啪|咚|咔嚓|轰|咣|啪嗒|滴答|咚咚|嗖)'; then
  warn "集标题行疑似以拟声词开头（正文单集禁以拟声词开头）"
else
  ok "非拟声词开头"
fi

# 8. 卡点特写
if grep -qE '^【卡点特写' "$FILE"; then
  ok "含卡点特写"
else
  warn "缺少【卡点特写：...】"
fi

# 9. 结尾标记
if grep -q '【本集完】' "$FILE"; then
  ok "结尾含【本集完】"
else
  warn "缺少【本集完】"
fi

# 10. 字数区间（去除所有空白后统计有效字符）
char_count=$(tr -d '[:space:]' < "$FILE" | wc -c | tr -d ' ')
if [ "$MODE" = "long" ]; then
  if [ "$char_count" -ge 1200 ] && [ "$char_count" -le 2000 ]; then
    ok "字数: $char_count (长制式 1200–2000)"
  else
    warn "字数: $char_count 不在长制式区间 1200–2000"
  fi
else
  if [ "$char_count" -ge 300 ] && [ "$char_count" -le 700 ]; then
    ok "字数: $char_count (短视频制式参考 300–700)"
  else
    warn "字数: $char_count 偏离短视频制式（约500，参考 300–700）"
  fi
fi

echo "--------------------------------"
if [ "$FAIL" -eq 0 ]; then
  echo "✓ 格式校验全部通过"
  exit 0
else
  echo "✗ 存在格式问题，请修正后重新校验"
  exit 1
fi

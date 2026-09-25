#!/bin/bash
# =============================================
# Sync worker/src → frontend/functions/_lib
# 消除双后端代码重复，worker/src 为唯一真相源
# 用法: ./scripts/sync-to-functions.sh
# =============================================

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/worker/src"
DST="$ROOT/frontend/functions/_lib"

echo "🔄 Syncing worker/src → frontend/functions/_lib ..."

# 清理目标目录（保留 _lib 本身）
rm -rf "$DST/routes" "$DST/middleware" "$DST/utils" "$DST/cron"
rm -f "$DST/index.ts" "$DST/types.ts"

# 创建目录结构
mkdir -p "$DST/routes" "$DST/middleware" "$DST/utils" "$DST/cron"

# 复制所有源文件
cp "$SRC/index.ts" "$DST/index.ts"
cp "$SRC/types.ts" "$DST/types.ts"
cp "$SRC/middleware/auth.ts" "$DST/middleware/auth.ts"
cp "$SRC/utils/crypto.ts" "$DST/utils/crypto.ts"
cp "$SRC/utils/date.ts" "$DST/utils/date.ts"
cp "$SRC/cron/index.ts" "$DST/cron/index.ts"

for f in "$SRC/routes"/*.ts; do
  cp "$f" "$DST/routes/$(basename "$f")"
done

# Pages Functions 特殊处理: BUCKET 为可选（R2 未在 Pages 中绑定）
sed -i '' 's/BUCKET: R2Bucket/BUCKET?: R2Bucket/' "$DST/types.ts" 2>/dev/null || \
sed -i 's/BUCKET: R2Bucket/BUCKET?: R2Bucket/' "$DST/types.ts"

echo "✅ Sync complete. Files copied:"
find "$DST" -name "*.ts" | wc -l | xargs echo "   Total .ts files:"

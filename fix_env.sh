#!/bin/bash

# 修复 .env 文件中的空值问题

echo "🔧 修复 .env 文件..."

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env 文件不存在"
    exit 1
fi

# 备份原文件
cp "$ENV_FILE" "${ENV_FILE}.backup"
echo "✅ 已备份到 ${ENV_FILE}.backup"

# 修复空值
# 将 PORT="" 替换为 PORT="5000"
# 将 EMAIL_SMTP_PORT="" 替换为 EMAIL_SMTP_PORT="465"

sed -i '' 's/^PORT=""$/PORT="5000"/' "$ENV_FILE"
sed -i '' 's/^EMAIL_SMTP_PORT=""$/EMAIL_SMTP_PORT="465"/' "$ENV_FILE"

# 如果 PORT 行不存在，添加它
if ! grep -q "^PORT=" "$ENV_FILE"; then
    echo "" >> "$ENV_FILE"
    echo "# Web 服务配置" >> "$ENV_FILE"
    echo 'PORT="5000"' >> "$ENV_FILE"
fi

echo "✅ .env 文件已修复"
echo ""
echo "修复内容："
echo "  - PORT 默认值: 5000"
echo "  - EMAIL_SMTP_PORT 默认值: 465"
echo ""
echo "如需使用 5001 端口，请运行："
echo "  export PORT=5001"
echo "  ./start.sh"

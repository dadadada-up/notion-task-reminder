#!/bin/bash
# 更新.env文件中的推送配置

ENV_FILE=".env"

# 备份原文件
cp $ENV_FILE ${ENV_FILE}.backup

# 更新PUSHPLUS_TOKEN
sed -i '' 's/PUSHPLUS_TOKEN=""/PUSHPLUS_TOKEN="3cfcadc8fcf744769292f0170e724ddb"/' $ENV_FILE

# 更新邮箱配置
sed -i '' 's/EMAIL_ENABLED="false"/EMAIL_ENABLED="true"/' $ENV_FILE
sed -i '' 's/EMAIL_SENDER="your_email@163.com"/EMAIL_SENDER="dadadada_up@163.com"/' $ENV_FILE
sed -i '' 's/EMAIL_PASSWORD=""/EMAIL_PASSWORD="BYTq5DZYLQkvbkbU"/' $ENV_FILE
sed -i '' 's/EMAIL_RECEIVER="your_email@163.com"/EMAIL_RECEIVER="dadadada_up@163.com"/' $ENV_FILE

echo "✅ .env文件已更新"
echo "📋 当前配置："
grep -E "(PUSHPLUS|EMAIL)" $ENV_FILE

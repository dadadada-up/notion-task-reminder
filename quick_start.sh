#!/bin/bash

echo "🚀 快速启动 Notion Task Manager"
echo ""

# 激活虚拟环境
source venv/bin/activate

# 设置端口
export PORT=5001

# 启动服务
./start.sh

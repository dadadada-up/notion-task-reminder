#!/bin/bash

echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║     🔧 快速修复脚本                                      ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 1. 激活虚拟环境
echo "1️⃣ 激活虚拟环境..."
source venv/bin/activate

# 2. 安装依赖
echo ""
echo "2️⃣ 安装依赖..."
pip install python-dotenv -q

# 3. 修复 .env 文件
echo ""
echo "3️⃣ 修复 .env 文件..."
./fix_env.sh

# 4. 设置端口
echo ""
echo "4️⃣ 设置端口为 5001（避免冲突）..."
export PORT=5001

# 5. 验证配置
echo ""
echo "5️⃣ 验证配置..."
python3 verify_optimization.py

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║     ✅ 修复完成                                          ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "下一步："
echo "  export PORT=5001"
echo "  ./start.sh"

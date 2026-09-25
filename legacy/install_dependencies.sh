#!/bin/bash

# 依赖安装脚本
# 处理 Python 3.13 兼容性问题

echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║     📦 安装项目依赖                                      ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 检查 Python 版本
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python 版本: $PYTHON_VERSION"

# 激活虚拟环境
if [ -d "venv" ]; then
    echo "✅ 激活虚拟环境..."
    source venv/bin/activate
else
    echo "❌ 虚拟环境不存在，请先运行 ./start.sh"
    exit 1
fi

# 升级 pip
echo ""
echo "📦 升级 pip..."
pip install --upgrade pip

# 安装基础依赖
echo ""
echo "📦 安装基础依赖..."
pip install requests==2.31.0
pip install pytz==2024.1
pip install flask==3.0.0
pip install flask-cors==4.0.0
pip install python-dotenv==1.0.0

# 尝试安装 pydantic
echo ""
echo "📦 安装 pydantic..."
echo "尝试安装最新版本（兼容 Python 3.13）..."

# 先尝试最新版本
if pip install "pydantic>=2.0.0" 2>/dev/null; then
    echo "✅ Pydantic 安装成功"
else
    echo "⚠️  最新版本安装失败，尝试预发布版本..."
    if pip install --pre "pydantic>=2.0.0" 2>/dev/null; then
        echo "✅ Pydantic 预发布版本安装成功"
    else
        echo "❌ Pydantic 安装失败"
        echo ""
        echo "建议方案："
        echo "1. 使用 Python 3.11 或 3.12"
        echo "2. 或者等待 pydantic 更新以支持 Python 3.13"
        echo ""
        echo "临时解决方案："
        echo "创建新的虚拟环境使用 Python 3.11："
        echo "  python3.11 -m venv venv"
        echo "  source venv/bin/activate"
        echo "  ./install_dependencies.sh"
        exit 1
    fi
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║     ✅ 依赖安装完成                                      ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "下一步："
echo "  python3 verify_optimization.py  # 验证优化"
echo "  ./start.sh                      # 启动服务"

#!/bin/bash

echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║     🧪 运行单元测试                                      ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

cd unit

echo "运行配置测试..."
python3 test_config.py -v

echo ""
echo "运行 NotionService 测试..."
python3 test_notion_service.py -v

echo ""
echo "运行 PushService 测试..."
python3 test_push_service.py -v

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║     ✅ 单元测试完成                                      ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"

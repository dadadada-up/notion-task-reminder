# 🧪 测试脚本

本目录包含 Notion Task Manager 项目的测试脚本和工具。

## 📋 文件说明

### 主要测试脚本

- **test.py** - 原始测试脚本
  - 测试 Notion 连接
  - 测试消息格式化
  - 验证基础功能

- **quick_test.py** - 快速测试脚本
  - 快速验证配置
  - 简化的测试流程

### 推送测试

- **test_pushplus.py** - PushPlus 推送测试
  - 测试 PushPlus API
  - 验证消息格式

- **diagnose_pushplus.py** - PushPlus 诊断工具
  - 诊断推送问题
  - 详细错误报告

### 修复和调试

- **test_fix.py** - 修复测试脚本
  - 问题修复验证
  - 回归测试

### 测试输出

- **test_output_email.html** - 邮件测试输出
- **test_output_markdown.md** - Markdown 测试输出

### 配置文件

- **.env.test** - 测试环境配置
  - 用于测试的环境变量
  - 与生产环境隔离

## 🚀 使用方法

### 运行基础测试

```bash
# 激活虚拟环境
source ../venv/bin/activate

# 使用测试配置
export $(cat .env.test | grep -v '^#' | xargs)

# 运行测试
python test.py
```

### 快速测试

```bash
python quick_test.py
```

### 测试 PushPlus

```bash
python test_pushplus.py
```

### 诊断问题

```bash
python diagnose_pushplus.py
```

## ⚠️ 注意事项

1. **环境配置**: 确保 `.env.test` 已正确配置
2. **虚拟环境**: 运行前需激活虚拟环境
3. **API 限制**: 注意 Notion API 和 PushPlus 的调用频率限制
4. **测试数据**: 测试脚本可能会修改 Notion 数据库，请谨慎使用

## 📝 添加新测试

创建新测试脚本时，请遵循以下规范：

1. 文件命名: `test_*.py` 或 `*_test.py`
2. 使用 `.env.test` 配置
3. 添加适当的错误处理
4. 更新本 README

---

返回 [项目主页](../README.md)

# PushPlus 推送问题排查指南

## 问题现象
- API 返回 `{"code":200,"msg":"执行成功"}`
- 日志显示 "PushPlus 消息发送成功"
- 但实际未收到微信推送消息

## 可能原因及解决方案

### 1. PushPlus Token 未绑定微信 ⭐ 最常见

**症状**: API 接受请求但不推送消息

**解决方案**:
1. 访问 [PushPlus 官网](http://www.pushplus.plus)
2. 使用微信扫码登录
3. 在"一对一推送" -> "发送消息"页面，确认已绑定微信
4. 复制正确的 Token（32位字符串）
5. 更新 GitHub Secrets 中的 `PUSHPLUS_TOKEN`

### 2. 未关注 PushPlus 公众号

**症状**: Token 已绑定但收不到消息

**解决方案**:
1. 微信搜索公众号 "PushPlus推送加"
2. 关注该公众号
3. 发送任意消息激活

### 3. 微信屏蔽了公众号消息

**症状**: 公众号已关注但收不到消息

**解决方案**:
1. 打开微信 -> 通讯录 -> 公众号 -> PushPlus推送加
2. 点击右上角 "..." -> 设置
3. 确认"接收文章推送"已开启
4. 检查"消息免打扰"是否关闭

### 4. PushPlus 服务限制

**症状**: 偶尔能收到，偶尔收不到

**可能原因**:
- 免费版有频率限制（每天200条）
- 内容重复被过滤
- 服务器繁忙

**解决方案**:
- 检查发送频率
- 查看 [PushPlus 发送记录](http://www.pushplus.plus/push)
- 考虑升级到付费版

### 5. 消息格式问题

**症状**: 某些消息能收到，某些收不到

**解决方案**:
- 使用 `html` 模板而非 `markdown`（已在代码中修复）
- 避免特殊字符
- 控制消息长度（建议 < 4096 字符）

## 测试步骤

### 步骤 1: 运行测试脚本

```bash
# 设置环境变量
export PUSHPLUS_TOKEN='your_token_here'

# 运行测试脚本
python3 test_pushplus.py
```

### 步骤 2: 检查 PushPlus 网站

1. 访问 http://www.pushplus.plus
2. 登录后查看"发送记录"
3. 确认消息是否显示为"已发送"
4. 如果显示"已发送"但未收到，说明是微信端问题

### 步骤 3: 手动测试

在 PushPlus 网站上手动发送一条测试消息：
1. 登录 http://www.pushplus.plus
2. 进入"一对一推送" -> "发送消息"
3. 填写标题和内容
4. 点击"发送"
5. 检查微信是否收到

## 替代方案

如果 PushPlus 持续无法使用，可以考虑：

### 方案 1: 使用 WxPusher

```bash
# 设置环境变量
export WXPUSHER_TOKEN='your_wxpusher_token'
export WXPUSHER_UID='your_wxpusher_uid'
```

WxPusher 注册地址: https://wxpusher.zjiecode.com

### 方案 2: 使用 Server酱

修改代码使用 Server酱（需要修改 `send_to_wechat` 函数）

### 方案 3: 使用邮件推送

添加邮件推送功能（需要额外开发）

## 调试命令

```bash
# 查看环境变量
echo $PUSHPLUS_TOKEN

# 测试 API 连接
curl -X POST http://www.pushplus.plus/send \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your_token",
    "title": "测试",
    "content": "这是一条测试消息",
    "template": "html"
  }'
```

## 联系支持

如果以上方法都无法解决：
1. 访问 PushPlus 官网查看文档
2. 加入 PushPlus 官方群咨询
3. 检查 PushPlus 是否有服务公告

## 代码改进

已在 `main.py` 中实现的改进：
- ✅ 将模板从 `markdown` 改为 `html`
- ✅ 添加详细的调试日志
- ✅ 添加消息发送状态提示
- ✅ 将换行符转换为 HTML `<br/>` 标签

## 下一步

1. 运行 `python3 test_pushplus.py` 测试
2. 检查 PushPlus 网站的发送记录
3. 确认微信公众号设置
4. 如果问题依旧，考虑切换到 WxPusher

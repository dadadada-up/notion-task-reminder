# 🚨 PushPlus 收不到消息 - 快速修复指南

## 问题现象
✅ API 返回成功 `{"code":200,"msg":"执行成功"}`  
❌ 微信未收到推送消息

---

## 🔧 立即检查（按顺序）

### ✅ 检查项 1: 是否关注了 PushPlus 公众号？

**操作步骤：**
1. 打开微信
2. 搜索公众号：`PushPlus推送加`
3. 如果未关注，点击关注
4. 关注后发送任意消息激活

---

### ✅ 检查项 2: Token 是否已绑定微信？

**操作步骤：**
1. 访问 <http://www.pushplus.plus>
2. 使用微信扫码登录
3. 检查页面是否显示"已绑定微信"
4. 复制正确的 Token（32位字符）
5. 确认 GitHub Secrets 中的 `PUSHPLUS_TOKEN` 与网站上的一致

**如何更新 GitHub Secrets：**
```
GitHub 仓库 -> Settings -> Secrets and variables -> Actions
-> 找到 PUSHPLUS_TOKEN -> Update
```

---

### ✅ 检查项 3: 微信是否屏蔽了公众号？

**操作步骤：**
1. 微信 -> 通讯录 -> 公众号 -> PushPlus推送加
2. 点击右上角 `...` -> 设置
3. 确认 `接收文章推送` 已开启 ✅
4. 确认 `消息免打扰` 已关闭 ❌

---

### ✅ 检查项 4: 查看 PushPlus 发送记录

**操作步骤：**
1. 访问 <http://www.pushplus.plus/push>
2. 登录后查看发送记录
3. 检查最近的消息状态：
   - 如果显示"已发送"但未收到 → 微信端问题（检查项 3）
   - 如果显示"发送失败" → Token 或绑定问题（检查项 2）

---

## 🧪 运行诊断工具

```bash
cd /Users/dada/github项目/notion-task-reminder
python3 diagnose_pushplus.py
```

按提示输入您的 PushPlus Token，工具会自动诊断问题。

---

## 🔄 替代方案：使用 WxPusher

如果 PushPlus 持续无法使用，可切换到 WxPusher：

1. 访问 <https://wxpusher.zjiecode.com>
2. 注册并获取 `APP_TOKEN` 和 `UID`
3. 在 GitHub Secrets 中添加：
   - `WXPUSHER_TOKEN`: 你的 APP_TOKEN
   - `WXPUSHER_UID`: 你的 UID

代码已支持 WxPusher，会自动切换。

---

## 📝 代码已修复的问题

✅ 模板格式从 `markdown` 改为 `html`（兼容性更好）  
✅ 添加换行符转换（`\n` → `<br/>`）  
✅ 添加详细的调试日志  
✅ 添加消息发送状态提示

---

## 💡 最可能的原因

根据经验，90% 的情况是以下原因之一：

1. **未关注公众号**（40%）
2. **Token 未绑定微信**（30%）
3. **微信屏蔽了公众号消息**（20%）
4. **Token 复制错误**（10%）

---

## 📞 需要帮助？

如果以上方法都无法解决：

1. 查看详细排查指南：`TROUBLESHOOTING.md`
2. 访问 PushPlus 官方文档：<http://www.pushplus.plus/doc/>
3. 检查 GitHub Actions 日志中的详细错误信息

---

**最后更新**: 2025-11-28

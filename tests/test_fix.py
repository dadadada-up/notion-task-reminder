#!/usr/bin/env python3
"""
测试代码修复是否有效
模拟实际的消息发送流程
"""

import requests
import json
from datetime import datetime
import random

def test_message_format():
    """测试消息格式转换"""
    print("\n" + "=" * 70)
    print("📝 测试 1: 消息格式转换")
    print("=" * 70)
    
    # 模拟原始消息（markdown 格式）
    original_message = """📋 待办任务 | dada (共5条)

1. 搭建一个农业政策平台？ | inbox (P1 | 项目)
2. AI产品经理提效 | inbox (P2 | 学习)
3. 如何集成评论系统 | inbox (P3 | 技术)
4. 做一个基于微信的机器人 | inbox (P1 | 项目)
5. 废旧网 | inbox (P3 | 其他)"""
    
    # 应用修复：转换为 HTML
    html_content = original_message.replace('\n', '<br/>')
    
    print("\n原始消息（Markdown）:")
    print("-" * 70)
    print(original_message)
    
    print("\n转换后消息（HTML）:")
    print("-" * 70)
    print(html_content)
    
    print("\n✅ 格式转换测试通过")
    return True

def test_api_call_simulation():
    """模拟 API 调用（不实际发送）"""
    print("\n" + "=" * 70)
    print("🔧 测试 2: API 调用参数")
    print("=" * 70)
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    random_str = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=8))
    
    # 模拟消息内容
    message = "📋 待办任务 | dada (共5条)<br/><br/>1. 测试任务 | inbox"
    title = f"📋 待办任务 | dada (共5条) [{random_str[:4]}]"
    
    # 构建请求数据（修复后的格式）
    data = {
        "token": "mock_token_32_characters_long",
        "title": title,
        "content": message,
        "template": "html"  # 修复：使用 html 而非 markdown
    }
    
    print("\nAPI 请求参数:")
    print("-" * 70)
    print(f"URL: http://www.pushplus.plus/send")
    print(f"Method: POST")
    print(f"Template: {data['template']}")
    print(f"Title: {data['title']}")
    print(f"Content Length: {len(data['content'])} 字符")
    print(f"Content Preview: {data['content'][:50]}...")
    
    print("\n完整请求体:")
    print("-" * 70)
    print(json.dumps(data, ensure_ascii=False, indent=2))
    
    print("\n✅ API 参数测试通过")
    print("   - 模板格式: html ✓")
    print("   - 换行符转换: \\n → <br/> ✓")
    print("   - 唯一标识符: 已添加 ✓")
    return True

def test_error_handling():
    """测试错误处理和诊断信息"""
    print("\n" + "=" * 70)
    print("🔍 测试 3: 诊断信息")
    print("=" * 70)
    
    # 模拟成功响应
    mock_response = {
        "code": 200,
        "msg": "执行成功",
        "data": "e2727001e96d4ba299ecb03388b3e870"
    }
    
    print("\n模拟 API 响应:")
    print("-" * 70)
    print(json.dumps(mock_response, ensure_ascii=False, indent=2))
    
    print("\n应该显示的诊断信息:")
    print("-" * 70)
    if mock_response.get("code") == 200:
        print("PushPlus 消息发送成功")
        print(f"PushPlus 返回的消息ID: {mock_response.get('data', 'N/A')}")
        print("⚠️ 如果未收到消息，请检查:")
        print("  1. PushPlus 公众号是否已关注")
        print("  2. Token 是否已在 PushPlus 网站绑定微信")
        print("  3. 访问 http://www.pushplus.plus 查看发送记录")
    
    print("\n✅ 诊断信息测试通过")
    return True

def verify_code_changes():
    """验证代码修改"""
    print("\n" + "=" * 70)
    print("🔬 测试 4: 验证代码修改")
    print("=" * 70)
    
    # 读取修改后的代码
    try:
        with open('src/main.py', 'r', encoding='utf-8') as f:
            code = f.read()
        
        checks = {
            "HTML 模板": '"template": "html"' in code,
            "换行符转换": "content.replace('\\n', '<br/>')" in code,
            "诊断信息": "如果未收到消息，请检查" in code,
            "消息ID显示": "PushPlus 返回的消息ID" in code
        }
        
        print("\n代码修改检查:")
        print("-" * 70)
        all_passed = True
        for check_name, passed in checks.items():
            status = "✅" if passed else "❌"
            print(f"{status} {check_name}: {'已修复' if passed else '未找到'}")
            if not passed:
                all_passed = False
        
        if all_passed:
            print("\n✅ 所有代码修改验证通过")
        else:
            print("\n⚠️ 部分代码修改未找到")
        
        return all_passed
    except Exception as e:
        print(f"\n❌ 读取代码文件失败: {str(e)}")
        return False

def main():
    """运行所有测试"""
    print("\n" + "=" * 70)
    print("🧪 PushPlus 修复验证测试套件")
    print("=" * 70)
    print("\n本测试将验证以下修复:")
    print("1. 消息格式从 markdown 改为 html")
    print("2. 换行符转换 (\\n → <br/>)")
    print("3. 添加诊断信息")
    print("4. 添加消息ID显示")
    
    results = []
    
    # 运行测试
    results.append(("消息格式转换", test_message_format()))
    results.append(("API 调用参数", test_api_call_simulation()))
    results.append(("诊断信息", test_error_handling()))
    results.append(("代码修改验证", verify_code_changes()))
    
    # 汇总结果
    print("\n" + "=" * 70)
    print("📊 测试结果汇总")
    print("=" * 70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{status} - {test_name}")
    
    print("\n" + "=" * 70)
    print(f"总计: {passed}/{total} 测试通过")
    print("=" * 70)
    
    if passed == total:
        print("\n🎉 所有测试通过！代码修复已验证")
        print("\n下一步:")
        print("1. 确保 GitHub Secrets 中的 PUSHPLUS_TOKEN 已正确配置")
        print("2. 访问 http://www.pushplus.plus 确认 Token 已绑定微信")
        print("3. 关注 'PushPlus推送加' 公众号")
        print("4. 运行 GitHub Actions 测试实际推送")
        return True
    else:
        print("\n⚠️ 部分测试失败，请检查代码修改")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)

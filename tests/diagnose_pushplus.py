#!/usr/bin/env python3
"""
PushPlus 诊断工具
帮助排查为什么 API 返回成功但收不到消息
"""

import requests
import json
from datetime import datetime

def diagnose_pushplus(token):
    """诊断 PushPlus 配置"""
    
    print("\n" + "=" * 70)
    print("🔍 PushPlus 推送诊断工具")
    print("=" * 70)
    
    # 1. 验证 Token 格式
    print("\n【步骤 1】验证 Token 格式")
    print("-" * 70)
    print(f"Token 长度: {len(token)}")
    print(f"Token 前8位: {token[:8]}***")
    
    if len(token) != 32:
        print("⚠️  警告: Token 长度不是标准的 32 位")
        print("   正常的 PushPlus Token 应该是 32 位字符串")
    else:
        print("✅ Token 长度正确")
    
    # 2. 测试 API 连接
    print("\n【步骤 2】测试 API 连接")
    print("-" * 70)
    
    url = "http://www.pushplus.plus/send"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # 发送一个简单的测试消息
    test_data = {
        "token": token,
        "title": f"🔍 诊断测试 {timestamp}",
        "content": f"<h3>PushPlus 诊断测试</h3><p>如果您收到这条消息，说明配置正确！</p><p>时间: {timestamp}</p>",
        "template": "html"
    }
    
    try:
        print(f"发送测试消息到: {url}")
        response = requests.post(url, json=test_data, timeout=15)
        
        print(f"HTTP 状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"API 响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
            
            if result.get("code") == 200:
                print("\n✅ API 调用成功!")
                print(f"消息ID: {result.get('data', 'N/A')}")
                print("\n" + "=" * 70)
                print("📱 请检查微信是否收到测试消息")
                print("=" * 70)
                print("\n如果 API 返回成功但未收到消息，可能的原因：")
                print()
                print("1️⃣  未关注 PushPlus 公众号")
                print("   解决: 微信搜索 'PushPlus推送加' 并关注")
                print()
                print("2️⃣  Token 未在网站绑定微信")
                print("   解决: 访问 http://www.pushplus.plus")
                print("         使用微信扫码登录，确认 Token 已绑定")
                print()
                print("3️⃣  微信屏蔽了公众号消息")
                print("   解决: 打开公众号 -> 设置 -> 开启'接收文章推送'")
                print()
                print("4️⃣  消息被微信过滤")
                print("   解决: 检查微信的'消息免打扰'设置")
                print()
                print("5️⃣  PushPlus 服务延迟")
                print("   解决: 等待 1-2 分钟，或访问网站查看发送记录")
                print()
                print("=" * 70)
                print("🔗 重要链接:")
                print("   - PushPlus 官网: http://www.pushplus.plus")
                print("   - 发送记录: http://www.pushplus.plus/push")
                print("   - 使用文档: http://www.pushplus.plus/doc/")
                print("=" * 70)
                
                return True
            else:
                print(f"\n❌ API 返回错误: {result.get('msg', '未知错误')}")
                print("\n可能的原因:")
                print("- Token 无效或已过期")
                print("- Token 未绑定微信")
                print("- 超出发送频率限制")
                return False
        else:
            print(f"\n❌ HTTP 请求失败")
            print(f"响应内容: {response.text[:200]}")
            return False
            
    except requests.exceptions.Timeout:
        print("\n❌ 请求超时")
        print("可能的原因:")
        print("- 网络连接问题")
        print("- PushPlus 服务器响应慢")
        return False
    except Exception as e:
        print(f"\n❌ 发生错误: {str(e)}")
        return False

def main():
    print("\n" + "=" * 70)
    print("欢迎使用 PushPlus 诊断工具")
    print("=" * 70)
    print("\n此工具将帮助您诊断为什么 API 返回成功但收不到消息")
    print()
    
    # 从用户输入获取 Token
    token = input("请输入您的 PushPlus Token (32位字符串): ").strip()
    
    if not token:
        print("\n❌ 错误: Token 不能为空")
        return
    
    diagnose_pushplus(token)
    
    print("\n" + "=" * 70)
    print("诊断完成!")
    print("=" * 70)
    print()

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
快速测试 PushPlus 配置
使用环境变量中的 Token
"""

import requests
import json
import os
from datetime import datetime

def test_pushplus():
    """测试 PushPlus 推送功能"""
    
    # 从环境变量获取 Token
    token = os.environ.get('PUSHPLUS_TOKEN', '')
    
    print("\n" + "=" * 70)
    print("🔍 PushPlus 快速测试")
    print("=" * 70)
    
    if not token:
        print("\n❌ 错误: 环境变量 PUSHPLUS_TOKEN 未设置")
        print("\n请先设置环境变量:")
        print("export PUSHPLUS_TOKEN='your_token_here'")
        return False
    
    print(f"\n✅ Token 已设置")
    print(f"   长度: {len(token)}")
    print(f"   前8位: {token[:8]}***")
    
    if len(token) != 32:
        print(f"\n⚠️  警告: Token 长度不是标准的 32 位（当前: {len(token)}）")
    
    # 发送测试消息
    print("\n" + "-" * 70)
    print("📤 发送测试消息...")
    print("-" * 70)
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    url = "http://www.pushplus.plus/send"
    
    # 测试 HTML 格式
    html_content = f"""
<h2>🧪 PushPlus 测试消息</h2>
<p><strong>如果您收到这条消息，说明配置正确！</strong></p>
<p>测试时间: {timestamp}</p>
<hr/>
<p>✅ Token 验证成功</p>
<p>✅ API 连接正常</p>
<p>✅ 消息格式正确</p>
"""
    
    data = {
        "token": token,
        "title": f"🔍 配置测试 {timestamp}",
        "content": html_content,
        "template": "html"
    }
    
    try:
        print(f"请求 URL: {url}")
        print(f"消息标题: {data['title']}")
        print(f"内容长度: {len(html_content)} 字符")
        print("\n发送中...")
        
        response = requests.post(url, json=data, timeout=15)
        
        print(f"\nHTTP 状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"API 响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
            
            if result.get("code") == 200:
                print("\n" + "=" * 70)
                print("✅ 测试成功！API 调用成功")
                print("=" * 70)
                print(f"\n消息ID: {result.get('data', 'N/A')}")
                print("\n📱 请检查微信是否收到测试消息")
                print("\n如果 API 返回成功但未收到消息，请检查:")
                print("  1. 是否已关注 'PushPlus推送加' 公众号")
                print("  2. Token 是否已在 http://www.pushplus.plus 网站绑定微信")
                print("  3. 微信公众号设置中是否开启了'接收文章推送'")
                print("  4. 访问 http://www.pushplus.plus/push 查看发送记录")
                print("\n" + "=" * 70)
                return True
            else:
                print("\n" + "=" * 70)
                print(f"❌ API 返回错误")
                print("=" * 70)
                print(f"错误信息: {result.get('msg', '未知错误')}")
                print(f"错误代码: {result.get('code', 'N/A')}")
                print("\n可能的原因:")
                print("  - Token 无效或已过期")
                print("  - Token 未在网站绑定微信")
                print("  - 超出发送频率限制（免费版每天200条）")
                return False
        else:
            print(f"\n❌ HTTP 请求失败，状态码: {response.status_code}")
            print(f"响应内容: {response.text[:200]}")
            return False
            
    except requests.exceptions.Timeout:
        print("\n❌ 请求超时")
        print("可能的原因: 网络连接问题或 PushPlus 服务器响应慢")
        return False
    except Exception as e:
        print(f"\n❌ 发生错误: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_pushplus()
    exit(0 if success else 1)

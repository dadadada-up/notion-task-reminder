#!/usr/bin/env python3
"""
测试消息推送功能
"""
import requests
import json

def test_notification():
    """测试发送通知"""
    url = "http://localhost:5000/api/notify"
    
    # 测试数据
    data = {
        "type": "daily_todo",
        "channels": ["pushplus", "email"]
    }
    
    print("🚀 发送测试通知...")
    print(f"📍 URL: {url}")
    print(f"📦 数据: {json.dumps(data, indent=2, ensure_ascii=False)}")
    print()
    
    try:
        response = requests.post(url, json=data, timeout=30)
        
        print(f"📊 状态码: {response.status_code}")
        print(f"📄 响应内容:")
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("\n✅ 通知发送成功！")
                
                # 显示详细结果
                data = result.get('data', {})
                if 'pushplus' in data:
                    pushplus_result = data['pushplus']
                    if pushplus_result.get('success'):
                        print("  ✅ PushPlus 推送成功")
                    else:
                        print(f"  ❌ PushPlus 推送失败: {pushplus_result.get('error')}")
                
                if 'email' in data:
                    email_result = data['email']
                    if email_result.get('success'):
                        print("  ✅ 邮件发送成功")
                    else:
                        print(f"  ❌ 邮件发送失败: {email_result.get('error')}")
            else:
                print(f"\n❌ 通知发送失败: {result.get('error')}")
        else:
            print(f"\n❌ 请求失败: HTTP {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ 连接失败：请确保服务器正在运行")
    except Exception as e:
        print(f"❌ 发生错误: {str(e)}")

if __name__ == "__main__":
    test_notification()

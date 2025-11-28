#!/usr/bin/env python3
"""
PushPlus 推送测试脚本
用于验证 PushPlus Token 是否正确配置
"""

import requests
import os
from datetime import datetime

def test_pushplus():
    """测试 PushPlus 推送功能"""
    
    # 从环境变量获取 Token
    token = os.environ.get('PUSHPLUS_TOKEN', '')
    
    print("=" * 60)
    print("PushPlus 推送测试")
    print("=" * 60)
    print(f"Token 长度: {len(token)}")
    print(f"Token 前8位: {token[:8] if len(token) >= 8 else 'N/A'}***")
    print()
    
    if not token or len(token) < 8:
        print("❌ 错误: PUSHPLUS_TOKEN 未设置或无效")
        print("请设置环境变量: export PUSHPLUS_TOKEN='your_token'")
        return False
    
    # 准备测试消息
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    title = f"🧪 PushPlus 测试消息 {timestamp}"
    
    # 测试三种模板格式
    templates = {
        "html": f"<h2>测试消息</h2><p>这是一条 HTML 格式的测试消息</p><p>时间: {timestamp}</p>",
        "txt": f"测试消息\n\n这是一条纯文本格式的测试消息\n\n时间: {timestamp}",
        "markdown": f"## 测试消息\n\n这是一条 Markdown 格式的测试消息\n\n**时间**: {timestamp}"
    }
    
    url = "http://www.pushplus.plus/send"
    
    for template_type, content in templates.items():
        print(f"\n{'=' * 60}")
        print(f"测试模板类型: {template_type}")
        print(f"{'=' * 60}")
        
        data = {
            "token": token,
            "title": f"{title} [{template_type}]",
            "content": content,
            "template": template_type
        }
        
        try:
            print(f"发送请求到: {url}")
            print(f"内容长度: {len(content)} 字符")
            
            response = requests.post(url, json=data, timeout=15)
            
            print(f"响应状态码: {response.status_code}")
            print(f"响应内容: {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get("code") == 200:
                    print(f"✅ {template_type} 格式发送成功!")
                    print(f"消息ID: {result.get('data', 'N/A')}")
                else:
                    print(f"❌ {template_type} 格式发送失败: {result.get('msg', '未知错误')}")
            else:
                print(f"❌ HTTP 请求失败，状态码: {response.status_code}")
                
        except Exception as e:
            print(f"❌ 发送 {template_type} 格式时出错: {str(e)}")
    
    print("\n" + "=" * 60)
    print("测试完成!")
    print("=" * 60)
    print("\n如果 API 返回成功但未收到消息，请检查:")
    print("1. 是否已关注 PushPlus 公众号")
    print("2. Token 是否已在 http://www.pushplus.plus 网站绑定微信")
    print("3. 访问 http://www.pushplus.plus 查看发送记录")
    print("4. 检查微信是否屏蔽了公众号消息")
    print()
    
    return True

if __name__ == "__main__":
    test_pushplus()

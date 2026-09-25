"""
Push Service - 优化的 PushPlus 推送服务
支持增强的 HTML 样式
"""

import requests
import os
import sys
from datetime import datetime
from typing import List, Dict
import random
from pathlib import Path

# 添加 src 目录到路径以导入消息格式化模块
src_path = Path(__file__).parent.parent.parent / 'src'
sys.path.insert(0, str(src_path))

from message_formatter import generate_html_message

class PushService:
    def __init__(self):
        self.token = os.environ.get('PUSHPLUS_TOKEN', '')
        self.api_url = "http://www.pushplus.plus/send"
    
    def send_notification(self, tasks: List[Dict], is_done: bool = False, 
                         custom_title: str = '', custom_message: str = '') -> Dict:
        """
        发送推送通知
        
        Args:
            tasks: 任务列表
            is_done: 是否为已完成任务
            custom_title: 自定义标题
            custom_message: 自定义消息（HTML格式）
        """
        try:
            if not self.token or len(self.token.strip()) < 8:
                return {
                    'success': False,
                    'error': 'PushPlus token not configured'
                }
            
            # 生成消息（使用统一的格式化模块）
            default_title, html_content = generate_html_message(tasks, is_done)
            
            # 使用自定义标题或默认标题
            title = custom_title if custom_title else default_title
            
            # 如果有自定义消息，添加到内容开头
            if custom_message:
                html_content = f"{custom_message}\n\n{html_content}"
            
            # 添加唯一标识避免重复
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            random_str = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=8))
            unique_suffix = f"\n\n<!-- {timestamp}-{random_str} -->"
            
            data = {
                "token": self.token,
                "title": f"{title} [{random_str[:4]}]",
                "content": html_content + unique_suffix,
                "template": "html"
            }
            
            print(f"[PushService] 发送请求到 PushPlus...")
            print(f"[PushService] 标题: {data['title']}")
            print(f"[PushService] 内容长度: {len(data['content'])} 字符")
            
            response = requests.post(self.api_url, json=data, timeout=15)
            
            print(f"[PushService] HTTP 状态码: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"[PushService] 响应: {result}")
                
                if result.get("code") == 200:
                    print(f"[PushService] ✅ 发送成功")
                    return {
                        'success': True,
                        'message': 'PushPlus notification sent successfully',
                        'data': result.get('data')
                    }
                else:
                    error_msg = result.get('msg', 'Unknown error')
                    print(f"[PushService] ❌ PushPlus API 返回错误: {error_msg}")
                    return {
                        'success': False,
                        'error': error_msg
                    }
            else:
                error_msg = f'HTTP {response.status_code}: {response.text}'
                print(f"[PushService] ❌ HTTP 错误: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

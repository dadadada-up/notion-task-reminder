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
    
    def send_notification(self, tasks: List[Dict], is_done: bool = False) -> Dict:
        """发送推送通知"""
        try:
            if not self.token or len(self.token.strip()) < 8:
                return {
                    'success': False,
                    'error': 'PushPlus token not configured'
                }
            
            # 生成消息（使用统一的格式化模块）
            title, html_content = generate_html_message(tasks, is_done)
            
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
            
            response = requests.post(self.api_url, json=data, timeout=15)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("code") == 200:
                    return {
                        'success': True,
                        'message': 'PushPlus notification sent successfully',
                        'data': result.get('data')
                    }
                else:
                    return {
                        'success': False,
                        'error': result.get('msg', 'Unknown error')
                    }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

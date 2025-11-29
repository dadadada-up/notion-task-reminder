#!/usr/bin/env python3
"""
PushService 单元测试
"""
import unittest
from unittest.mock import Mock, patch
import sys
from pathlib import Path

backend_path = Path(__file__).parent.parent.parent / 'backend'
sys.path.insert(0, str(backend_path))

from services.push_service import PushService

class TestPushService(unittest.TestCase):
    """PushService 测试类"""
    
    def setUp(self):
        """测试前准备"""
        self.service = PushService()
    
    @patch('requests.post')
    def test_send_pushplus(self, mock_post):
        """测试 PushPlus 推送"""
        mock_post.return_value.json.return_value = {
            'code': 200,
            'msg': '成功',
            'data': 'test_id'
        }
        mock_post.return_value.status_code = 200
        
        result = self.service.send_pushplus([], 'daily_todo')
        self.assertIsNotNone(result)

if __name__ == '__main__':
    unittest.main()

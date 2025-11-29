#!/usr/bin/env python3
"""
NotionService 单元测试
"""
import unittest
from unittest.mock import Mock, patch
import sys
from pathlib import Path

backend_path = Path(__file__).parent.parent.parent / 'backend'
sys.path.insert(0, str(backend_path))

from services.notion_service import NotionService

class TestNotionService(unittest.TestCase):
    """NotionService 测试类"""
    
    def setUp(self):
        """测试前准备"""
        self.service = NotionService()
    
    @patch('requests.post')
    def test_get_tasks(self, mock_post):
        """测试获取任务"""
        mock_post.return_value.json.return_value = {
            'results': [],
            'has_more': False
        }
        mock_post.return_value.status_code = 200
        
        tasks = self.service.get_tasks()
        self.assertIsNotNone(tasks)
        self.assertIsInstance(tasks, list)
    
    def test_format_task_name(self):
        """测试任务名称格式化"""
        task = {
            'properties': {
                '任务名称': {
                    'title': [
                        {'plain_text': '测试任务'}
                    ]
                }
            }
        }
        # 这里添加实际的测试逻辑
        self.assertTrue(True)

if __name__ == '__main__':
    unittest.main()

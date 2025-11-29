#!/usr/bin/env python3
"""
配置管理单元测试
"""

import sys
import os
from pathlib import Path
import unittest

# 添加 backend 目录到路径
backend_path = Path(__file__).parent.parent.parent / 'backend'
sys.path.insert(0, str(backend_path))

from core.config import (
    NotionConfig, PushConfig, EmailConfig, 
    GitHubConfig, WebConfig, RuntimeConfig, Settings
)


class TestNotionConfig(unittest.TestCase):
    """Notion 配置测试"""
    
    def test_valid_config(self):
        """测试有效配置"""
        config = NotionConfig(
            token="ntn_1234567890abcdef",
            database_id="db_1234567890abcdef"
        )
        self.assertEqual(config.token, "ntn_1234567890abcdef")
        self.assertEqual(config.database_id, "db_1234567890abcdef")
    
    def test_validate_token(self):
        """测试 token 验证"""
        with self.assertRaises(ValueError):
            config = NotionConfig(token="short", database_id="db_123")
            config.validate()
    
    def test_validate_database_id(self):
        """测试 database_id 验证"""
        with self.assertRaises(ValueError):
            config = NotionConfig(token="ntn_1234567890", database_id="short")
            config.validate()


class TestPushConfig(unittest.TestCase):
    """推送配置测试"""
    
    def test_has_pushplus(self):
        """测试 PushPlus 配置检查"""
        config = PushConfig(pushplus_token="token123456789")
        self.assertTrue(config.has_pushplus())
        
        config_empty = PushConfig(pushplus_token="")
        self.assertFalse(config_empty.has_pushplus())
    
    def test_has_wxpusher(self):
        """测试 WxPusher 配置检查"""
        config = PushConfig(
            wxpusher_token="token123",
            wxpusher_uid="uid123"
        )
        self.assertTrue(config.has_wxpusher())
        
        config_incomplete = PushConfig(wxpusher_token="token123")
        self.assertFalse(config_incomplete.has_wxpusher())


class TestEmailConfig(unittest.TestCase):
    """邮件配置测试"""
    
    def test_is_configured(self):
        """测试邮件配置检查"""
        config = EmailConfig(
            enabled=True,
            smtp_server="smtp.163.com",
            smtp_port=465,
            sender="test@163.com",
            password="password123",
            receiver="receiver@163.com"
        )
        self.assertTrue(config.is_configured())
    
    def test_disabled_config(self):
        """测试禁用的邮件配置"""
        config = EmailConfig(enabled=False)
        self.assertFalse(config.is_configured())
    
    def test_incomplete_config(self):
        """测试不完整的邮件配置"""
        config = EmailConfig(
            enabled=True,
            smtp_server="smtp.163.com"
            # 缺少其他必需字段
        )
        self.assertFalse(config.is_configured())


class TestGitHubConfig(unittest.TestCase):
    """GitHub 配置测试"""
    
    def test_is_configured(self):
        """测试 GitHub 配置检查"""
        config = GitHubConfig(
            token="ghp_1234567890",
            repository="user/repo"
        )
        self.assertTrue(config.is_configured())
        
        config_incomplete = GitHubConfig(token="ghp_123")
        self.assertFalse(config_incomplete.is_configured())


class TestWebConfig(unittest.TestCase):
    """Web 配置测试"""
    
    def test_default_values(self):
        """测试默认值"""
        config = WebConfig()
        self.assertEqual(config.port, 5000)
        self.assertEqual(config.debug, False)
        self.assertEqual(config.host, "0.0.0.0")
    
    def test_custom_values(self):
        """测试自定义值"""
        config = WebConfig(port=8080, debug=True, host="127.0.0.1")
        self.assertEqual(config.port, 8080)
        self.assertEqual(config.debug, True)
        self.assertEqual(config.host, "127.0.0.1")


class TestRuntimeConfig(unittest.TestCase):
    """运行时配置测试"""
    
    def test_validate_reminder_type(self):
        """测试提醒类型验证"""
        config = RuntimeConfig(reminder_type="daily_todo")
        self.assertTrue(config.validate())
        
        with self.assertRaises(ValueError):
            config_invalid = RuntimeConfig(reminder_type="invalid")
            config_invalid.validate()
    
    def test_validate_send_time(self):
        """测试发送时间验证"""
        config = RuntimeConfig(send_time="09:00")
        self.assertTrue(config.validate())
        
        with self.assertRaises(ValueError):
            config_invalid = RuntimeConfig(send_time="9:00")  # 格式错误
            config_invalid.validate()


class TestSettings(unittest.TestCase):
    """全局配置测试"""
    
    def test_to_dict(self):
        """测试转换为字典"""
        settings = Settings(
            notion=NotionConfig(
                token="ntn_1234567890abcdef",
                database_id="db_1234567890abcdef"
            ),
            push=PushConfig(pushplus_token="token123456789"),
            email=EmailConfig(enabled=False),
            github=GitHubConfig(),
            web=WebConfig(),
            runtime=RuntimeConfig()
        )
        
        config_dict = settings.to_dict(mask_secrets=True)
        
        # 检查结构
        self.assertIn('notion', config_dict)
        self.assertIn('push', config_dict)
        self.assertIn('email', config_dict)
        
        # 检查脱敏
        self.assertIn('***', config_dict['notion']['token'])
    
    def test_is_masked(self):
        """测试脱敏判断"""
        self.assertTrue(Settings._is_masked("abc***def"))
        self.assertTrue(Settings._is_masked("*****"))
        self.assertFalse(Settings._is_masked("normal_token"))


if __name__ == '__main__':
    unittest.main()

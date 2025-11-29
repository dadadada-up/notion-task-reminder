"""
配置管理服务
用于读取和更新 .env 文件配置
"""

import os
import re
from typing import Dict, Optional


class ConfigService:
    def __init__(self):
        self.env_file = '.env'
    
    def get_config(self) -> Dict:
        """
        读取配置（脱敏处理）
        
        Returns:
            Dict: 配置字典
        """
        config = self._read_env_file()
        
        # 脱敏处理
        return {
            'notion': {
                'token': self._mask_token(config.get('NOTION_TOKEN', '')),
                'databaseId': config.get('DATABASE_ID', '')
            },
            'push': {
                'pushplusToken': self._mask_token(config.get('PUSHPLUS_TOKEN', '')),
                'wxpusherToken': self._mask_token(config.get('WXPUSHER_TOKEN', '')),
                'wxpusherUid': config.get('WXPUSHER_UID', '')
            },
            'email': {
                'enabled': config.get('EMAIL_ENABLED', 'false').lower() == 'true',
                'smtpServer': config.get('EMAIL_SMTP_SERVER', ''),
                'smtpPort': int(config.get('EMAIL_SMTP_PORT', '465')),
                'sender': config.get('EMAIL_SENDER', ''),
                'password': self._mask_token(config.get('EMAIL_PASSWORD', '')),
                'receiver': config.get('EMAIL_RECEIVER', '')
            },
            'github': {
                'token': self._mask_token(config.get('GITHUB_TOKEN', '')),
                'repository': config.get('GITHUB_REPOSITORY', '')
            }
        }
    
    def update_config(self, updates: Dict) -> bool:
        """
        更新配置
        
        Args:
            updates: 要更新的配置
            
        Returns:
            bool: 更新是否成功
        """
        try:
            # 读取当前配置
            current_config = self._read_env_file()
            
            # 更新 Notion 配置
            if 'notion' in updates:
                notion = updates['notion']
                if 'token' in notion and not self._is_masked(notion['token']):
                    current_config['NOTION_TOKEN'] = notion['token']
                if 'databaseId' in notion:
                    current_config['DATABASE_ID'] = notion['databaseId']
            
            # 更新推送配置
            if 'push' in updates:
                push = updates['push']
                if 'pushplusToken' in push and not self._is_masked(push['pushplusToken']):
                    current_config['PUSHPLUS_TOKEN'] = push['pushplusToken']
                if 'wxpusherToken' in push and not self._is_masked(push['wxpusherToken']):
                    current_config['WXPUSHER_TOKEN'] = push['wxpusherToken']
                if 'wxpusherUid' in push:
                    current_config['WXPUSHER_UID'] = push['wxpusherUid']
            
            # 更新邮箱配置
            if 'email' in updates:
                email = updates['email']
                if 'enabled' in email:
                    current_config['EMAIL_ENABLED'] = 'true' if email['enabled'] else 'false'
                if 'smtpServer' in email:
                    current_config['EMAIL_SMTP_SERVER'] = email['smtpServer']
                if 'smtpPort' in email:
                    current_config['EMAIL_SMTP_PORT'] = str(email['smtpPort'])
                if 'sender' in email:
                    current_config['EMAIL_SENDER'] = email['sender']
                if 'password' in email and not self._is_masked(email['password']):
                    current_config['EMAIL_PASSWORD'] = email['password']
                if 'receiver' in email:
                    current_config['EMAIL_RECEIVER'] = email['receiver']
            
            # 更新 GitHub 配置
            if 'github' in updates:
                github = updates['github']
                if 'token' in github and not self._is_masked(github['token']):
                    current_config['GITHUB_TOKEN'] = github['token']
                if 'repository' in github:
                    current_config['GITHUB_REPOSITORY'] = github['repository']
            
            # 写入文件
            self._write_env_file(current_config)
            
            # 重新加载环境变量
            self._reload_env()
            
            return True
            
        except Exception as e:
            print(f"更新配置失败: {str(e)}")
            return False
    
    def _read_env_file(self) -> Dict[str, str]:
        """
        读取 .env 文件
        
        Returns:
            Dict: 配置字典
        """
        config = {}
        
        if not os.path.exists(self.env_file):
            return config
        
        with open(self.env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                
                # 跳过注释和空行
                if not line or line.startswith('#'):
                    continue
                
                # 解析键值对
                match = re.match(r'^([A-Z_]+)=(.*)$', line)
                if match:
                    key = match.group(1)
                    value = match.group(2).strip('"').strip("'")
                    config[key] = value
        
        return config
    
    def _write_env_file(self, config: Dict[str, str]):
        """
        写入 .env 文件
        
        Args:
            config: 配置字典
        """
        lines = []
        
        # Notion 配置
        lines.append('# Notion 配置')
        lines.append(f'NOTION_TOKEN="{config.get("NOTION_TOKEN", "")}"')
        lines.append(f'DATABASE_ID="{config.get("DATABASE_ID", "")}"')
        lines.append('')
        
        # 消息推送配置
        lines.append('# 消息推送配置（可选）')
        lines.append(f'PUSHPLUS_TOKEN="{config.get("PUSHPLUS_TOKEN", "")}"')
        lines.append(f'WXPUSHER_TOKEN="{config.get("WXPUSHER_TOKEN", "")}"')
        lines.append(f'WXPUSHER_UID="{config.get("WXPUSHER_UID", "")}"')
        lines.append('')
        
        # 邮箱推送配置
        lines.append('# 邮箱推送配置（可选）')
        lines.append(f'EMAIL_ENABLED="{config.get("EMAIL_ENABLED", "false")}"')
        lines.append(f'EMAIL_SMTP_SERVER="{config.get("EMAIL_SMTP_SERVER", "")}"')
        lines.append(f'EMAIL_SMTP_PORT="{config.get("EMAIL_SMTP_PORT", "465")}"')
        lines.append(f'EMAIL_SENDER="{config.get("EMAIL_SENDER", "")}"')
        lines.append(f'EMAIL_PASSWORD="{config.get("EMAIL_PASSWORD", "")}"')
        lines.append(f'EMAIL_RECEIVER="{config.get("EMAIL_RECEIVER", "")}"')
        lines.append('')
        
        # GitHub 配置
        lines.append('# GitHub 配置（用于更新 workflow）')
        lines.append(f'GITHUB_TOKEN="{config.get("GITHUB_TOKEN", "")}"')
        lines.append(f'GITHUB_REPOSITORY="{config.get("GITHUB_REPOSITORY", "")}"')
        lines.append('')
        
        with open(self.env_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
    
    def _reload_env(self):
        """
        重新加载环境变量
        """
        config = self._read_env_file()
        for key, value in config.items():
            os.environ[key] = value
    
    def _mask_token(self, token: str) -> str:
        """
        脱敏处理 Token
        
        Args:
            token: 原始 token
            
        Returns:
            str: 脱敏后的 token
        """
        if not token or len(token) < 8:
            return '***'
        
        # 显示前3位和后3位
        return f"{token[:3]}{'*' * (len(token) - 6)}{token[-3:]}"
    
    def _is_masked(self, value: str) -> bool:
        """
        判断值是否已被脱敏
        
        Args:
            value: 值
            
        Returns:
            bool: 是否已脱敏
        """
        return '***' in value or '*' * 5 in value

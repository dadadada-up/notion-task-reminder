"""
简化版配置管理模块（不依赖 Pydantic）
适用于 Python 3.13 或无法安装 Pydantic 的环境
"""

import os
from pathlib import Path
from typing import Optional, Dict, Any
from dotenv import load_dotenv


class NotionConfig:
    """Notion 配置"""
    def __init__(self, token: str, database_id: str):
        self.token = token
        self.database_id = database_id
    
    def validate(self) -> bool:
        """验证配置"""
        if not self.token or len(self.token) < 10:
            raise ValueError('Notion token 无效')
        if not self.database_id or len(self.database_id) < 10:
            raise ValueError('Database ID 无效')
        return True


class PushConfig:
    """推送配置"""
    def __init__(self, pushplus_token: Optional[str] = None,
                 wxpusher_token: Optional[str] = None,
                 wxpusher_uid: Optional[str] = None):
        self.pushplus_token = pushplus_token
        self.wxpusher_token = wxpusher_token
        self.wxpusher_uid = wxpusher_uid
    
    def has_pushplus(self) -> bool:
        """是否配置了 PushPlus"""
        return bool(self.pushplus_token and len(self.pushplus_token) > 8)
    
    def has_wxpusher(self) -> bool:
        """是否配置了 WxPusher"""
        return bool(self.wxpusher_token and self.wxpusher_uid)


class EmailConfig:
    """邮件配置"""
    def __init__(self, enabled: bool = False,
                 smtp_server: Optional[str] = None,
                 smtp_port: int = 465,
                 sender: Optional[str] = None,
                 password: Optional[str] = None,
                 receiver: Optional[str] = None):
        self.enabled = enabled
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.sender = sender
        self.password = password
        self.receiver = receiver
    
    def is_configured(self) -> bool:
        """是否已完整配置"""
        if not self.enabled:
            return False
        return all([
            self.smtp_server,
            self.sender,
            self.password,
            self.receiver
        ])


class GitHubConfig:
    """GitHub 配置"""
    def __init__(self, token: Optional[str] = None,
                 repository: Optional[str] = None):
        self.token = token
        self.repository = repository
    
    def is_configured(self) -> bool:
        """是否已配置"""
        return bool(self.token and self.repository)


class WebConfig:
    """Web 服务配置"""
    def __init__(self, port: int = 5000,
                 debug: bool = False,
                 host: str = "0.0.0.0"):
        self.port = port
        self.debug = debug
        self.host = host


class RuntimeConfig:
    """运行时配置"""
    def __init__(self, reminder_type: str = "daily_todo",
                 send_time: str = "08:00",
                 action_type: str = "combined",
                 debug_mode: bool = False,
                 force_send: bool = False):
        self.reminder_type = reminder_type
        self.send_time = send_time
        self.action_type = action_type
        self.debug_mode = debug_mode
        self.force_send = force_send
    
    def validate(self) -> bool:
        """验证配置"""
        allowed_types = ['daily_todo', 'daily_done', 'both']
        if self.reminder_type not in allowed_types:
            raise ValueError(f'reminder_type 必须是 {allowed_types} 之一')
        
        import re
        if not re.match(r'^\d{2}:\d{2}$', self.send_time):
            raise ValueError('send_time 格式必须是 HH:MM')
        
        return True


class Settings:
    """全局配置"""
    def __init__(self, notion: NotionConfig,
                 push: PushConfig,
                 email: EmailConfig,
                 github: GitHubConfig,
                 web: WebConfig,
                 runtime: RuntimeConfig):
        self.notion = notion
        self.push = push
        self.email = email
        self.github = github
        self.web = web
        self.runtime = runtime
    
    @classmethod
    def from_env(cls, env_file: Optional[str] = None) -> 'Settings':
        """从环境变量加载配置"""
        # 加载 .env 文件
        if env_file is None:
            root_dir = Path(__file__).parent.parent.parent
            env_file = root_dir / '.env'
        
        if Path(env_file).exists():
            load_dotenv(env_file)
        
        # 从环境变量构建配置
        settings = cls(
            notion=NotionConfig(
                token=os.getenv('NOTION_TOKEN', ''),
                database_id=os.getenv('DATABASE_ID', '')
            ),
            push=PushConfig(
                pushplus_token=os.getenv('PUSHPLUS_TOKEN'),
                wxpusher_token=os.getenv('WXPUSHER_TOKEN'),
                wxpusher_uid=os.getenv('WXPUSHER_UID')
            ),
            email=EmailConfig(
                enabled=os.getenv('EMAIL_ENABLED', 'false').lower() == 'true',
                smtp_server=os.getenv('EMAIL_SMTP_SERVER'),
                smtp_port=int(os.getenv('EMAIL_SMTP_PORT', '465')),
                sender=os.getenv('EMAIL_SENDER'),
                password=os.getenv('EMAIL_PASSWORD'),
                receiver=os.getenv('EMAIL_RECEIVER')
            ),
            github=GitHubConfig(
                token=os.getenv('GITHUB_TOKEN'),
                repository=os.getenv('GITHUB_REPOSITORY')
            ),
            web=WebConfig(
                port=int(os.getenv('PORT', '5000')),
                debug=os.getenv('FLASK_DEBUG', 'false').lower() == 'true',
                host=os.getenv('HOST', '0.0.0.0')
            ),
            runtime=RuntimeConfig(
                reminder_type=os.getenv('REMINDER_TYPE', 'daily_todo'),
                send_time=os.getenv('SEND_TIME', '08:00'),
                action_type=os.getenv('ACTION_TYPE', 'combined'),
                debug_mode=os.getenv('DEBUG_MODE', 'false').lower() == 'true',
                force_send=os.getenv('FORCE_SEND', 'false').lower() == 'true'
            )
        )
        
        # 验证必需配置
        try:
            settings.notion.validate()
            settings.runtime.validate()
        except ValueError as e:
            print(f"⚠️  配置验证警告: {e}")
        
        return settings
    
    def to_dict(self, mask_secrets: bool = True) -> Dict[str, Any]:
        """转换为字典格式"""
        def mask_token(token: Optional[str]) -> str:
            """脱敏处理"""
            if not token or len(token) < 8:
                return '***'
            return f"{token[:3]}{'*' * (len(token) - 6)}{token[-3:]}"
        
        return {
            'notion': {
                'token': mask_token(self.notion.token) if mask_secrets else self.notion.token,
                'databaseId': self.notion.database_id
            },
            'push': {
                'pushplusToken': mask_token(self.push.pushplus_token) if mask_secrets else self.push.pushplus_token,
                'wxpusherToken': mask_token(self.push.wxpusher_token) if mask_secrets else self.push.wxpusher_token,
                'wxpusherUid': self.push.wxpusher_uid,
                'hasPushplus': self.push.has_pushplus(),
                'hasWxpusher': self.push.has_wxpusher()
            },
            'email': {
                'enabled': self.email.enabled,
                'smtpServer': self.email.smtp_server,
                'smtpPort': self.email.smtp_port,
                'sender': self.email.sender,
                'password': mask_token(self.email.password) if mask_secrets else self.email.password,
                'receiver': self.email.receiver,
                'isConfigured': self.email.is_configured()
            },
            'github': {
                'token': mask_token(self.github.token) if mask_secrets else self.github.token,
                'repository': self.github.repository,
                'isConfigured': self.github.is_configured()
            },
            'web': {
                'port': self.web.port,
                'debug': self.web.debug,
                'host': self.web.host
            },
            'runtime': {
                'reminderType': self.runtime.reminder_type,
                'sendTime': self.runtime.send_time,
                'actionType': self.runtime.action_type,
                'debugMode': self.runtime.debug_mode,
                'forceSend': self.runtime.force_send
            }
        }
    
    def update_from_dict(self, data: Dict[str, Any]) -> None:
        """从字典更新配置"""
        # 更新 Notion 配置
        if 'notion' in data:
            notion = data['notion']
            if 'token' in notion and not self._is_masked(notion['token']):
                self.notion.token = notion['token']
            if 'databaseId' in notion:
                self.notion.database_id = notion['databaseId']
        
        # 更新推送配置
        if 'push' in data:
            push = data['push']
            if 'pushplusToken' in push and not self._is_masked(push.get('pushplusToken', '')):
                self.push.pushplus_token = push['pushplusToken']
            if 'wxpusherToken' in push and not self._is_masked(push.get('wxpusherToken', '')):
                self.push.wxpusher_token = push['wxpusherToken']
            if 'wxpusherUid' in push:
                self.push.wxpusher_uid = push['wxpusherUid']
        
        # 更新邮件配置
        if 'email' in data:
            email = data['email']
            if 'enabled' in email:
                self.email.enabled = email['enabled']
            if 'smtpServer' in email:
                self.email.smtp_server = email['smtpServer']
            if 'smtpPort' in email:
                self.email.smtp_port = email['smtpPort']
            if 'sender' in email:
                self.email.sender = email['sender']
            if 'password' in email and not self._is_masked(email.get('password', '')):
                self.email.password = email['password']
            if 'receiver' in email:
                self.email.receiver = email['receiver']
        
        # 更新 GitHub 配置
        if 'github' in data:
            github = data['github']
            if 'token' in github and not self._is_masked(github.get('token', '')):
                self.github.token = github['token']
            if 'repository' in github:
                self.github.repository = github['repository']
        
        # 更新 Web 配置
        if 'web' in data:
            web = data['web']
            if 'port' in web:
                self.web.port = web['port']
            if 'debug' in web:
                self.web.debug = web['debug']
            if 'host' in web:
                self.web.host = web['host']
        
        # 更新运行时配置
        if 'runtime' in data:
            runtime = data['runtime']
            if 'reminderType' in runtime:
                self.runtime.reminder_type = runtime['reminderType']
            if 'sendTime' in runtime:
                self.runtime.send_time = runtime['sendTime']
            if 'actionType' in runtime:
                self.runtime.action_type = runtime['actionType']
            if 'debugMode' in runtime:
                self.runtime.debug_mode = runtime['debugMode']
            if 'forceSend' in runtime:
                self.runtime.force_send = runtime['forceSend']
    
    def save_to_env(self, env_file: Optional[str] = None) -> None:
        """保存配置到 .env 文件"""
        if env_file is None:
            root_dir = Path(__file__).parent.parent.parent
            env_file = root_dir / '.env'
        
        lines = []
        
        # Notion 配置
        lines.append('# Notion 配置')
        lines.append(f'NOTION_TOKEN="{self.notion.token}"')
        lines.append(f'DATABASE_ID="{self.notion.database_id}"')
        lines.append('')
        
        # 消息推送配置
        lines.append('# 消息推送配置（可选）')
        lines.append(f'PUSHPLUS_TOKEN="{self.push.pushplus_token or ""}"')
        lines.append(f'WXPUSHER_TOKEN="{self.push.wxpusher_token or ""}"')
        lines.append(f'WXPUSHER_UID="{self.push.wxpusher_uid or ""}"')
        lines.append('')
        
        # 邮箱推送配置
        lines.append('# 邮箱推送配置（可选）')
        lines.append(f'EMAIL_ENABLED="{"true" if self.email.enabled else "false"}"')
        lines.append(f'EMAIL_SMTP_SERVER="{self.email.smtp_server or ""}"')
        lines.append(f'EMAIL_SMTP_PORT="{self.email.smtp_port}"')
        lines.append(f'EMAIL_SENDER="{self.email.sender or ""}"')
        lines.append('# 注意：EMAIL_PASSWORD 应填写邮箱授权码，不是邮箱密码')
        lines.append(f'EMAIL_PASSWORD="{self.email.password or ""}"')
        lines.append(f'EMAIL_RECEIVER="{self.email.receiver or ""}"')
        lines.append('')
        
        # Web 服务配置
        lines.append('# Web 服务配置')
        lines.append(f'PORT="{self.web.port}"')
        lines.append(f'FLASK_DEBUG="{"true" if self.web.debug else "false"}"')
        lines.append('')
        
        # GitHub 配置
        lines.append('# GitHub 配置（用于自动更新 workflow）')
        lines.append(f'GITHUB_TOKEN="{self.github.token or ""}"')
        lines.append(f'GITHUB_REPOSITORY="{self.github.repository or ""}"')
        lines.append('')
        
        # 运行配置
        lines.append('# 运行配置')
        lines.append(f'REMINDER_TYPE="{self.runtime.reminder_type}"')
        lines.append(f'SEND_TIME="{self.runtime.send_time}"')
        lines.append(f'ACTION_TYPE="{self.runtime.action_type}"')
        lines.append(f'DEBUG_MODE="{"true" if self.runtime.debug_mode else "false"}"')
        lines.append(f'FORCE_SEND="{"true" if self.runtime.force_send else "false"}"')
        lines.append('')
        
        with open(env_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
    
    @staticmethod
    def _is_masked(value: str) -> bool:
        """判断值是否已被脱敏"""
        return '***' in value or '*' * 5 in value


# 全局配置实例
_settings: Optional[Settings] = None


def get_settings(reload: bool = False) -> Settings:
    """获取全局配置实例（单例模式）"""
    global _settings
    
    if _settings is None or reload:
        _settings = Settings.from_env()
    
    return _settings


def reload_settings() -> Settings:
    """重新加载配置"""
    return get_settings(reload=True)

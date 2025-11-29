"""
配置管理服务
用于读取和更新 .env 文件配置
集成统一配置管理类 (backend.core.config)
"""

import os
import sys
from pathlib import Path
from typing import Dict, Optional

# 添加 backend 目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import get_settings, reload_settings, Settings


class ConfigService:
    """
    配置管理服务
    封装统一配置类，提供 API 友好的接口
    """
    
    def __init__(self):
        self.env_file = '.env'
        self.settings: Settings = get_settings()
    
    def get_config(self) -> Dict:
        """
        读取配置（脱敏处理）
        
        Returns:
            Dict: 配置字典
        """
        # 重新加载以获取最新配置
        self.settings = reload_settings()
        
        # 使用统一配置类的 to_dict 方法，自动脱敏
        return self.settings.to_dict(mask_secrets=True)
    
    def update_config(self, updates: Dict) -> bool:
        """
        更新配置
        
        Args:
            updates: 要更新的配置
            
        Returns:
            bool: 更新是否成功
        """
        try:
            # 重新加载当前配置
            self.settings = reload_settings()
            
            # 使用统一配置类的更新方法
            self.settings.update_from_dict(updates)
            
            # 保存到 .env 文件
            self.settings.save_to_env()
            
            # 重新加载环境变量
            self._reload_env()
            
            # 重新加载配置实例
            self.settings = reload_settings()
            
            return True
            
        except Exception as e:
            print(f"更新配置失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    def _reload_env(self):
        """
        重新加载环境变量到 os.environ
        """
        from dotenv import load_dotenv
        load_dotenv(override=True)

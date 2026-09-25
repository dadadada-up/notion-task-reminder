"""
周总结数据本地存储服务
用于保存用户编辑的周总结数据
"""
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional


class WeeklyDataStorage:
    """周总结数据存储服务"""
    
    def __init__(self, data_dir: str = 'data'):
        """
        初始化存储服务
        
        Args:
            data_dir: 数据存储目录
        """
        self.data_dir = Path(__file__).parent.parent.parent / data_dir
        self.data_dir.mkdir(exist_ok=True)
    
    def save_weekly_data(self, week: str, data: dict) -> bool:
        """
        保存周数据
        
        Args:
            week: 周标识（格式：YYYY-MM-DD 或 'current'/'last'）
            data: 周数据字典
            
        Returns:
            是否保存成功
        """
        try:
            # 添加最后修改时间
            data['last_modified'] = datetime.now().isoformat()
            
            # 生成文件名
            file_path = self._get_file_path(week, data)
            
            # 保存数据
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"✅ 周数据已保存: {file_path}")
            return True
        except Exception as e:
            print(f"❌ 保存周数据失败: {str(e)}")
            return False
    
    def load_weekly_data(self, week: str, week_start: str = None) -> Optional[Dict]:
        """
        加载周数据
        
        Args:
            week: 周标识
            week_start: 周开始日期（用于生成文件名）
            
        Returns:
            周数据字典，如果不存在则返回None
        """
        try:
            # 尝试多种文件名格式
            possible_paths = []
            
            if week_start:
                # 使用week_start生成文件名
                possible_paths.append(self.data_dir / f'weekly_{week_start}.json')
            
            # 使用week参数生成文件名
            if week not in ['current', 'last']:
                possible_paths.append(self.data_dir / f'weekly_{week}.json')
            
            # 尝试加载
            for file_path in possible_paths:
                if file_path.exists():
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    print(f"✅ 加载周数据: {file_path}")
                    return data
            
            print(f"ℹ️  未找到周数据文件: {week}")
            return None
        except Exception as e:
            print(f"❌ 加载周数据失败: {str(e)}")
            return None
    
    def _get_file_path(self, week: str, data: dict) -> Path:
        """
        生成文件路径
        
        Args:
            week: 周标识
            data: 周数据（包含week_start）
            
        Returns:
            文件路径
        """
        # 优先使用data中的week_start
        if 'week_start' in data:
            week_start = data['week_start']
        elif week not in ['current', 'last']:
            week_start = week
        else:
            # 使用当前日期
            week_start = datetime.now().strftime('%Y-%m-%d')
        
        return self.data_dir / f'weekly_{week_start}.json'
    
    def list_all_weeks(self) -> list:
        """
        列出所有已保存的周数据
        
        Returns:
            周数据列表
        """
        try:
            weeks = []
            for file_path in self.data_dir.glob('weekly_*.json'):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    weeks.append({
                        'week_start': data.get('week_start'),
                        'week_end': data.get('week_end'),
                        'year': data.get('year'),
                        'week_number': data.get('week_number'),
                        'last_modified': data.get('last_modified'),
                        'file_path': str(file_path)
                    })
                except:
                    continue
            
            # 按week_start倒序排序
            weeks.sort(key=lambda x: x['week_start'], reverse=True)
            return weeks
        except Exception as e:
            print(f"❌ 列出周数据失败: {str(e)}")
            return []
    
    def delete_weekly_data(self, week: str, week_start: str = None) -> bool:
        """
        删除周数据
        
        Args:
            week: 周标识
            week_start: 周开始日期
            
        Returns:
            是否删除成功
        """
        try:
            # 尝试多种文件名格式
            possible_paths = []
            
            if week_start:
                possible_paths.append(self.data_dir / f'weekly_{week_start}.json')
            
            if week not in ['current', 'last']:
                possible_paths.append(self.data_dir / f'weekly_{week}.json')
            
            # 尝试删除
            for file_path in possible_paths:
                if file_path.exists():
                    file_path.unlink()
                    print(f"✅ 已删除周数据: {file_path}")
                    return True
            
            print(f"ℹ️  未找到要删除的周数据: {week}")
            return False
        except Exception as e:
            print(f"❌ 删除周数据失败: {str(e)}")
            return False

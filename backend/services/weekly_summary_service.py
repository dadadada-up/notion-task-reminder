"""
Weekly Summary Service - 每周生活总结服务
提供智能的周总结分析，包括主题提取、内容摘要、引导性思考
"""

from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import pytz
from collections import defaultdict
import re


class ThemeExtractor:
    """本周主题提取器"""
    
    def extract_theme(self, tasks: List[Dict], by_type: Dict) -> Dict:
        """
        提取本周主题
        
        Args:
            tasks: 本周完成的任务列表
            by_type: 按类型分组的统计
            
        Returns:
            {
                'title': '主题标题',
                'description': '主题描述'
            }
        """
        if not tasks or not by_type:
            return {
                'title': '平凡的一周',
                'description': '本周没有完成任务记录。'
            }
        
        # 1. 找出主要任务类型
        main_type = max(by_type.items(), key=lambda x: x[1]['count'])[0]
        main_count = by_type[main_type]['count']
        
        # 2. 提取关键词
        keywords = self._extract_keywords(tasks)
        
        # 3. 生成主题标题
        title = self._generate_title(main_type, keywords)
        
        # 4. 生成主题描述
        description = self._generate_description(main_type, main_count, keywords, by_type)
        
        return {
            'title': title,
            'description': description
        }
    
    def _extract_keywords(self, tasks: List[Dict]) -> List[str]:
        """从任务名称和备注中提取关键词"""
        keywords = []
        
        for task in tasks[:5]:  # 只取前5个任务
            name = task.get('name', '')
            if len(name) < 15:  # 短任务名作为关键词
                keywords.append(name)
        
        return keywords[:3]  # 返回前3个
    
    def _generate_title(self, main_type: str, keywords: List[str]) -> str:
        """生成主题标题"""
        title_templates = {
            '家庭生活': ['安定生活，稳固基础', '家的温暖，生活的根基', '经营家庭，享受生活'],
            '工作学习': ['专注成长，稳步前进', '学习精进，不断突破', '工作充实，收获满满'],
            '理财投资': ['理性投资，稳健增长', '财富规划，未来可期', '投资自己，投资未来'],
            '个人成长': ['自我提升，持续进化', '学习成长，遇见更好的自己', '精进不止，成长不息'],
            '健康运动': ['健康生活，活力满满', '运动健身，强健体魄', '关爱自己，健康第一']
        }
        
        templates = title_templates.get(main_type, ['充实的一周'])
        return templates[0]
    
    def _generate_description(self, main_type: str, main_count: int, 
                            keywords: List[str], by_type: Dict) -> str:
        """生成主题描述"""
        desc = f'这一周，你的生活重心主要围绕"{main_type}"展开。'
        
        # 添加具体内容
        if keywords:
            desc += f'完成了{", ".join(keywords)}等重要事项，'
        else:
            desc += f'完成了{main_count}件相关事务，'
        
        # 添加意义解读
        meaning_map = {
            '家庭生活': '为未来的稳定生活打下了基础。',
            '工作学习': '在专业能力上有了新的提升。',
            '理财投资': '在财富管理上更加成熟。',
            '个人成长': '在自我提升的道路上又前进了一步。',
            '健康运动': '在身体健康上投入了更多关注。'
        }
        desc += meaning_map.get(main_type, '展现了积极的生活态度。')
        
        # 添加平衡性评价
        if len(by_type) >= 3:
            desc += '同时，你也在其他领域保持了投入，展现出了较好的生活平衡能力。'
        
        return desc


class ContentSummarizer:
    """内容摘要生成器"""
    
    def summarize_type(self, task_type: str, tasks: List[Dict]) -> Dict:
        """
        为某个类型生成摘要
        
        Args:
            task_type: 任务类型
            tasks: 该类型的所有任务
            
        Returns:
            {
                'key_items': ['关键事项1', '关键事项2'],
                'summary': '叙事性摘要'
            }
        """
        # 1. 提取重点事项（从任务名称）
        key_items = [task['name'] for task in tasks[:3]]
        
        # 2. 收集备注
        notes = [t.get('notes', '') for t in tasks if t.get('notes')]
        
        # 3. 生成摘要
        summary = self._generate_summary(task_type, key_items, notes)
        
        return {
            'key_items': key_items,
            'summary': summary
        }
    
    def _generate_summary(self, task_type: str, key_items: List[str], 
                         notes: List[str]) -> str:
        """生成叙事性摘要"""
        if task_type == '家庭生活':
            return self._summarize_family(key_items, notes)
        elif task_type == '工作学习':
            return self._summarize_work(key_items, notes)
        elif task_type == '理财投资':
            return self._summarize_finance(key_items, notes)
        elif task_type == '个人成长':
            return self._summarize_growth(key_items, notes)
        elif task_type == '健康运动':
            return self._summarize_health(key_items, notes)
        else:
            return f'完成了{", ".join(key_items[:2])}等事项。'
    
    def _summarize_family(self, key_items: List[str], notes: List[str]) -> str:
        """家庭生活摘要"""
        summary = "你完成了多项家庭事务，"
        
        # 分析备注内容
        notes_text = ' '.join(notes)
        
        if '续约' in notes_text or '租' in notes_text:
            summary += "包括处理了房屋相关的重要事项，"
        
        if '安装' in notes_text or '维修' in notes_text:
            summary += "完成了家庭设施的建设和维护，"
        
        if '聚餐' in notes_text or '家人' in notes_text or '周末' in notes_text:
            summary += "还安排了家庭活动，增进了家人感情。"
        else:
            summary += "为家庭生活的稳定打下了基础。"
        
        return summary
    
    def _summarize_work(self, key_items: List[str], notes: List[str]) -> str:
        """工作学习摘要"""
        summary = "工作上保持了稳定的产出，"
        
        notes_text = ' '.join(notes)
        
        if '文档' in notes_text or '设计' in notes_text:
            summary += "完成了重要的文档和设计工作，"
        
        if 'bug' in notes_text.lower() or '修复' in notes_text:
            summary += "修复了几个关键问题，"
        
        if '学习' in notes_text or '技术' in notes_text:
            summary += "同时还抽时间学习了新技术。"
        else:
            summary += "展现了良好的专业能力。"
        
        return summary
    
    def _summarize_finance(self, key_items: List[str], notes: List[str]) -> str:
        """理财投资摘要"""
        summary = "在财富管理方面，"
        
        notes_text = ' '.join(notes)
        
        if '投资' in notes_text or '股票' in notes_text or '基金' in notes_text:
            summary += "关注了市场动态，对投资组合进行了调整。"
        elif '规划' in notes_text or '计划' in notes_text:
            summary += "制定了理财规划，为未来做好准备。"
        else:
            summary += "保持了对财务状况的关注。"
        
        return summary
    
    def _summarize_growth(self, key_items: List[str], notes: List[str]) -> str:
        """个人成长摘要"""
        summary = "在个人提升方面，"
        
        notes_text = ' '.join(notes)
        
        if '阅读' in notes_text or '书' in notes_text:
            summary += "坚持了阅读习惯，"
        
        if '学习' in notes_text or '课程' in notes_text:
            summary += "学习了新的知识和技能，"
        
        summary += "在自我成长的道路上持续前进。"
        
        return summary
    
    def _summarize_health(self, key_items: List[str], notes: List[str]) -> str:
        """健康运动摘要"""
        summary = "在健康管理方面，"
        
        notes_text = ' '.join(notes)
        
        if '运动' in notes_text or '健身' in notes_text:
            summary += "坚持了运动锻炼，"
        
        if '饮食' in notes_text or '睡眠' in notes_text:
            summary += "注意了生活习惯的调整，"
        
        summary += "为身体健康投入了关注。"
        
        return summary


class ReflectionGenerator:
    """引导性思考生成器"""
    
    def generate_reflections(self, tasks: List[Dict], by_type: Dict, 
                            by_priority: Dict) -> Dict:
        """
        生成引导性思考
        
        Args:
            tasks: 任务列表
            by_type: 按类型统计
            by_priority: 按优先级统计
            
        Returns:
            {
                'suggestions': ['建议1', '建议2'],
                'concerns': ['关注点1', '关注点2']
            }
        """
        reflections = {
            'suggestions': [],
            'concerns': []
        }
        
        if not tasks:
            return reflections
        
        total = sum(data['count'] for data in by_type.values())
        
        # 1. 分析任务分布，找出占比过低的类型
        for task_type, data in by_type.items():
            percentage = data['count'] / total * 100
            if percentage < 10:
                reflections['concerns'].append(
                    f'{task_type}类任务占比较少({percentage:.0f}%)，可能需要更多投入'
                )
        
        # 2. 检查缺失的重要类型
        all_types = ['家庭生活', '工作学习', '理财投资', '个人成长', '健康运动']
        missing_types = [t for t in all_types if t not in by_type]
        
        for missing in missing_types[:2]:  # 只提示前2个
            reflections['concerns'].append(
                f'{missing}类任务本周为0，下周可以安排一些相关计划'
            )
        
        # 3. 基于主要类型给建议
        if by_type:
            main_type = max(by_type.items(), key=lambda x: x[1]['count'])[0]
            
            suggestions_map = {
                '家庭生活': '家庭事务已经稳定，是否可以在个人成长上投入更多时间？',
                '工作学习': '工作投入较多，记得平衡生活，安排一些放松活动',
                '理财投资': '理财规划不错，也要关注其他生活领域的平衡',
                '个人成长': '学习成长很好，也要注意身体健康和家庭生活',
                '健康运动': '健康管理很棒，继续保持运动习惯'
            }
            
            if main_type in suggestions_map:
                reflections['suggestions'].append(suggestions_map[main_type])
        
        # 4. 基于优先级给建议
        p0_count = by_priority.get('P0 重要紧急', 0)
        if p0_count > 5:
            reflections['suggestions'].append(
                'P0任务较多，考虑提前规划，减少紧急情况的发生'
            )
        elif p0_count == 0:
            reflections['suggestions'].append(
                '本周没有紧急任务，说明时间管理不错，继续保持'
            )
        
        # 5. 通用建议
        if len(by_type) >= 4:
            reflections['suggestions'].append(
                '生活各方面都有兼顾，平衡感很好，继续保持'
            )
        
        return reflections


class WeeklySummaryService:
    """每周生活总结服务"""
    
    def __init__(self, notion_service):
        self.notion_service = notion_service
        self.beijing_tz = pytz.timezone('Asia/Shanghai')
        self.theme_extractor = ThemeExtractor()
        self.content_summarizer = ContentSummarizer()
        self.reflection_generator = ReflectionGenerator()
    
    def get_weekly_summary(self, week: str = 'current') -> Dict:
        """
        获取每周生活总结
        
        Args:
            week: 'current', 'last', 或具体日期 'YYYY-MM-DD'
            
        Returns:
            完整的周总结数据
        """
        try:
            # 1. 确定周范围
            week_start, week_end = self._get_week_range(week)
            
            # 2. 获取所有任务
            all_tasks = self.notion_service.get_tasks()
            
            # 3. 过滤本周完成的任务
            completed_tasks = self._filter_completed_tasks(all_tasks, week_start, week_end)
            
            if not completed_tasks:
                return self._empty_summary(week_start, week_end)
            
            # 4. 按类型分组并生成摘要
            by_type = self._group_and_analyze_by_type(completed_tasks)
            
            # 5. 统计优先级
            by_priority = self._count_by_priority(completed_tasks)
            
            # 6. 提取本周主题
            theme = self.theme_extractor.extract_theme(completed_tasks, by_type)
            
            # 7. 生成值得记录的时刻
            highlights = self._generate_highlights(completed_tasks, by_type, by_priority, theme)
            
            # 8. 生成引导性思考
            reflections = self.reflection_generator.generate_reflections(
                completed_tasks, by_type, by_priority
            )
            
            return {
                'week_start': week_start.strftime('%Y-%m-%d'),
                'week_end': week_end.strftime('%Y-%m-%d'),
                'week_number': week_start.isocalendar()[1],
                'year': week_start.year,
                'theme': theme,
                'completed': {
                    'total': len(completed_tasks),
                    'by_type': by_type,
                    'by_priority': by_priority,
                    'tasks': completed_tasks
                },
                'highlights': highlights,
                'reflections': reflections
            }
            
        except Exception as e:
            print(f"Error getting weekly summary: {str(e)}")
            raise
    
    def _get_week_range(self, week: str) -> Tuple[datetime, datetime]:
        """获取周范围（周一到周日）"""
        if week == 'current':
            now = datetime.now(self.beijing_tz)
            monday = now - timedelta(days=now.weekday())
        elif week == 'last':
            now = datetime.now(self.beijing_tz)
            monday = now - timedelta(days=now.weekday() + 7)
        else:
            # 解析具体日期
            try:
                date = datetime.strptime(week, '%Y-%m-%d')
                date = self.beijing_tz.localize(date)
                monday = date - timedelta(days=date.weekday())
            except:
                # 如果解析失败，默认为本周
                now = datetime.now(self.beijing_tz)
                monday = now - timedelta(days=now.weekday())
        
        monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)
        sunday = monday + timedelta(days=6, hours=23, minutes=59, seconds=59)
        
        return monday, sunday
    
    def _filter_completed_tasks(self, tasks: List[Dict], 
                                week_start: datetime, week_end: datetime) -> List[Dict]:
        """过滤本周完成的任务"""
        result = []
        for task in tasks:
            if task.get('status') == '已完成' and task.get('completed_time'):
                try:
                    completed_time = datetime.fromisoformat(
                        task['completed_time'].replace('Z', '+00:00')
                    )
                    completed_time = completed_time.astimezone(self.beijing_tz)
                    if week_start <= completed_time <= week_end:
                        result.append(task)
                except:
                    pass
        return result
    
    def _group_and_analyze_by_type(self, tasks: List[Dict]) -> Dict:
        """按类型分组并生成摘要"""
        grouped = defaultdict(list)
        
        for task in tasks:
            task_type = task.get('task_type', '未分类')
            grouped[task_type].append(task)
        
        result = {}
        total = len(tasks)
        
        for task_type, type_tasks in grouped.items():
            # 生成摘要
            summary_data = self.content_summarizer.summarize_type(task_type, type_tasks)
            
            result[task_type] = {
                'count': len(type_tasks),
                'percentage': round(len(type_tasks) / total * 100, 1),
                'key_items': summary_data['key_items'],
                'summary': summary_data['summary'],
                'tasks': type_tasks
            }
        
        return result
    
    def _count_by_priority(self, tasks: List[Dict]) -> Dict:
        """统计优先级分布"""
        priority_count = defaultdict(int)
        for task in tasks:
            priority = task.get('priority', 'P3 不重要不紧急')
            priority_count[priority] += 1
        return dict(priority_count)
    
    def _generate_highlights(self, tasks: List[Dict], by_type: Dict, 
                           by_priority: Dict, theme: Dict) -> List[Dict]:
        """生成值得记录的时刻"""
        highlights = []
        
        if not tasks:
            return highlights
        
        # 1. 基于主题生成亮点
        main_type = max(by_type.items(), key=lambda x: x[1]['count'])[0]
        main_count = by_type[main_type]['count']
        
        highlight_map = {
            '家庭生活': {
                'title': '生活基础更稳固了',
                'content': f'完成了{main_count}件家庭事务，这些看似琐碎的事情，其实是生活稳定的基石。有了这些保障，你可以更安心地投入到其他重要的事情上。'
            },
            '工作学习': {
                'title': '专业能力在提升',
                'content': f'完成了{main_count}个工作学习任务，在专业能力上有了新的积累。持续的学习和实践，会让你变得更加优秀。'
            },
            '理财投资': {
                'title': '财富意识在增强',
                'content': f'在理财投资上投入了关注，这种对财富的规划意识很重要。理性投资，长期坚持，财富会慢慢积累。'
            },
            '个人成长': {
                'title': '在成长的路上前进',
                'content': f'完成了{main_count}个个人成长任务，每一次学习都是对自己的投资。继续保持这种成长心态！'
            },
            '健康运动': {
                'title': '健康是最大的财富',
                'content': f'在健康管理上投入了时间，这是对自己最好的投资。身体是革命的本钱，继续保持运动习惯！'
            }
        }
        
        if main_type in highlight_map:
            highlights.append(highlight_map[main_type])
        
        # 2. 基于执行力
        p0_count = by_priority.get('P0 重要紧急', 0)
        if p0_count >= 5:
            highlights.append({
                'title': '执行力值得肯定',
                'content': f'本周完成了{p0_count}个P0重要紧急任务，没有拖延，说明你的执行力和时间管理能力都不错。继续保持这种状态！'
            })
        
        # 3. 基于平衡性
        type_count = len(by_type)
        if type_count >= 3:
            highlights.append({
                'title': '生活比较平衡',
                'content': f'虽然{main_type}占据了较多时间，但你也没有忽视其他领域，涉及了{type_count}个生活领域。这种平衡感很重要。'
            })
        
        return highlights
    
    def _empty_summary(self, week_start: datetime, week_end: datetime) -> Dict:
        """返回空总结"""
        return {
            'week_start': week_start.strftime('%Y-%m-%d'),
            'week_end': week_end.strftime('%Y-%m-%d'),
            'week_number': week_start.isocalendar()[1],
            'year': week_start.year,
            'theme': {
                'title': '平静的一周',
                'description': '本周没有完成任务记录。也许是在休息调整，也许是在酝酿新的计划。'
            },
            'completed': {
                'total': 0,
                'by_type': {},
                'by_priority': {},
                'tasks': []
            },
            'highlights': [],
            'reflections': {
                'suggestions': ['下周可以制定一些小目标，开始行动起来'],
                'concerns': []
            }
        }

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
    
    def __init__(self, notion_service, habit_service=None):
        self.notion_service = notion_service
        self.habit_service = habit_service
        self.beijing_tz = pytz.timezone('Asia/Shanghai')
        self.theme_extractor = ThemeExtractor()
        self.content_summarizer = ContentSummarizer()
        self.reflection_generator = ReflectionGenerator()
        
        # 导入存储服务
        try:
            from .storage_service import WeeklyDataStorage
            self.storage = WeeklyDataStorage()
        except Exception as e:
            print(f"⚠️  存储服务初始化失败: {e}")
            self.storage = None
    
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
        """
        过滤本周的任务
        包含三种情况：
        1. 开始时间-截止时间属于本周范围内的数据
        2. 完成时间在本周的数据（提前完成了任务）
        3. 进行中的任务（截止时间在本周或之后）
        
        排除：子任务（parent_task不为空的任务）
        """
        result = []
        week_end_with_time = week_end.replace(hour=23, minute=59, second=59)
        
        excluded_subtasks = 0
        for task in tasks:
            # 排除子任务（有父任务的任务）
            if task.get('parent_ids') and len(task.get('parent_ids', [])) > 0:
                excluded_subtasks += 1
                continue
            
            include_task = False
            
            # 情况1：开始时间-截止时间属于本周范围内
            start_date = task.get('start_date')
            deadline = task.get('deadline')
            
            if start_date and deadline:
                try:
                    start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                    due_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                    start_dt = start_dt.astimezone(self.beijing_tz)
                    due_dt = due_dt.astimezone(self.beijing_tz)
                    
                    # 任务的时间范围与本周有交集
                    if not (due_dt < week_start or start_dt > week_end_with_time):
                        include_task = True
                except:
                    pass
            
            # 情况2：完成时间在本周（提前完成）
            if not include_task and task.get('status') == '已完成' and task.get('completed_time'):
                try:
                    completed_time = datetime.fromisoformat(
                        task['completed_time'].replace('Z', '+00:00')
                    )
                    completed_time = completed_time.astimezone(self.beijing_tz)
                    if week_start <= completed_time <= week_end_with_time:
                        include_task = True
                except:
                    pass
            
            # 情况3：进行中的任务（截止时间在本周或之后）
            if not include_task and task.get('status') == '进行中' and deadline:
                try:
                    due_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                    due_dt = due_dt.astimezone(self.beijing_tz)
                    # 截止时间在本周开始之后
                    if due_dt >= week_start:
                        include_task = True
                except:
                    pass
            
            if include_task:
                result.append(task)
        
        print(f"📊 任务过滤统计:")
        print(f"   - 总任务数: {len(tasks)}")
        print(f"   - 排除子任务: {excluded_subtasks}")
        print(f"   - 本周任务: {len(result)}")
        
        # 排序：按类型、优先级、状态
        sorted_result = self._sort_tasks(result)
        print(f"   - 排序完成: {len(sorted_result)} 个任务")
        
        return sorted_result
    
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
                'description': '本周没有完成任务记录。也许是在休息调整,也许是在酝酿新的计划。'
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
    
    def get_available_weeks(self, limit: int = 52) -> List[Dict]:
        """
        获取有完成任务的历史周列表
        
        Args:
            limit: 最多返回多少周
            
        Returns:
            周列表，每项包含 week_start, week_end, week_number, year, task_count
        """
        try:
            # 获取所有任务
            all_tasks = self.notion_service.get_tasks()
            
            # 获取所有已完成任务的完成时间
            completed_dates = []
            for task in all_tasks:
                if task.get('status') == '已完成' and task.get('completed_time'):
                    try:
                        completed_time = datetime.fromisoformat(
                            task['completed_time'].replace('Z', '+00:00')
                        )
                        completed_time = completed_time.astimezone(self.beijing_tz)
                        completed_dates.append(completed_time)
                    except:
                        pass
            
            if not completed_dates:
                return []
            
            # 找出最早和最晚的完成时间
            earliest = min(completed_dates)
            latest = max(completed_dates)
            
            # 生成周列表（从上周开始往前推）
            weeks = []
            now = datetime.now(self.beijing_tz)
            current_monday = now - timedelta(days=now.weekday())
            
            # 从上周开始
            week_start = current_monday - timedelta(days=7)
            
            while len(weeks) < limit and week_start >= earliest - timedelta(days=7):
                week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
                
                # 统计这周的任务数
                task_count = sum(1 for d in completed_dates 
                               if week_start <= d <= week_end)
                
                # 只返回有任务的周
                if task_count > 0:
                    weeks.append({
                        'week_start': week_start.strftime('%Y-%m-%d'),
                        'week_end': week_end.strftime('%Y-%m-%d'),
                        'week_number': week_start.isocalendar()[1],
                        'year': week_start.year,
                        'task_count': task_count
                    })
                
                # 往前推一周
                week_start -= timedelta(days=7)
            
            return weeks
            
        except Exception as e:
            print(f"Error getting available weeks: {str(e)}")
            return []
    
    def generate_markdown(self, summary: Dict) -> str:
        """
        生成 Markdown 格式的周总结
        
        Args:
            summary: 周总结数据
            
        Returns:
            Markdown 格式的文本
        """
        md = []
        
        # 标题
        md.append(f"# 我的一周")
        md.append("")
        md.append(f"**{summary['year']}年第{summary['week_number']}周** ({summary['week_start']} ~ {summary['week_end']})")
        md.append("")
        
        # 本周主题
        md.append(f"## 本周主题：{summary['theme']['title']}")
        md.append("")
        md.append(summary['theme']['description'])
        md.append("")
        
        # 本周完成概览
        md.append(f"## 本周完成概览")
        md.append("")
        md.append(f"共完成 **{summary['completed']['total']}** 件事")
        md.append("")
        
        # 按类型展示
        for task_type, data in summary['completed']['by_type'].items():
            type_icons = {
                '家庭生活': '',
                '工作学习': '',
                '理财投资': '',
                '个人成长': '',
                '健康运动': '',
            }
            icon = type_icons.get(task_type, '')
            
            md.append(f"### {icon} {task_type} ({data['count']}件 - {data['percentage']}%)")
            md.append("")
            
            # 重点事项
            if data['key_items']:
                md.append(f"**重点事项：** {', '.join(data['key_items'])}")
                md.append("")
            
            # 摘要
            md.append(data['summary'])
            md.append("")
            
            # 任务列表
            for task in data['tasks']:
                priority_short = task['priority'].split()[0] if ' ' in task['priority'] else task['priority']
                md.append(f"- {task['name']} `{priority_short}`")
            
            md.append("")
        
        # 值得记录的时刻
        if summary['highlights']:
            md.append("## 值得记录的时刻")
            md.append("")
            
            for highlight in summary['highlights']:
                md.append(f"### {highlight['title']}")
                md.append("")
                md.append(highlight['content'])
                md.append("")
        
        # 一些思考
        if summary['reflections']['suggestions'] or summary['reflections']['concerns']:
            md.append("## 一些思考")
            md.append("")
            
            if summary['reflections']['suggestions']:
                md.append("### 下周可以考虑")
                md.append("")
                for suggestion in summary['reflections']['suggestions']:
                    md.append(f"- {suggestion}")
                md.append("")
            
            if summary['reflections']['concerns']:
                md.append("### 需要关注")
                md.append("")
                for concern in summary['reflections']['concerns']:
                    md.append(f"- {concern}")
                md.append("")
        
        # 底部
        md.append("---")
        md.append("")
        md.append("*Generated by Notion Task Manager*")
        
        return '\n'.join(md)
    
    def get_new_format_summary(self, week: str = 'current') -> Dict:
        """
        获取新格式的周复盘数据
        优先加载已保存的数据，如果不存在则自动生成
        
        Args:
            week: 'current', 'last', 或具体日期 'YYYY-MM-DD'
            
        Returns:
            新格式的周复盘数据
        """
        try:
            # 1. 确定周范围
            week_start, week_end = self._get_week_range(week)
            week_start_str = week_start.strftime('%Y-%m-%d')
            
            # 2. 尝试加载已保存的数据
            if self.storage:
                saved_data = self.storage.load_weekly_data(week, week_start_str)
                if saved_data:
                    print(f"✅ 使用已保存的周数据: {week_start_str}")
                    return saved_data
            
            # 3. 如果没有保存的数据，则自动生成
            print(f"ℹ️  生成新的周数据: {week_start_str}")
            
            # 获取所有任务
            all_tasks = self.notion_service.get_tasks()
            
            # 过滤本周完成的任务
            completed_tasks = self._filter_completed_tasks(all_tasks, week_start, week_end)
            
            # 按类型分组
            by_type = self._group_and_analyze_by_type(completed_tasks)
            by_priority = self._count_by_priority(completed_tasks)
            
            # 生成各个部分
            goals = self._generate_goals_from_tasks(completed_tasks, by_type)
            habits = self._generate_default_habits(week_start, week_end)
            daily_records = self._generate_daily_records(completed_tasks, week_start, week_end)
            kiss = self._generate_kiss_reflection(completed_tasks, by_type, by_priority)
            summary = self._generate_weekly_summary(completed_tasks, by_type, by_priority)
            next_week_plan = self._generate_next_week_plan(completed_tasks, by_type)
            
            return {
                'week_start': week_start.strftime('%Y-%m-%d'),
                'week_end': week_end.strftime('%Y-%m-%d'),
                'week_number': week_start.isocalendar()[1],
                'year': week_start.year,
                'goals': goals,
                'habits': habits,
                'daily_records': daily_records,
                'kiss': kiss,
                'summary': summary,
                'next_week_plan': next_week_plan
            }
            
        except Exception as e:
            print(f"Error getting new format summary: {str(e)}")
            raise
    
    def _sort_tasks(self, tasks: List[Dict]) -> List[Dict]:
        """
        对任务进行排序
        排序规则：类型 > 优先级 > 状态
        """
        # 定义排序优先级
        type_order = {
            '工作': 1,
            '学习': 2,
            '健康': 3,
            '家庭生活': 4,
            '理财投资': 5,
            '个人成长': 6,
            '其他': 7,
            '未分类': 8
        }
        
        priority_order = {
            'P0 重要紧急': 1,
            'P1 重要不紧急': 2,
            'P2 紧急不重要': 3,
            'P3 不重要不紧急': 4
        }
        
        status_order = {
            '进行中': 1,
            '已完成': 2,
            '待办': 3,
            '已取消': 4
        }
        
        def sort_key(task):
            task_type = task.get('task_type', '未分类')
            priority = task.get('priority', 'P3 不重要不紧急')
            status = task.get('status', '待办')
            
            return (
                type_order.get(task_type, 99),
                priority_order.get(priority, 99),
                status_order.get(status, 99)
            )
        
        return sorted(tasks, key=sort_key)
    
    def _generate_goals_from_tasks(self, tasks: List[Dict], by_type: Dict) -> List[Dict]:
        """从任务数据生成目标完成情况 - 直接使用Notion任务表数据"""
        goals = []
        
        # 直接返回任务列表，包含：类型、任务、状态、优先级、备注
        for task in tasks:
            goals.append({
                'type': task.get('task_type', '未分类'),  # 类型（从Notion的task_type字段）
                'task': task.get('name', ''),  # 任务名称
                'status': task.get('status', ''),  # 状态
                'priority': task.get('priority', ''),  # 优先级
                'note': task.get('notes', '')  # 备注（从Notion的notes字段）
            })
        
        return goals
    
    def _generate_default_habits(self, week_start: datetime, week_end: datetime) -> Dict:
        """生成习惯打卡数据（从 HabitService 获取真实数据或使用默认数据）"""
        
        # 如果有 HabitService，获取真实数据
        if self.habit_service:
            try:
                return self._generate_habits_from_service(week_start, week_end)
            except Exception as e:
                print(f"⚠️  从 HabitService 获取习惯数据失败: {e}")
                # 失败时使用默认数据
        
        # 默认数据（兼容旧版本）
        habit_items = ['早起（7点）', '早睡（23:30）', '喝水≥2000ml', '每日记账', '每日总结']
        daily_records = []
        
        current = week_start
        weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
        
        while current <= week_end:
            daily_records.append({
                'date': current.strftime('%Y-%m-%d'),
                'weekday': weekdays[current.weekday()],
                'checks': {habit: False for habit in habit_items}
            })
            current += timedelta(days=1)
        
        # 计算统计（全部为0）
        statistics = {}
        for habit in habit_items:
            statistics[habit] = {
                'completed': 0,
                'total': len(daily_records),
                'rate': '0%'
            }
        
        return {
            'habit_items': habit_items,
            'daily_records': daily_records,
            'statistics': statistics
        }
    
    def _generate_habits_from_service(self, week_start: datetime, week_end: datetime) -> Dict:
        """从 HabitService 获取真实的习惯打卡数据"""
        
        # 1. 获取所有生效的习惯
        habits = self.habit_service.get_habits(status='生效')
        
        if not habits:
            # 如果没有习惯，返回空数据
            return {
                'habit_items': [],
                'daily_records': [],
                'statistics': {}
            }
        
        # 2. 获取本周的打卡记录
        week_start_str = week_start.strftime('%Y-%m-%d')
        week_end_str = week_end.strftime('%Y-%m-%d')
        logs = self.habit_service.get_daily_logs(
            start_date=week_start_str,
            end_date=week_end_str
        )
        
        # 3. 构建习惯名称列表
        habit_items = [habit['name'] for habit in habits]
        habit_id_to_name = {habit['id']: habit['name'] for habit in habits}
        
        # 4. 按日期组织打卡记录
        logs_by_date = defaultdict(dict)
        for log in logs:
            date = log.get('date')
            if date:
                for habit_id in log.get('habit_ids', []):
                    habit_name = habit_id_to_name.get(habit_id)
                    if habit_name:
                        logs_by_date[date][habit_name] = log.get('completed', False)
        
        # 5. 生成每日记录
        daily_records = []
        current = week_start
        weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
        
        while current <= week_end:
            date_str = current.strftime('%Y-%m-%d')
            checks = {}
            
            for habit_name in habit_items:
                # 从打卡记录中获取状态，默认为 False
                checks[habit_name] = logs_by_date.get(date_str, {}).get(habit_name, False)
            
            daily_records.append({
                'date': date_str,
                'weekday': weekdays[current.weekday()],
                'checks': checks
            })
            current += timedelta(days=1)
        
        # 6. 计算统计
        statistics = {}
        for habit_name in habit_items:
            completed = sum(1 for record in daily_records if record['checks'].get(habit_name, False))
            total = len(daily_records)
            rate = round((completed / total) * 100) if total > 0 else 0
            
            statistics[habit_name] = {
                'completed': completed,
                'total': total,
                'rate': f'{rate}%'
            }
        
        return {
            'habit_items': habit_items,
            'daily_records': daily_records,
            'statistics': statistics
        }
    
    def _generate_daily_records(self, tasks: List[Dict], 
                               week_start: datetime, week_end: datetime) -> List[Dict]:
        """生成每日事项记录"""
        # 按日期分组任务
        daily_tasks = defaultdict(list)
        for task in tasks:
            if task.get('completed_time'):
                try:
                    completed_time = datetime.fromisoformat(
                        task['completed_time'].replace('Z', '+00:00')
                    )
                    completed_time = completed_time.astimezone(self.beijing_tz)
                    date_key = completed_time.strftime('%Y-%m-%d')
                    daily_tasks[date_key].append(task['name'])
                except:
                    pass
        
        # 生成每日记录
        records = []
        current = week_start
        weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
        
        while current <= week_end:
            date_key = current.strftime('%Y-%m-%d')
            tasks_list = daily_tasks.get(date_key, [])
            
            # 取前3个任务作为简要描述
            if tasks_list:
                tasks_summary = '、'.join(tasks_list[:3])
                if len(tasks_list) > 3:
                    tasks_summary += f"等{len(tasks_list)}项"
            else:
                tasks_summary = '无'
            
            records.append({
                'date': date_key,
                'weekday': weekdays[current.weekday()],
                'tasks_summary': tasks_summary,
                'task_count': len(tasks_list)
            })
            
            current += timedelta(days=1)
        
        return records
    
    def _generate_kiss_reflection(self, tasks: List[Dict], 
                                 by_type: Dict, by_priority: Dict) -> Dict:
        """生成KISS复盘"""
        kiss = {
            'keep': [],
            'improve': [],
            'stop': [],
            'try': []
        }
        
        # Keep - 分析做得好的方面
        if by_type:
            main_type = max(by_type.items(), key=lambda x: x[1]['count'])[0]
            main_count = by_type[main_type]['count']
            kiss['keep'].append(f"{main_type}事项执行到位，完成{main_count}项任务")
        
        # 检查P0任务完成情况
        p0_count = by_priority.get('P0 重要紧急', 0)
        if p0_count > 0:
            kiss['keep'].append(f"重要紧急任务及时处理，完成{p0_count}项P0任务")
        
        # Improve - 分析需要改进的方面
        all_types = ['家庭生活', '工作学习', '理财投资', '个人成长', '健康运动']
        missing_types = [t for t in all_types if t not in by_type]
        
        if missing_types:
            kiss['improve'].append(f"{missing_types[0]}类任务未安排，需要重视")
        
        # 检查任务分布平衡性
        if len(by_type) < 3:
            kiss['improve'].append("任务类型较单一，建议增加生活多样性")
        
        # Stop - 建议停止的行为
        if p0_count > 5:
            kiss['stop'].append("停止让任务变得紧急，提前规划")
        
        # Try - 尝试新的做法
        if missing_types:
            kiss['try'].append(f"尝试安排{missing_types[0]}相关任务")
        
        if len(by_type) < 3:
            kiss['try'].append("尝试在不同生活领域设定小目标")
        
        return kiss
    
    def _generate_weekly_summary(self, tasks: List[Dict], 
                                by_type: Dict, by_priority: Dict) -> Dict:
        """生成本周小结"""
        highlights = []
        shortcomings = []
        improvements = []
        
        # 亮点
        if by_type:
            main_type = max(by_type.items(), key=lambda x: x[1]['count'])[0]
            highlights.append(f"{main_type}管理到位")
        
        if len(by_type) >= 3:
            highlights.append("生活各方面都有兼顾")
        
        total_tasks = len(tasks)
        if total_tasks >= 10:
            highlights.append(f"本周完成{total_tasks}项任务，执行力强")
        
        # 不足
        all_types = ['家庭生活', '工作学习', '理财投资', '个人成长', '健康运动']
        missing_types = [t for t in all_types if t not in by_type]
        
        if missing_types:
            shortcomings.append(f"{missing_types[0]}未安排")
        
        if len(by_type) < 3:
            shortcomings.append("任务类型较单一")
        
        # 改进
        if missing_types:
            improvements.append(f"下周加入{missing_types[0]}目标")
        
        if by_priority.get('P0 重要紧急', 0) > 5:
            improvements.append("提前规划，减少紧急任务")
        
        return {
            'highlights': '、'.join(highlights) + '。' if highlights else '本周稳步推进。',
            'shortcomings': '、'.join(shortcomings) + '。' if shortcomings else '整体表现良好。',
            'improvements': '、'.join(improvements) + '。' if improvements else '继续保持当前节奏。'
        }
    
    def _generate_next_week_plan(self, tasks: List[Dict], by_type: Dict) -> List[Dict]:
        """生成下周计划"""
        plans = []
        
        # 基于缺失的任务类型生成计划
        all_types = ['家庭生活', '工作学习', '理财投资', '个人成长', '健康运动']
        missing_types = [t for t in all_types if t not in by_type]
        
        plan_templates = {
            '个人成长': {'task': '阅读或学习新技能', 'target': 2},
            '理财投资': {'task': '整理投资笔记或复盘', 'target': 1},
            '健康运动': {'task': '运动或体检', 'target': 3},
            '工作学习': {'task': '推进重要项目', 'target': 3},
            '家庭生活': {'task': '家庭事务处理', 'target': 2}
        }
        
        # 为缺失的类型生成计划
        for missing_type in missing_types[:3]:  # 最多3个
            if missing_type in plan_templates:
                template = plan_templates[missing_type]
                plans.append({
                    'category': missing_type,
                    'task': template['task'],
                    'target': template['target']
                })
        
        # 如果计划少于4个，补充一些通用计划
        if len(plans) < 4:
            if '健康运动' not in [p['category'] for p in plans]:
                plans.append({
                    'category': '健康',
                    'task': '保持良好作息',
                    'target': 5
                })
        
        return plans
    
    def generate_new_markdown(self, summary: Dict) -> str:
        """
        生成新格式的 Markdown 周复盘
        
        Args:
            summary: 新格式的周总结数据
            
        Returns:
            Markdown 格式的文本
        """
        md = []
        
        # 标题
        md.append(f"# {summary['year']}年第{summary['week_number']}周复盘（{summary['week_start']} ~ {summary['week_end']}）")
        md.append("")
        
        # 一、本周目标与完成情况
        md.append("## 一、本周目标与完成情况")
        md.append("")
        
        # 目标表格
        md.append("| 序号 | 类型 | 任务 | 状态 | 优先级 | 备注 |")
        md.append("|------|------|------|------|--------|------|")
        
        for i, goal in enumerate(summary['goals'], 1):
            md.append(
                f"| {i} | {goal.get('type', '')} | {goal.get('task', '')} | "
                f"{goal.get('status', '')} | {goal.get('priority', '')} | {goal.get('note', '')} |"
            )
        
        md.append("")
        md.append("---")
        md.append("")
        
        # 二、习惯追踪
        md.append("## 二、习惯追踪")
        md.append("")
        
        habits = summary['habits']
        habit_items = habits['habit_items']
        
        # 表头
        header = "| 星期 | 日期 |"
        for habit in habit_items:
            header += f" {habit} |"
        md.append(header)
        
        # 分隔符
        separator = "|------|------|"
        for _ in habit_items:
            separator += "------|"  
        md.append(separator)
        
        # 数据行
        for record in habits['daily_records']:
            row = f"| {record['weekday']} | {record['date'][5:]} |"
            for habit in habit_items:
                check = "✓" if record['checks'].get(habit, False) else "✗"
                row += f" {check} |"
            md.append(row)
        
        # 完成率统计行
        stats_row = "| **完成率** | |"
        for habit in habit_items:
            stat = habits['statistics'].get(habit, {})
            completed = stat.get('completed', 0)
            total = stat.get('total', 0)
            stats_row += f" {completed}/{total} |"
        md.append(stats_row)
        
        md.append("")
        
        # 习惯总结
        md.append("**习惯总结：**")
        for habit in habit_items:
            stat = habits['statistics'].get(habit, {})
            completed = stat.get('completed', 0)
            total = stat.get('total', 0)
            rate = round((completed / total) * 100) if total > 0 else 0
            
            if rate == 100:
                emoji = '✅'
                label = '坚持最好'
            elif rate >= 70:
                emoji = '👍'
                label = '表现良好'
            else:
                emoji = '⚠️'
                label = '需要改善'
            
            md.append(f"- {emoji} **{label}**：{habit} ({completed}/{total}天，{rate}%)")
        
        md.append("")
        md.append("---")
        md.append("")
        
        # 三、本周复盘
        md.append("## 三、本周复盘")
        md.append("")
        
        kiss = summary['kiss']
        
        # 1. 做得好的地方
        md.append("### 1. 做得好的地方（Keep/Reinforce）")
        for item in kiss['keep']:
            md.append(f"- ✅ {item}")
        md.append("")
        
        # 2. 需要改进的问题
        md.append("### 2. 需要改进的问题（Stop/Solve）")
        for item in kiss['stop']:
            md.append(f"- ⚠️ {item}")
        md.append("")
        
        # 3. 根本原因分析
        md.append("### 3. 根本原因分析（Why）")
        
        # 检查是否为表格格式（对象数组）
        if kiss['improve'] and len(kiss['improve']) > 0:
            first_item = kiss['improve'][0]
            if isinstance(first_item, dict):
                # 表格格式
                md.append("| 现象 | 表层原因 | 深层原因 |")
                md.append("|------|----------|----------|")
                for item in kiss['improve']:
                    phenomenon = item.get('phenomenon', item.get('现象', ''))
                    surface = item.get('surface_reason', item.get('表层原因', ''))
                    deep = item.get('deep_reason', item.get('深层原因', '')).replace('\n', '<br>')
                    md.append(f"| {phenomenon} | {surface} | {deep} |")
            else:
                # 列表格式
                for item in kiss['improve']:
                    md.append(f"- 🔍 {item}")
        md.append("")
        
        # 4. 行动改进方案
        md.append("### 4. 行动改进方案（Do/Try）")
        
        # 检查是否为表格格式（对象数组）
        if kiss['try'] and len(kiss['try']) > 0:
            first_item = kiss['try'][0]
            if isinstance(first_item, dict):
                # 表格格式
                md.append("| 问题领域 | 下周具体行动 | 衡量指标 |")
                md.append("|----------|--------------|----------|")
                for item in kiss['try']:
                    area = item.get('area', item.get('问题领域', ''))
                    actions = item.get('actions', item.get('下周具体行动', '')).replace('\n', '<br>')
                    metrics = item.get('metrics', item.get('衡量指标', ''))
                    md.append(f"| {area} | {actions} | {metrics} |")
            else:
                # 列表格式
                for item in kiss['try']:
                    md.append(f"- 🎯 {item}")
        
        md.append("")
        
        # 思考
        s = summary['summary']
        md.append("### 思考")
        md.append(f"- **亮点**：{s['highlights']}")
        md.append(f"- **不足**：{s['shortcomings']}")
        md.append(f"- **改进**：{s['improvements']}")
        
        md.append("")
        md.append("---")
        md.append("")
        
        # 四、下周重点规划
        md.append("## 四、下周重点规划")
        md.append("")
        
        # 三大核心目标（如果有）
        if 'next_week_goals' in summary and summary['next_week_goals']:
            md.append("### 🏆 三大核心目标")
            for i, goal in enumerate(summary['next_week_goals'], 1):
                md.append(f"{i}. {goal}")
            md.append("")
        
        # 计划表
        md.append("| 序号 | 类别 | 任务 | 目标 | 关键行动 |")
        md.append("|------|------|------|------|----------|")
        
        for i, plan in enumerate(summary['next_week_plan'], 1):
            actions = plan.get('actions', plan.get('关键行动', ''))
            md.append(f"| {i} | {plan['category']} | {plan['task']} | {plan['target']} | {actions} |")
        
        md.append("")
        
        return '\n'.join(md)
    
    def _format_list_for_table(self, items: List[str]) -> str:
        """格式化列表项为表格单元格内容"""
        if not items:
            return ''
        return '<br>'.join([f"{i+1}. {item}" for i, item in enumerate(items)])

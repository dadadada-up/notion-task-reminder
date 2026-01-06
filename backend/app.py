#!/usr/bin/env python3
"""
Flask Web Application for Notion Task Manager
提供 RESTful API 和前端页面服务
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# 加载环境变量（使用根目录的 .env 文件）
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)
print(f"✅ 使用环境变量文件: {env_path}")

# 添加 src 目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from services.notion_service import NotionService
from services.push_service import PushService
from services.email_service import EmailService
from services.schedule_service import ScheduleService
from services.config_service import ConfigService
from services.github_service import GitHubService
from services.weekly_summary_service import WeeklySummaryService
from services.habit_service import HabitService

app = Flask(__name__, static_folder='../frontend/dist')
CORS(app)

# 初始化服务
notion_service = NotionService()
push_service = PushService()
email_service = EmailService()
schedule_service = ScheduleService()
config_service = ConfigService()
github_service = GitHubService()
habit_service = HabitService()
weekly_summary_service = WeeklySummaryService(notion_service, habit_service)

# 初始化DeepSeek服务（可选）
deepseek_service = None
deepseek_api_key = os.environ.get('DEEPSEEK_API_KEY', '')
deepseek_enabled = os.environ.get('DEEPSEEK_ENABLED', 'false').lower() == 'true'
if deepseek_enabled and deepseek_api_key:
    try:
        from services.deepseek_service import DeepSeekService
        deepseek_service = DeepSeekService(deepseek_api_key)
        print("✅ DeepSeek AI服务已启用")
    except Exception as e:
        print(f"⚠️  DeepSeek AI服务初始化失败: {e}")

# ==================== API Routes ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        'status': 'ok',
        'service': 'Notion Task Manager API',
        'version': '1.0.0'
    })

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """
    获取任务列表
    Query Parameters:
    - status: inbox/pedding/doing/done
    - assignee: 负责人名称
    - priority: P0/P1/P2/P3
    - type: 任务类型
    """
    try:
        # 获取查询参数
        status = request.args.get('status')
        assignee = request.args.get('assignee')
        priority = request.args.get('priority')
        task_type = request.args.get('type')
        
        # 从 Notion 获取任务
        tasks = notion_service.get_tasks(
            status=status,
            assignee=assignee,
            priority=priority,
            task_type=task_type
        )
        
        return jsonify({
            'success': True,
            'data': tasks,
            'count': len(tasks)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/tasks', methods=['POST'])
def create_task():
    """创建新任务"""
    try:
        data = request.get_json()
        
        # 验证必需字段
        if not data.get('name'):
            return jsonify({
                'success': False,
                'error': 'Task name is required'
            }), 400
        
        # 创建任务
        task = notion_service.create_task(data)
        
        return jsonify({
            'success': True,
            'data': task
        }), 201
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/tasks/<task_id>', methods=['GET'])
def get_task(task_id):
    """获取单个任务详情"""
    try:
        task = notion_service.get_task_by_id(task_id)
        
        if not task:
            return jsonify({
                'success': False,
                'error': 'Task not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': task
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/tasks/<task_id>', methods=['PUT'])
def update_task(task_id):
    """
    更新任务
    Body: {
        "status": "doing",
        "priority": "P0 重要紧急",
        "assignee": "dada"
    }
    """
    try:
        data = request.get_json()
        
        result = notion_service.update_task(task_id, data)
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/upload-image', methods=['POST'])
def upload_image():
    """
    上传图片到 Notion
    接收文件并返回 file_upload_id
    """
    try:
        # 检查是否有文件
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': '没有上传文件'
            }), 400
        
        file = request.files['file']
        
        # 检查文件名
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': '文件名为空'
            }), 400
        
        # 检查文件类型
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({
                'success': False,
                'error': f'不支持的文件类型。支持的类型: {", ".join(allowed_extensions)}'
            }), 400
        
        # 检查文件大小（20MB 限制）
        file.seek(0, 2)  # 移动到文件末尾
        file_size = file.tell()
        file.seek(0)  # 重置到文件开头
        
        max_size = 20 * 1024 * 1024  # 20MB
        if file_size > max_size:
            return jsonify({
                'success': False,
                'error': f'文件大小超过限制（最大 20MB）'
            }), 400
        
        # 读取文件内容
        file_content = file.read()
        
        # 上传到 Notion
        file_upload_id = notion_service.upload_image_to_notion(
            file_content=file_content,
            filename=file.filename
        )
        
        return jsonify({
            'success': True,
            'data': {
                'file_upload_id': file_upload_id,
                'filename': file.filename,
                'size': file_size
            }
        }), 200
        
    except Exception as e:
        print(f"❌ 上传图片失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """获取综合统计数据（任务+习惯）"""
    try:
        # 获取任务统计
        task_stats = notion_service.get_statistics()
        
        # 获取习惯统计
        try:
            habit_stats = habit_service.get_statistics()
        except Exception as e:
            print(f"⚠️  获取习惯统计失败: {e}")
            habit_stats = {
                'today': {'total': 0, 'completed': 0, 'remaining': 0, 'completion_rate': 0},
                'week': {'completed': 0, 'target': 0, 'remaining': 0, 'completion_rate': 0, 'longest_streak': 0},
                'month': {'completed': 0, 'target': 0, 'completion_rate': 0},
                'habits': []
            }
        
        return jsonify({
            'success': True,
            'data': {
                'tasks': task_stats,
                'habits': habit_stats
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/data', methods=['GET'])
def get_combined_data():
    """获取任务和统计数据的合并API"""
    try:
        # 一次性获取所有数据，避免重复查询
        tasks = notion_service.get_tasks_with_cache()
        
        # 计算统计数据
        stats = notion_service.get_statistics()
        
        return jsonify({
            'success': True,
            'data': {
                'tasks': tasks,
                'stats': stats
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== Habit Routes ====================

@app.route('/api/habits', methods=['GET', 'POST'])
def manage_habits():
    """
    获取或创建习惯
    GET: 获取习惯列表
    POST: 创建新习惯
    """
    try:
        if request.method == 'GET':
            status = request.args.get('status')
            habits = habit_service.get_habits(status=status)
            
            return jsonify({
                'success': True,
                'data': habits,
                'count': len(habits)
            })
        else:
            data = request.get_json()
            
            if not data.get('name'):
                return jsonify({
                    'success': False,
                    'error': 'Habit name is required'
                }), 400
            
            habit = habit_service.create_habit(data)
            
            return jsonify({
                'success': True,
                'data': habit
            }), 201
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/habits/<habit_id>', methods=['GET', 'PUT'])
def manage_habit(habit_id):
    """
    获取或更新单个习惯
    GET: 获取习惯详情
    PUT: 更新习惯
    """
    try:
        if request.method == 'GET':
            habit = habit_service.get_habit_by_id(habit_id)
            
            if not habit:
                return jsonify({
                    'success': False,
                    'error': 'Habit not found'
                }), 404
            
            return jsonify({
                'success': True,
                'data': habit
            })
        else:
            data = request.get_json()
            habit = habit_service.update_habit(habit_id, data)
            
            return jsonify({
                'success': True,
                'data': habit
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/habits/stats', methods=['GET'])
def get_habit_stats():
    """获取习惯统计数据"""
    try:
        stats = habit_service.get_statistics()
        
        return jsonify({
            'success': True,
            'data': stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/daily-logs', methods=['GET', 'POST'])
def manage_daily_logs():
    """
    获取或创建打卡记录
    GET: 获取打卡记录列表
    POST: 创建打卡记录
    """
    try:
        if request.method == 'GET':
            habit_id = request.args.get('habit_id')
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            completed = request.args.get('completed')
            
            if completed is not None:
                completed = completed.lower() == 'true'
            
            logs = habit_service.get_daily_logs(
                habit_id=habit_id,
                start_date=start_date,
                end_date=end_date,
                completed=completed
            )
            
            return jsonify({
                'success': True,
                'data': logs,
                'count': len(logs)
            })
        else:
            data = request.get_json()
            
            if not data.get('habit_id'):
                return jsonify({
                    'success': False,
                    'error': 'habit_id is required'
                }), 400
            
            log = habit_service.create_daily_log(data)
            
            return jsonify({
                'success': True,
                'data': log
            }), 201
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/daily-logs/<log_id>', methods=['PUT'])
def update_daily_log(log_id):
    """更新打卡记录"""
    try:
        data = request.get_json()
        log = habit_service.update_daily_log(log_id, data)
        
        return jsonify({
            'success': True,
            'data': log
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/daily-logs/calendar', methods=['GET'])
def get_calendar_data():
    """获取日历视图数据"""
    try:
        year = request.args.get('year')
        month = request.args.get('month')
        
        if not year or not month:
            from datetime import datetime
            now = datetime.now()
            year = now.year
            month = now.month
        else:
            year = int(year)
            month = int(month)
        
        # 计算月份的第一天和最后一天
        from calendar import monthrange
        _, last_day = monthrange(year, month)
        
        start_date = f"{year}-{month:02d}-01"
        end_date = f"{year}-{month:02d}-{last_day:02d}"
        
        # 获取该月的所有打卡记录
        logs = habit_service.get_daily_logs(start_date=start_date, end_date=end_date)
        
        # 按日期分组
        calendar_data = {}
        for log in logs:
            date = log.get('date')
            if date:
                if date not in calendar_data:
                    calendar_data[date] = {
                        'date': date,
                        'logs': [],
                        'completed_count': 0,
                        'total_count': 0
                    }
                calendar_data[date]['logs'].append(log)
                calendar_data[date]['total_count'] += 1
                if log.get('completed'):
                    calendar_data[date]['completed_count'] += 1
        
        return jsonify({
            'success': True,
            'data': list(calendar_data.values())
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/tasks/auto-transition', methods=['POST'])
def auto_transition_tasks():
    """
    自动流转任务状态
    将收集箱中已到开始时间的任务自动转为进行中
    """
    try:
        result = notion_service.auto_transition_tasks()
        
        return jsonify({
            'success': result['success'],
            'data': {
                'total_checked': result['total_checked'],
                'transitioned': result['transitioned'],
                'tasks': result['tasks'],
                'timestamp': result.get('timestamp', '')
            },
            'message': f"检查了 {result['total_checked']} 个任务，流转了 {result['transitioned']} 个任务"
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/notify', methods=['POST'])
def send_notification():
    """
    发送通知
    Body: {
        "type": "daily_todo" | "daily_done" | "both",
        "channels": ["pushplus", "email"],
        "customTitle": "自定义标题",
        "customMessage": "自定义消息（HTML）"
    }
    """
    try:
        data = request.get_json()
        notification_type = data.get('type', 'daily_todo')
        channels = data.get('channels', ['pushplus'])
        custom_title = data.get('customTitle', '')
        custom_message = data.get('customMessage', '')
        
        print(f"\n[API /notify] 收到请求:")
        print(f"  类型: {notification_type}")
        print(f"  渠道: {channels}")
        print(f"  自定义标题: {custom_title}")
        
        results = {}
        
        # 处理发送类型
        types_to_send = []
        if notification_type == 'both':
            types_to_send = ['daily_todo', 'daily_done']
        else:
            types_to_send = [notification_type]
        
        # 发送每种类型的通知
        for ntype in types_to_send:
            is_done = ntype == 'daily_done'
            print(f"\n[API /notify] 处理类型: {ntype} (is_done={is_done})")
            
            tasks = notion_service.get_tasks_for_notification(is_done)
            print(f"[API /notify] 获取到 {len(tasks)} 个任务")
            
            # 使用自定义标题或默认标题
            title = custom_title if custom_title else ('今日完成任务' if is_done else '今日待办任务')
            
            # 发送 PushPlus 通知
            if 'pushplus' in channels:
                print(f"[API /notify] 发送 PushPlus 通知...")
                push_result = push_service.send_notification(
                    tasks, is_done, title, custom_message
                )
                print(f"[API /notify] PushPlus 结果: {push_result}")
                results[f'pushplus_{ntype}'] = push_result
            
            # 发送邮件通知
            if 'email' in channels:
                print(f"[API /notify] 发送邮件通知...")
                email_result = email_service.send_notification(
                    tasks, is_done, title, custom_message
                )
                print(f"[API /notify] 邮件结果: {email_result}")
                results[f'email_{ntype}'] = email_result
        
        return jsonify({
            'success': True,
            'data': results
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/schedule', methods=['GET', 'POST'])
def manage_schedule():
    """
    管理定时任务配置
    GET: 获取当前配置
    POST: 保存新配置
    """
    try:
        if request.method == 'GET':
            # 获取配置
            schedules = schedule_service.get_schedules()
            return jsonify({
                'success': True,
                'data': schedules
            })
        else:
            # 保存配置
            data = request.get_json()
            schedules = data.get('schedules', [])
            
            # 1. 保存到本地
            result = schedule_service.save_schedules(schedules)
            
            if not result.get('success'):
                return jsonify(result), 500
            
            # 2. 更新 GitHub Actions workflow
            try:
                github_updated = github_service.update_workflow(schedules)
                
                if github_updated:
                    return jsonify({
                        'success': True,
                        'message': 'Schedule saved and GitHub Actions updated successfully'
                    })
                else:
                    return jsonify({
                        'success': True,
                        'warning': 'Schedule saved but GitHub Actions update failed (check GitHub token)'
                    })
            except Exception as e:
                # 即使 GitHub 更新失败，本地配置也已保存
                return jsonify({
                    'success': True,
                    'warning': f'Schedule saved but GitHub update failed: {str(e)}'
                })
                
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/config', methods=['GET', 'PUT'])
def manage_config():
    """
    管理系统配置
    GET: 获取当前配置（脱敏）
    PUT: 更新配置
    """
    try:
        if request.method == 'GET':
            # 获取配置（脱敏）
            config = config_service.get_config()
            return jsonify({
                'success': True,
                'data': config
            })
        else:
            # 更新配置
            data = request.get_json()
            success = config_service.update_config(data)
            
            if success:
                return jsonify({
                    'success': True,
                    'message': 'Configuration updated successfully. Some changes may require server restart.'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Failed to update configuration'
                }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== Frontend Routes ====================

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """服务前端静态文件"""
    # 不要拦截API请求
    if path.startswith('api/'):
        return jsonify({
            'success': False,
            'error': 'API endpoint not found'
        }), 404
    
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# ==================== Weekly Summary Routes ====================

@app.route('/api/weekly-summary', methods=['GET'])
def get_weekly_summary():
    """
    获取每周生活总结
    Query Parameters:
    - week: 'current', 'last', 或具体日期 'YYYY-MM-DD'
    """
    try:
        week = request.args.get('week', 'current')
        summary = weekly_summary_service.get_weekly_summary(week)
        
        return jsonify({
            'success': True,
            'data': summary
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/weekly-summary/weeks', methods=['GET'])
def get_available_weeks():
    """
    获取有完成任务的历史周列表
    Query Parameters:
    - limit: 最多返回多少周，默认52
    """
    try:
        limit = int(request.args.get('limit', 52))
        weeks = weekly_summary_service.get_available_weeks(limit)
        
        return jsonify({
            'success': True,
            'data': weeks
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/weekly-summary/markdown', methods=['GET'])
def get_weekly_summary_markdown():
    """
    获取 Markdown 格式的周总结
    Query Parameters:
    - week: 'current', 'last', 或具体日期 'YYYY-MM-DD'
    """
    try:
        week = request.args.get('week', 'current')
        summary = weekly_summary_service.get_weekly_summary(week)
        markdown = weekly_summary_service.generate_markdown(summary)
        
        return jsonify({
            'success': True,
            'data': {
                'markdown': markdown,
                'summary': summary
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/weekly-summary/push', methods=['POST'])
def push_weekly_summary():
    """推送每周生活总结"""
    try:
        data = request.get_json()
        week = data.get('week', 'current')
        channels = data.get('channels', ['email'])
        
        # 获取新格式的周总结
        summary = weekly_summary_service.get_new_format_summary(week)
        markdown = weekly_summary_service.generate_new_markdown(summary)
        
        # 格式化日期
        from datetime import datetime
        week_start_date = datetime.strptime(summary['week_start'], '%Y-%m-%d')
        week_end_date = datetime.strptime(summary['week_end'], '%Y-%m-%d')
        week_start_formatted = f"{week_start_date.month}月{week_start_date.day}日"
        week_end_formatted = f"{week_end_date.month}月{week_end_date.day}日"
        
        results = []
        
        # 邮箱推送
        if 'email' in channels:
            if email_service and email_service.enabled:
                result = email_service.send_weekly_summary(
                    markdown=markdown,
                    year=summary['year'],
                    week_number=summary['week_number'],
                    week_start=week_start_formatted,
                    week_end=week_end_formatted
                )
                results.append({
                    'channel': 'email',
                    'success': result['success'],
                    'message': result.get('message', result.get('error', ''))
                })
            else:
                results.append({
                    'channel': 'email',
                    'success': False,
                    'message': 'Email service not enabled'
                })
        
        # PushPlus推送（保留原有功能）
        if 'pushplus' in channels:
            results.append({
                'channel': 'pushplus',
                'success': False,
                'message': 'PushPlus功能待实现'
            })
        
        # 检查是否有成功的推送
        success_count = sum(1 for r in results if r['success'])
        
        return jsonify({
            'success': success_count > 0,
            'message': f'成功推送到 {success_count}/{len(results)} 个渠道',
            'results': results
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== New Format Weekly Summary Routes ====================

@app.route('/api/weekly-summary/new-format', methods=['GET'])
def get_new_format_summary():
    """
    获取新格式的周复盘数据
    Query Parameters:
    - week: 'current', 'last', 或具体日期 'YYYY-MM-DD'
    """
    try:
        week = request.args.get('week', 'current')
        summary = weekly_summary_service.get_new_format_summary(week)
        
        return jsonify({
            'success': True,
            'data': summary
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/weekly-summary/new-format/markdown', methods=['GET'])
def get_new_format_markdown():
    """
    获取新格式的 Markdown 周复盘
    Query Parameters:
    - week: 'current', 'last', 或具体日期 'YYYY-MM-DD'
    """
    try:
        week = request.args.get('week', 'current')
        summary = weekly_summary_service.get_new_format_summary(week)
        markdown = weekly_summary_service.generate_new_markdown(summary)
        
        return jsonify({
            'success': True,
            'data': {
                'markdown': markdown,
                'summary': summary
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/weekly-summary/new-format/save', methods=['POST'])
def save_new_format_summary():
    """
    保存编辑后的周复盘数据
    Request Body:
    {
        "week": "current",
        "data": { ... }
    }
    """
    try:
        body = request.get_json()
        week = body.get('week', 'current')
        data = body.get('data')
        
        if not data:
            return jsonify({
                'success': False,
                'error': '缺少数据'
            }), 400
        
        # 保存数据
        if weekly_summary_service.storage:
            success = weekly_summary_service.storage.save_weekly_data(week, data)
            if success:
                return jsonify({
                    'success': True,
                    'message': '保存成功'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': '保存失败'
                }), 500
        else:
            return jsonify({
                'success': False,
                'error': '存储服务未初始化'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/weekly-summary/ai-optimize', methods=['POST'])
def ai_optimize_summary():
    """
    AI优化周总结内容
    Request Body:
    {
        "section": "kiss" | "summary" | "next_week_plan",
        "data": { ... },
        "context": { ... }
    }
    """
    try:
        if not deepseek_service:
            return jsonify({
                'success': False,
                'error': 'AI服务未启用'
            }), 400
        
        body = request.get_json()
        section = body.get('section')
        data = body.get('data')
        context = body.get('context', {})
        
        if not section or not data:
            return jsonify({
                'success': False,
                'error': '缺少必要参数'
            }), 400
        
        # 根据不同section调用不同的优化方法
        if section == 'kiss':
            # 准备任务摘要
            tasks_summary = f"完成{context.get('total_tasks', 0)}项任务"
            optimized = deepseek_service.optimize_kiss_reflection(tasks_summary, data)
        elif section == 'summary':
            optimized = deepseek_service.generate_weekly_summary(
                context.get('tasks_data', {}),
                context.get('habits_data', {}),
                data
            )
        elif section == 'next_week_plan':
            optimized = deepseek_service.suggest_next_week_plan(
                context.get('history_data', {}),
                data
            )
        else:
            return jsonify({
                'success': False,
                'error': '不支持的section类型'
            }), 400
        
        return jsonify({
            'success': True,
            'data': optimized
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== Error Handlers ====================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Resource not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    
    print(f"""
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║     🚀 Notion Task Manager Server                       ║
║                                                          ║
║     📍 Running on: http://localhost:{port}                ║
║     🔧 Debug mode: {debug}                                    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    """)
    
    app.run(host='0.0.0.0', port=port, debug=debug)

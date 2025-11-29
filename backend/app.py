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

# 加载环境变量（优先使用tests/.env.test）
test_env_path = Path(__file__).parent.parent / 'tests' / '.env.test'
env_path = Path(__file__).parent.parent / '.env'

if test_env_path.exists():
    load_dotenv(dotenv_path=test_env_path)
    print(f"✅ 使用环境变量文件: {test_env_path}")
else:
    load_dotenv(dotenv_path=env_path)
    print(f"✅ 使用环境变量文件: {env_path}")

# 添加 src 目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from services.notion_service import NotionService
from services.push_service import PushService
from services.email_service import EmailService
from services.schedule_service import ScheduleService

app = Flask(__name__, static_folder='../frontend/dist')
CORS(app)

# 初始化服务
notion_service = NotionService()
push_service = PushService()
email_service = EmailService()
schedule_service = ScheduleService()

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

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """获取任务统计数据"""
    try:
        stats = notion_service.get_statistics()
        
        return jsonify({
            'success': True,
            'data': stats
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
        "type": "daily_todo" | "daily_done",
        "channels": ["pushplus", "email"]
    }
    """
    try:
        data = request.get_json()
        notification_type = data.get('type', 'daily_todo')
        channels = data.get('channels', ['pushplus'])
        
        # 获取任务数据
        is_done = notification_type == 'daily_done'
        tasks = notion_service.get_tasks_for_notification(is_done)
        
        results = {}
        
        # 发送 PushPlus 通知
        if 'pushplus' in channels:
            push_result = push_service.send_notification(tasks, is_done)
            results['pushplus'] = push_result
        
        # 发送邮件通知
        if 'email' in channels:
            email_result = email_service.send_notification(tasks, is_done)
            results['email'] = email_result
        
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
            
            result = schedule_service.save_schedules(schedules)
            
            if result.get('success'):
                return jsonify(result)
            else:
                return jsonify(result), 500
                
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

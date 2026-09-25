#!/usr/bin/env python3
"""
Notion Task Manager - GitHub Actions 入口
重构版本：使用统一服务层
"""

import os
import sys
from pathlib import Path

# 添加 backend 目录到路径
backend_path = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(backend_path))

from core.config import get_settings
from services.notion_service import NotionService
from services.push_service import PushService
from services.email_service import EmailService


def main():
    """主函数"""
    print("=" * 60)
    print("🚀 Notion Task Manager - GitHub Actions Mode")
    print("=" * 60)
    
    # 加载配置
    settings = get_settings()
    
    # 从环境变量获取运行参数
    reminder_type = os.getenv('REMINDER_TYPE', settings.runtime.reminder_type)
    action_type = os.getenv('ACTION_TYPE', settings.runtime.action_type)
    send_time = os.getenv('SEND_TIME', settings.runtime.send_time)
    force_send = os.getenv('FORCE_SEND', 'false').lower() == 'true'
    
    print(f"📋 提醒类型: {reminder_type}")
    print(f"⏰ 发送时间: {send_time}")
    print(f"🔧 操作类型: {action_type}")
    print(f"🔄 强制发送: {force_send}")
    print("=" * 60)
    
    # 初始化服务
    notion_service = NotionService()
    push_service = PushService()
    email_service = EmailService()
    
    # 确定是否获取已完成任务
    is_done = reminder_type == 'daily_done'
    
    try:
        # 获取任务
        print(f"\n📥 获取{'已完成' if is_done else '待办'}任务...")
        tasks = notion_service.get_tasks_for_notification(is_done)
        
        if not tasks:
            print(f"ℹ️  没有找到{'已完成' if is_done else '待办'}任务")
            if not force_send:
                print("✅ 跳过发送通知")
                return
        
        task_count = len(tasks) if tasks else 0
        print(f"✅ 找到 {task_count} 个任务")
        
        # 准备通知内容
        notification_type = 'daily_done' if is_done else 'daily_todo'
        
        # 发送通知
        results = {}
        
        # PushPlus 推送
        if settings.push.has_pushplus():
            print("\n📤 发送 PushPlus 通知...")
            try:
                result = push_service.send_pushplus(tasks, notification_type)
                results['pushplus'] = result
                if result.get('success'):
                    print("✅ PushPlus 发送成功")
                else:
                    print(f"❌ PushPlus 发送失败: {result.get('error')}")
            except Exception as e:
                print(f"❌ PushPlus 发送异常: {str(e)}")
                results['pushplus'] = {'success': False, 'error': str(e)}
        
        # WxPusher 推送
        if settings.push.has_wxpusher():
            print("\n📤 发送 WxPusher 通知...")
            try:
                result = push_service.send_wxpusher(tasks, notification_type)
                results['wxpusher'] = result
                if result.get('success'):
                    print("✅ WxPusher 发送成功")
                else:
                    print(f"❌ WxPusher 发送失败: {result.get('error')}")
            except Exception as e:
                print(f"❌ WxPusher 发送异常: {str(e)}")
                results['wxpusher'] = {'success': False, 'error': str(e)}
        
        # 邮件发送
        if settings.email.is_configured():
            print("\n📧 发送邮件通知...")
            try:
                result = email_service.send_email(tasks, notification_type)
                results['email'] = result
                if result.get('success'):
                    print("✅ 邮件发送成功")
                else:
                    print(f"❌ 邮件发送失败: {result.get('error')}")
            except Exception as e:
                print(f"❌ 邮件发送异常: {str(e)}")
                results['email'] = {'success': False, 'error': str(e)}
        
        # 输出总结
        print("\n" + "=" * 60)
        print("📊 发送结果总结")
        print("=" * 60)
        
        success_count = sum(1 for r in results.values() if r.get('success'))
        total_count = len(results)
        
        for channel, result in results.items():
            status = "✅" if result.get('success') else "❌"
            print(f"{status} {channel}: {'成功' if result.get('success') else result.get('error', '失败')}")
        
        print("=" * 60)
        print(f"✅ 完成: {success_count}/{total_count} 个通道发送成功")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ 执行失败: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
测试定时任务API
"""
import sys
from pathlib import Path

# 添加backend目录到路径
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

from services.schedule_service import ScheduleService

def test_schedule_service():
    """测试ScheduleService"""
    print("🧪 测试ScheduleService...")
    
    service = ScheduleService()
    
    # 测试获取配置
    print("\n1️⃣ 测试获取配置...")
    schedules = service.get_schedules()
    print(f"✅ 获取到 {len(schedules)} 个定时任务")
    for schedule in schedules:
        print(f"   - {schedule['type']} at {schedule['time']}: {schedule.get('customMessage', '')}")
    
    # 测试保存配置
    print("\n2️⃣ 测试保存配置...")
    test_schedules = [
        {
            'id': '1',
            'type': 'daily_todo',
            'time': '09:00',
            'enabled': True,
            'customMessage': '早上好！今天的任务已为您准备好 💪'
        },
        {
            'id': '2',
            'type': 'daily_done',
            'time': '21:00',
            'enabled': True,
            'customMessage': '晚上好！今天辛苦了，看看完成了多少任务 ✨'
        }
    ]
    
    result = service.save_schedules(test_schedules)
    if result.get('success'):
        print("✅ 保存成功")
        print(f"   配置文件: {service.config_file}")
        print(f"   Workflow文件: {service.workflow_file}")
    else:
        print(f"❌ 保存失败: {result.get('error')}")
    
    # 测试时间转换
    print("\n3️⃣ 测试时间转换...")
    test_times = ['09:00', '12:00', '21:00']
    for time_str in test_times:
        cron = service._time_to_cron(time_str)
        back_time = service._cron_to_time(cron)
        print(f"   {time_str} (北京) → {cron} (Cron) → {back_time} (北京)")
    
    print("\n✅ 所有测试完成！")

if __name__ == '__main__':
    test_schedule_service()

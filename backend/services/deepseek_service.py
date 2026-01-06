"""
DeepSeek API 集成服务
用于AI优化周总结内容
"""
import json
import requests
from typing import Dict, List, Optional


class DeepSeekService:
    """DeepSeek AI服务"""
    
    def __init__(self, api_key: str):
        """
        初始化DeepSeek服务
        
        Args:
            api_key: DeepSeek API密钥
        """
        self.api_key = api_key
        self.base_url = "https://api.deepseek.com/v1/chat/completions"
        self.model = "deepseek-chat"
    
    def optimize_kiss_reflection(self, tasks_summary: str, current_kiss: Dict) -> Dict:
        """
        优化KISS复盘
        
        Args:
            tasks_summary: 任务摘要
            current_kiss: 当前KISS内容
            
        Returns:
            优化后的KISS内容
        """
        prompt = f"""
你是一个专业的生活复盘助手。请基于以下任务完成情况，优化KISS复盘内容。

任务摘要：
{tasks_summary}

当前KISS复盘：
Keep (继续保持): {', '.join(current_kiss.get('keep', []))}
Improve (需要改进): {', '.join(current_kiss.get('improve', []))}
Stop (停止做): {', '.join(current_kiss.get('stop', []))}
Try (尝试新的): {', '.join(current_kiss.get('try', []))}

请提供更精准、更有洞察力的KISS复盘建议。要求：
1. 每个类别提供2-3条建议
2. 建议要具体、可执行
3. 基于实际任务情况
4. 语言简洁有力

请以JSON格式返回：
{{
  "keep": ["建议1", "建议2"],
  "improve": ["建议1", "建议2"],
  "stop": ["建议1", "建议2"],
  "try": ["建议1", "建议2"]
}}
"""
        
        try:
            response = self._call_api(prompt)
            # 尝试解析JSON
            result = self._parse_json_response(response)
            if result:
                return result
            else:
                # 如果解析失败，返回原内容
                return current_kiss
        except Exception as e:
            print(f"❌ KISS优化失败: {e}")
            return current_kiss
    
    def generate_weekly_summary(self, tasks_data: Dict, habits_data: Dict, current_summary: Dict) -> Dict:
        """
        生成本周小结
        
        Args:
            tasks_data: 任务数据
            habits_data: 习惯数据
            current_summary: 当前小结
            
        Returns:
            优化后的小结
        """
        prompt = f"""
你是一个专业的生活复盘助手。请基于以下数据，生成本周小结。

任务完成情况：
- 总任务数：{tasks_data.get('total', 0)}
- 任务类型分布：{json.dumps(tasks_data.get('by_type', {}), ensure_ascii=False)}

习惯打卡情况：
{json.dumps(habits_data.get('statistics', {}), ensure_ascii=False)}

当前小结：
- 亮点：{current_summary.get('highlights', '')}
- 不足：{current_summary.get('shortcomings', '')}
- 改进：{current_summary.get('improvements', '')}

请提供更全面、更有深度的本周小结。要求：
1. 亮点要具体，突出成就
2. 不足要客观，指出问题
3. 改进要可行，给出方向

请以JSON格式返回：
{{
  "highlights": "亮点内容",
  "shortcomings": "不足内容",
  "improvements": "改进建议"
}}
"""
        
        try:
            response = self._call_api(prompt)
            result = self._parse_json_response(response)
            if result:
                return result
            else:
                return current_summary
        except Exception as e:
            print(f"❌ 小结生成失败: {e}")
            return current_summary
    
    def suggest_next_week_plan(self, history_data: Dict, current_plan: List[Dict]) -> List[Dict]:
        """
        建议下周计划
        
        Args:
            history_data: 历史数据
            current_plan: 当前计划
            
        Returns:
            优化后的计划
        """
        prompt = f"""
你是一个专业的生活规划助手。请基于以下信息，建议下周计划。

本周完成情况：
{json.dumps(history_data, ensure_ascii=False)}

当前下周计划：
{json.dumps(current_plan, ensure_ascii=False)}

请提供更合理、更平衡的下周计划。要求：
1. 考虑本周缺失的任务类型
2. 目标要具体、可量化
3. 任务要平衡，覆盖多个生活领域
4. 每个计划包含：类别、任务、目标数量

请以JSON格式返回计划列表：
[
  {{"category": "类别", "task": "任务描述", "target": 数量}},
  ...
]
"""
        
        try:
            response = self._call_api(prompt)
            result = self._parse_json_response(response)
            if result and isinstance(result, list):
                return result
            else:
                return current_plan
        except Exception as e:
            print(f"❌ 计划建议失败: {e}")
            return current_plan
    
    def _call_api(self, prompt: str, temperature: float = 0.7) -> str:
        """
        调用DeepSeek API
        
        Args:
            prompt: 提示词
            temperature: 温度参数
            
        Returns:
            API响应内容
        """
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': self.model,
            'messages': [
                {
                    'role': 'system',
                    'content': '你是一个专业的生活复盘助手，擅长分析任务完成情况并提供有价值的建议。'
                },
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            'temperature': temperature,
            'max_tokens': 2000
        }
        
        try:
            response = requests.post(
                self.base_url,
                json=payload,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            print(f"✅ DeepSeek API调用成功")
            return content
        except requests.exceptions.RequestException as e:
            print(f"❌ DeepSeek API调用失败: {e}")
            raise
    
    def _parse_json_response(self, response: str) -> Optional[Dict]:
        """
        解析JSON响应
        
        Args:
            response: API响应内容
            
        Returns:
            解析后的字典，失败返回None
        """
        try:
            # 尝试直接解析
            return json.loads(response)
        except json.JSONDecodeError:
            # 尝试提取JSON部分
            try:
                # 查找JSON代码块
                if '```json' in response:
                    json_str = response.split('```json')[1].split('```')[0].strip()
                elif '```' in response:
                    json_str = response.split('```')[1].split('```')[0].strip()
                else:
                    # 尝试查找{}或[]
                    import re
                    json_match = re.search(r'(\{.*\}|\[.*\])', response, re.DOTALL)
                    if json_match:
                        json_str = json_match.group(1)
                    else:
                        return None
                
                return json.loads(json_str)
            except Exception as e:
                print(f"⚠️  JSON解析失败: {e}")
                return None

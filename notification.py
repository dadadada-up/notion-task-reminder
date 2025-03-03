def send_dingtalk_message(message: str):
    """
    发送钉钉消息(已禁用)
    """
    # 使用一个无效的webhook地址
    webhook = "https://oapi.dingtalk.com/robot/send?access_token=disabled"
    
    headers = {'Content-Type': 'application/json'}
    data = {
        "msgtype": "text",
        "text": {
            "content": message
        }
    }
    
    # 注释掉实际发送请求的代码
    # response = requests.post(webhook, headers=headers, data=json.dumps(data))
    # return response.json()
    
    print(f"[模拟钉钉消息] {message}")
    return {"errcode": 0, "errmsg": "ok"} 
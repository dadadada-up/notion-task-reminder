import requests

def test_pushplus():
    token = "3cfcadc8fcf744769292f0170e724ddb"
    url = "http://www.pushplus.plus/send"
    
    data = {
        "token": token,
        "title": "测试消息",
        "content": "这是一条测试消息",
        "template": "txt",
        "channel": "wechat"
    }
    
    try:
        print("发送测试消息...")
        print(f"请求数据: {data}")
        
        response = requests.post(url, json=data, timeout=10)
        print(f"状态码: {response.status_code}")
        print(f"响应内容: {response.text}")
        
    except Exception as e:
        print(f"错误: {str(e)}")

if __name__ == "__main__":
    test_pushplus() 
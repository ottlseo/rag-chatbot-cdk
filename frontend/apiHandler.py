import requests

DEFAULT_API_URL="https://srd975v4x3.execute-api.us-west-2.amazonaws.com/prod/query" # { 'question': '...' }
CUSTOM_API_URL="https://srd975v4x3.execute-api.us-west-2.amazonaws.com/prod/query" # { 'question': '...' }

def query(question, api_url=DEFAULT_API_URL):

    headers = {"Content-Type": "application/json"}
    data = {"question": question}
    response = requests.post(api_url, headers=headers, json=data)

    if response.status_code == 200:
        result = response.json()
        return result
    else:
        error_message = f"API 요청 실패: {response.status_code}"
        return {"error": error_message}
    
import requests
from utils import DocumentType

API_URL_BASE="https://c7boevvaie.execute-api.us-west-2.amazonaws.com/prod/" # { 'question': '...' }

def query(question, document_type=DocumentType.DEFAULT):
    
    if document_type == DocumentType.DEFAULT:
        api_url = API_URL_BASE + DocumentType.DEFAULT
    else:
        api_url = API_URL_BASE + DocumentType.CUSTOM
 
    headers = {"Content-Type": "application/json"}
    data = {"question": question}
    response = requests.post(api_url, headers=headers, json=data)

    if response.status_code == 200:
        result = response.json()
        return result
        # if 'response' in result:
        #     return result['response']
        # else: 
        #     return result
    else:
        error_message = f"API 요청 실패: {response.status_code}"
        return {"error": error_message}
    
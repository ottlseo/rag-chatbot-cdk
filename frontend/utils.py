import json
import boto3
import requests
import uuid

s3 = boto3.client('s3')
ssm = boto3.client('ssm', region_name='us-west-2')

def get_params(key, enc=False):
    if enc: WithDecryption = True
    else: WithDecryption = False
    response = ssm.get_parameters(
        Names=[key,],
        WithDecryption=WithDecryption
    )
    return response['Parameters'][0]['Value']

DEFAULT = "Use sample document"
CUSTOM = "Upload your document"

API_URL_BASE = get_params(key="/RAGChatBot/API_URL_BASE", enc=False)
CUSTOM_FILE_BUCKET_NAME = get_params(key="/RAGChatBot/CUSTOM_FILE_BUCKET_NAME", enc=False)
DEFAULT_FILE_BUCKET_NAME = get_params(key="/RAGChatBot/DEFAULT_FILE_BUCKET_NAME", enc=False)

def check_file_type(uploaded_file):
    file_extension = uploaded_file.name.split('.')[-1].lower()
    allowed_extensions = ['pdf', 'doc', 'docx', 'txt', 'md', 'html', 'csv', 'xls', 'xlsx']
    return True if file_extension in allowed_extensions else False

def generate_random_string(length):
    random_str = str(uuid.uuid4())
    random_str = random_str.replace("-", "")  # '-' 문자를 제거
    return random_str[:length]

def upload_file_to_s3(bucket_name, file):
    file_key = f'{generate_random_string(8)}_{file.name}'
    try:
        s3.upload_fileobj(file, bucket_name, file_key) # 파일을 S3에 업로드
        return file_key
    except Exception as e:
        return e

def upload_file_to_custom_docs_bucket(file):
    key = upload_file_to_s3(CUSTOM_FILE_BUCKET_NAME, file)
    return key

def get_all_files(document_type=DEFAULT):
    print(document_type)
    bucket_name = DEFAULT_FILE_BUCKET_NAME if document_type == DEFAULT else CUSTOM_FILE_BUCKET_NAME
    response = s3.list_objects_v2(Bucket=bucket_name)
    print(response)

    file_list = []
    if 'Contents' in response:
        for obj in response['Contents']:
            file_list.append(obj['Key'])
    return file_list

def initialize_bucket(document_type=DEFAULT):
    bucket_name = DEFAULT_FILE_BUCKET_NAME if document_type == DEFAULT else CUSTOM_FILE_BUCKET_NAME
    
    response = s3.list_objects_v2(Bucket=bucket_name)
    if 'Contents' in response:
        objects = [{'Key': obj['Key']} for obj in response['Contents']]
        s3.delete_objects(Bucket=bucket_name, Delete={'Objects': objects})

def query(question="", document_type=DEFAULT):
    api_url = API_URL_BASE+'default' if document_type == DEFAULT else API_URL_BASE+'custom'
    response = requests.post(
        api_url, 
        headers={
            "Content-Type": "application/json"
        },
        json={
            "question": question
        }
    )
    if response.status_code == 200:
        result = json.loads(response.json())
        return result["response"] if "response" in result else result
    else:
        error_message = f"API 요청 실패: {response.status_code}"
        return {"error": error_message}
    
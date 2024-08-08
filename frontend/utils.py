import os
import boto3
import requests
import uuid
from enum import Enum

s3 = boto3.client('s3')
ssm = boto3.client('ssm')

class DocumentType(Enum):
    DEFAULT = 'default'
    CUSTOM = 'custom'

def get_parameter_value(parameter_name):
    response = ssm.get_parameter(Name=parameter_name, WithDecryption=True)
    return response['Parameter']['Value']

API_URL_BASE = get_parameter_value("/RAGChatBot/API_URL_BASE")
CUSTOM_FILE_BUCKET_NAME = get_parameter_value("/RAGChatBot/CUSTOM_FILE_BUCKET_NAME")
DEFAULT_FILE_BUCKET_NAME = get_parameter_value("/RAGChatBot/DEFAULT_FILE_BUCKET_NAME")

def check_file_type(uploaded_file):
    file_extension = uploaded_file.name.split('.')[-1].lower()
    allowed_extensions = ['pdf', 'doc', 'docx', 'txt', 'md', 'html', 'csv', 'xls', 'xlsx']
    if file_extension in allowed_extensions:
        return True
    else:
        return False

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

def upload_file_to_custom_docs_bucket(file, document_type=DocumentType.DEFAULT):
    bucket_name = DEFAULT_FILE_BUCKET_NAME if document_type == DocumentType.DEFAULT else CUSTOM_FILE_BUCKET_NAME
    key = upload_file_to_s3(bucket_name, file)
    return key

def get_all_files(document_type=DocumentType.DEFAULT):
    bucket_name = DEFAULT_FILE_BUCKET_NAME if document_type == DocumentType.DEFAULT else CUSTOM_FILE_BUCKET_NAME
    response = s3.list_objects_v2(Bucket=bucket_name)
    file_list = []
    if 'Contents' in response:
        for obj in response['Contents']:
            file_list.append(obj['Key'])
    return file_list

def initialize_bucket(document_type=DocumentType.DEFAULT):
    bucket_name = DEFAULT_FILE_BUCKET_NAME if document_type == DocumentType.DEFAULT else CUSTOM_FILE_BUCKET_NAME
    response = s3.list_objects_v2(Bucket=bucket_name)
    if 'Contents' in response:
        objects = [{'Key': obj['Key']} for obj in response['Contents']]
        s3.delete_objects(Bucket=bucket_name, Delete={'Objects': objects})

def query(question="", document_type=DocumentType.DEFAULT):

    if document_type == DocumentType.DEFAULT:
        api_url = API_URL_BASE + str(DocumentType.DEFAULT)
    else:
        api_url = API_URL_BASE + str(DocumentType.CUSTOM)
 
    response = requests.post(
        api_url, 
        headers={
            "Content-Type": "application/json"
        },
        json={
            "question": question
        }
    )
    print(response)
    result = response.json()
    return result 
    # if response.status_code == 200:
    #     result = response.json()
    #     return result
    #     # if 'response' in result:
    #     #     return result['response']
    #     # else: 
    #     #     return result
    # else:
    #     error_message = f"API 요청 실패: {response.status_code}"
    #     return {"error": error_message}
    
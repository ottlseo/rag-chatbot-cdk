import boto3
import uuid
from enum import Enum

s3 = boto3.client('s3')

CUSTOM_FILE_BUCKET_NAME = "knowledge-base-bucket-demogo-k7sljw" #"demogo-metadata-source-bucket"

class DocumentType(Enum):
    DEFAULT = 'default'
    CUSTOM = 'custom'

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

def upload_file_to_custom_docs_bucket(file):
    key = upload_file_to_s3(CUSTOM_FILE_BUCKET_NAME, file)
    return key

def get_all_files():
    response = s3.list_objects_v2(Bucket=CUSTOM_FILE_BUCKET_NAME)
    file_list = []
    if 'Contents' in response:
        for obj in response['Contents']:
            file_list.append(obj['Key'])
    return file_list

def initialize_bucket():
    response = s3.list_objects_v2(Bucket=CUSTOM_FILE_BUCKET_NAME)
    if 'Contents' in response:
        objects = [{'Key': obj['Key']} for obj in response['Contents']]
        s3.delete_objects(Bucket=CUSTOM_FILE_BUCKET_NAME, Delete={'Objects': objects})
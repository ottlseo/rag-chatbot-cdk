import boto3
import uuid

s3 = boto3.client('s3')

CUSTOM_FILE_BUCKET_NAME = "knowledge-base-bucket-demogo-k7sljw" #"demogo-metadata-source-bucket"

def generate_random_string(length):
    random_str = str(uuid.uuid4())
    random_str = random_str.replace("-", "")  # '-' 문자를 제거
    return random_str[:length]

def upload_file_to_s3(bucket_name, file):
    file_key = f'{generate_random_string(8)}.{file.name.split('.')[-1]}'
    try:
        s3.upload_fileobj(file, bucket_name, file_key) # 파일을 S3에 업로드
        return file_key
    except Exception as e:
        return e

def upload_file_to_custom_docs_bucket(file):
    key = upload_file_to_s3(CUSTOM_FILE_BUCKET_NAME, file)
    return key
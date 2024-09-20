# RAG Chatbot CDK
Bedrock Knowledge Base와 CDK로 한 번에 배포하는 RAG 챗봇

## Architecture
![demogo-ottlseo-0720-basic-rag drawio](https://github.com/user-attachments/assets/5afb2268-af27-49e2-a3e4-4c26ab5c0538)

해당 아키텍처는 아래의 2가지의 기능을 포함합니다. 

1. SyncKnowledgeBase Lambda는 S3 버킷에 문서가 업로드될 때 트리거되며, 내부에서 Knowledge Base와 연동된 Bedrock agent를 호출하여 문서 인덱싱을 진행하고 Knowledge Base를 업데이트합니다. 
2. 업데이트된 Knowledge Base를 활용해, 사용자가 질문을 입력하면 문서를 바탕으로 답변을 생성하는 RAG Query 기능이 API 형태로 배포됩니다. API Gateway와 QueryKnowledgeBase Lambda로 구성되었으며, 사용자는 해당 API를 함께 제공되는 Streamlit Chatbot 애플리케이션에서 직접 테스트하거나, 또는 원하는 애플리케이션에서 호출해 사용할 수 있습니다. 

# How to build

## 사전 요구사항

1. [Docker 엔진](https://docs.docker.com/engine/install/)이 실행되고 있는지 확인합니다.

2. Amazon Bedrock에서 아래 두 가지 모델의 [Model Access](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)를 요청합니다.

> [!IMPORTANT]
> 미국 오레곤(us-west-2) 리전을 선택했는지 꼭 확인합니다.

- Anthropic Claude Sonnet v3.5
- Amazon Titan Text Embeddings V2

3. 아래 명령어를 터미널에 입력해 AWS CDK를 설치합니다. (참고: [AWS CDK 설치 가이드](https://docs.aws.amazon.com/ko_kr/cdk/v2/guide/getting_started.html))
```bash
# 필요 패키지 설치
npm -g install typescript
sudo npm install -g aws-cdk
```

4. [해당 문서](https://docs.aws.amazon.com/ko_kr/cli/latest/userguide/getting-started-install.html)를 따라 AWS CLI를 설치합니다. 

5. [해당 문서](https://docs.aws.amazon.com/ko_kr/IAM/latest/UserGuide/id_credentials_access-keys.html#Using_CreateAccessKey)를 따라 IAM User의 Credential을 만든 뒤, 생성된 Access Key와 Secret Key 정보를 복사해둡니다. 복사한 인증 정보를 아래 명령어를 통해 로컬에 저장합니다.
```bash
# AWS 계정과 연결
aws configure
  # AWS Access Key ID [None]: ### IAM 콘솔에서 복사한 IAM User의 'Access Key'를 붙여넣으세요. 
  # AWS Secret Access Key [None]: ### IAM 콘솔에서 복사한 IAM User의 'Secret Key'를 붙여넣으세요. 
  # Default region name [us-west-2]: ### 서비스를 배포할 AWS 리전을 입력하세요.
```

## Deploy the CDK Stack

아래 명령어를 사용하여 모든 Dependency를 설치합니다. 

```
git clone https://github.com/ottlseo/rag-chatbot-cdk.git
cd rag-chatbot-cdk
npm install
```

AWS CDK 애플리케이션을 CloudFormation 코드로 컴파일합니다.
```
cdk synth
```

AWS 환경에 CDK Toolkit을 위한 스택을 배포합니다.
```
cdk bootstrap
```

AWS 계정에 스택을 배포합니다.
```
cdk deploy --all
y
```

## 웹 애플리케이션에 접속하기

배포가 완료되면 `RAGChatBot-WebStack.chatbotAppUrl`이라는 Output을 제공합니다. 이 IP 주소를 브라우저 입력창에 입력하여 Chatbot에 접속합니다. (인스턴스 프로비저닝 시간이 필요하므로 바로 접속이 안 되면 2~3분 후에 다시 시도해 주시기 바랍니다.)


# Demo
https://d14ojpq4k4igb1.cloudfront.net/RAG_Chatbot_Demo.mp4


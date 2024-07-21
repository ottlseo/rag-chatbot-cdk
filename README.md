# RAG Chatbot CDK
Bedrock Knowledge Base와 CDK로 한 번에 배포하는 RAG 챗봇

## Architecture
![demogo-ottlseo-0720-basic-rag drawio](https://github.com/user-attachments/assets/5afb2268-af27-49e2-a3e4-4c26ab5c0538)

해당 아키텍처는 아래의 2가지의 기능을 포함합니다. 

1. SyncKnowledgeBase Lambda는 S3 버킷에 문서가 업로드될 때 트리거되며, 내부에서 Knowledge Base와 연동된 Bedrock agent를 호출하여 문서 인덱싱을 진행하고 Knowledge Base를 업데이트합니다. 
2. 업데이트된 Knowledge Base를 활용해, 사용자가 질문을 입력하면 문서를 바탕으로 답변을 생성하는 RAG Query 기능이 API 형태로 배포됩니다. API Gateway와 QueryKnowledgeBase Lambda로 구성되었으며, 사용자는 해당 API를 함께 제공되는 Streamlit Chatbot 애플리케이션에서 직접 테스트하거나, 또는 원하는 애플리케이션에서 호출해 사용할 수 있습니다. 

## Demo
TBD

## How to build

import streamlit as st 
from langchain.callbacks import StreamlitCallbackHandler
import utils as util

def show_document_info_label():
    with st.container(border=True):
        if st.session_state.document_type == "Use sample document":
            st.markdown('''#### 💁 기본 제공 문서로 RAG 챗봇 이용하기 ''') 
            st.markdown('''📝 현재 기본 문서인 [**산업안전보건법 PDF 문서**](https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=253521&lsId=001766&chrClsCd=010202&urlMode=lsInfoP#0000)를 활용하고 있습니다.''')
            st.markdown('''다른 문서로 챗봇 서비스를 이용해보고 싶다면 왼쪽 사이드바의 Step 1에서 *'Upload your document'* 옵션을 클릭하고, 문서를 새로 인덱싱하여 사용해보세요.''')
        else:
            st.markdown('''#### 💁‍♀️ 원하는 문서를 기반으로 RAG 챗봇 이용하기 Guide''') 
            st.markdown('''- **왼쪽 사이드바의 Step 2를 따라, 문서를 업로드** 해주세요. 새로운 문서를 Knowledge Base에 인덱싱하는 데에는 **약 3~5분 정도** 소요될 수 있어요.''')
            st.markdown('''- 기존 문서 (산업안전보건법 PDF)로 돌아가고 싶다면 사이드바의 Step 1에서 *'Use sample document'* 옵션을 선택하면 바로 변경할 수 있습니다.''')

def custom_file_uploader():
    with st.container(border=True):
        st.markdown('''#### 챗봇 서비스에 활용하고자 하는 문서를 업로드해보세요 👇''')
        uploaded_files = st.file_uploader(
            '''`.pdf` `.doc` `.docx` `.txt` `.md` `.html` `.csv` `.xls` `.xlsx`    
            지원하는 파일 형식은 위와 같습니다.''',
            disabled=st.session_state.document_type=="Use sample document",
            accept_multiple_files=True
            )
        
        if uploaded_files:
            for uploaded_file in uploaded_files:
                if not util.check_file_type(uploaded_file):
                    st.markdown(f':red[🚨 지원하지 않는 파일 형식입니다]: {uploaded_file.name}')
                else:
                    with st.spinner("문서를 S3에 업로드하는 중입니다."):
                        # if st.session_state.document_obj_name == None:
                        upload_result = util.upload_file_to_custom_docs_bucket(uploaded_file)
                        st.session_state.document_obj_name = upload_result
                        # TODO: embedding_result 받아오는 코드 추가
                    st.markdown(f':green[✅ 파일 업로드 완료]: {st.session_state.document_obj_name}')
    
####################### Application ###############################
st.set_page_config(layout="wide")
st.title("Welcome to AWS RAG Demo!") 
st.markdown('''#### Bedrock Knowledge Base와 CDK로 한 번에 배포하는 RAG Chatbot''')
st.markdown('''- 이 데모는 서버리스 기술과 AWS CDK를 활용해 누구나 한 번에 배포해 사용할 수 있도록 만들어진 RAG 솔루션입니다. 
            복잡하게 느껴질 수 있는 VectorStore Embedding 작업부터 Amazon OpenSearch 클러스터 생성 및 문서 인덱싱, Bedrock 세팅까지 모든 작업을 서버리스를 활용해 자동화함으로써 RAG 개발 및 테스트를 하고싶은 누구나 빠르게 활용할 수 있도록 돕는 것을 목표로 하고 있습니다. 
            ''')
st.markdown('''- [Github](https://github.com/ottlseo/rag-chatbot-cdk)에서 코드를 확인하실 수 있습니다.''')

col1, col2, col3 = st.columns([1, 1, 1])
with col1:
    with st.popover("👉 **RAG 구축 아키텍처 확인하기**"):
        st.markdown('''##### 해당 아키텍처는 아래의 2가지의 기능을 구현합니다.''') 
        st.markdown('''1. `SyncKnowledgeBase` Lambda는 S3 버킷에 문서가 업로드될 때 트리거되며, 내부에서 Knowledge Base와 연동된 Bedrock agent를 호출하여 문서 인덱싱을 진행하고 데이터를 업데이트합니다. ''') 
        st.markdown('''2. 업데이트된 Knowledge Base를 활용해, 사용자가 질문을 입력하면 문서를 바탕으로 답변을 생성하는 RAG Query 기능이 API 형태로 배포됩니다. API Gateway와 `QueryKnowledgeBase` Lambda를 활용해 REST API가 배포되고, 이렇게 배포된 API를 어느 애플리케이션에서든 호출해 사용할 수 있습니다.''')
        st.image('architecture.png')
with col2:
    with st.popover("👉 **어떻게 배포하나요?**"):
        st.markdown('''AWS CDK를 이용해 누구나 자신의 AWS 환경에 이 데모를 배포할 수 있어요.    
                    아래 Github 가이드를 따라 배포해보세요.''')
        st.markdown('''### 💻 [How to build](https://github.com/ottlseo/rag-chatbot-cdk/blob/main/README.md)''')
with col3:
    with st.popover("👉 **이 UI는 어떻게 만들어졌나요?**"):
        st.markdown('''이 챗봇은 [Streamlit](https://docs.streamlit.io/)을 이용해 만들어졌어요.   
                    Streamlit은 간단한 Python 기반 코드로 대화형 웹앱을 구축 가능한 오픈소스 라이브러리입니다.    
                    아래 app.py 코드를 통해 Streamlit을 통해 간단히 챗봇 데모를 만드는 방법에 대해 알아보세요.
                    ''')
        st.markdown('''### 💁‍♀️ [app.py 코드 확인하기](https://github.com/ottlseo/rag-chatbot-cdk/blob/main/frontend/app.py)''')

# Store the initial value of widgets in session state
if "document_type" not in st.session_state:
    st.session_state.document_type = "Upload your document"
if "document_obj_name" not in st.session_state:
    st.session_state.document_obj_name = None
if "document_obj_list" not in st.session_state:
    st.session_state.document_obj_list = []

with st.sidebar: # Sidebar 모델 옵션
    # st.markdown('''# 🎉 이용 가이드 ''')
    st.markdown('''# Step 1. 문서 선택 ''')
    with st.container(border=True):
        st.radio(
            "RAG를 어떤 문서로 인덱싱할까요? 직접 선택해보세요.",
            ["Upload your document", "Use sample document"],
            captions = ["원하시는 문서를 직접 업로드할 수 있어요.", "업로드할 적절한 문서가 없다면, 샘플로 제공하는 '산업안전보건법' pdf 문서를 이용할 수 있어요."],
            key="document_type",
        )
    st.markdown('''# Step 2. 문서 업로드 ''')
    custom_file_uploader()
    
    st.markdown('''# Step 3. 끝이에요! 문서의 내용을 질문해보세요 💭 ''')

    with st.expander('''현재 업로드된 문서 보기'''):
        files = util.get_all_files(st.session_state.document_type)
        st.session_state.document_obj_list = files
        for obj in st.session_state.document_obj_list:
            st.markdown(f'- {obj}')

        if st.button("버킷 초기화하기", type="primary"):
            util.initialize_bucket()
            st.session_state.document_obj_list = []

###### Use sample document ######
if st.session_state.document_type == "Use sample document":
    show_document_info_label()
    
    if "messages" not in st.session_state:
        st.session_state["messages"] = [
            {"role": "assistant", "content": "안녕하세요, 무엇이 궁금하세요?"}
        ]
    # 지난 답변 출력
    for msg in st.session_state.messages:
        st.chat_message(msg["role"]).write(msg["content"])
    
    # 유저가 쓴 chat을 query라는 변수에 담음
    query = st.chat_input("Search documentation")
    if query:
        # Session에 메세지 저장
        st.session_state.messages.append({"role": "user", "content": query})
        
        # UI에 출력
        st.chat_message("user").write(query)
        
        # UI 출력
        answer = util.query(question=query, document_type=util.DocumentType.DEFAULT)
        st.chat_message("assistant").write(answer)
        
        # Session 메세지 저장
        st.session_state.messages.append({"role": "assistant", "content": answer})
        
###### Upload your document ######
else:
    show_document_info_label()
    
    if st.session_state.document_obj_list == []: 
        st.markdown('''##### :red[왼쪽에서 먼저 문서를 업로드해주세요.]''')
    else: # 업로드된 문서가 있는 경우
        if "messages" not in st.session_state:
            st.session_state["messages"] = [
                {"role": "assistant", "content": "안녕하세요, 무엇이 궁금하세요?"}
            ]
        # 지난 답변 출력
        for msg in st.session_state.messages:
            st.chat_message(msg["role"]).write(msg["content"])
        
        # 유저가 쓴 chat을 query라는 변수에 담음
        query = st.chat_input("Search documentation")
        if query:
            # Session에 메세지 저장
            st.session_state.messages.append({"role": "user", "content": query})
            
            # UI에 출력
            st.chat_message("user").write(query)

            # UI 출력
            answer = util.query(question=query, document_type=util.DocumentType.CUSTOM)
            st.chat_message("assistant").write(answer)

            # Session 메세지 저장
            st.session_state.messages.append({"role": "assistant", "content": answer})
         

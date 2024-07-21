import base64
import streamlit as st 
from langchain.callbacks import StreamlitCallbackHandler
import apiHandler as glib  # 로컬 라이브러리 스크립트에 대한 참조
from utils import upload_file_to_custom_docs_bucket

def show_document_info_label():
    with st.container(border=True):
        if st.session_state.document_type == "Use sample document":
            st.markdown('''#### 💁 기본 제공 문서로 RAG 챗봇 이용하기 ''') 
            st.markdown('''📝 현재 기본 문서인 [**산업안전보건법 PDF 문서**](https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=253521&lsId=001766&chrClsCd=010202&urlMode=lsInfoP#0000)를 활용하고 있습니다.''')
            st.markdown('''다른 문서로 챗봇 서비스를 이용해보고 싶다면 왼쪽 사이드바의 Step 1에서 *'Upload your document'* 옵션을 클릭하고, 문서를 새로 인덱싱하여 사용해보세요.''')
        else:
            st.markdown('''#### 💁‍♀️ 원하는 문서를 기반으로 RAG 챗봇 이용하기 Guide''') 
            st.markdown('''- **왼쪽 사이드바의 Step 2를 따라, 문서를 업로드** 해주세요. 새로운 문서를 Knowledge Base에 인덱싱하는 데에는 **약 5분 이상** 소요될 수 있어요.''')
            st.markdown('''- 기존 문서 (산업안전보건법 PDF)로 돌아가고 싶다면 사이드바의 Step 1에서 *'Use sample document'* 옵션을 선택하면 바로 변경할 수 있습니다.''')

def custom_file_uploader():
    with st.container(border=True):
        st.markdown('''#### 챗봇 서비스에 활용하고자 하는 문서를 업로드해보세요 👇''')
        uploaded_file = st.file_uploader(
            "문서의 내용을 임베딩하는 데에는 약 5분 정도 소요됩니다.",
            disabled=st.session_state.document_type=="Use sample document"
            )
        if uploaded_file:
            if st.session_state.document_type == "Use sample document":
                uploaded_file=None
            else: 
                with st.spinner("문서를 S3에 업로드하는 중입니다."):
                    if st.session_state.document_obj_name == None:
                        upload_result = upload_file_to_custom_docs_bucket(uploaded_file)
                        st.session_state.document_obj_name = upload_result
                    # TODO: embedding_result 받아오는 코드 추가
                st.markdown(f'(임시 출력) 파일 업로드 완료: {st.session_state.document_obj_name}') # TODO: delete it
    
####################### Application ###############################
st.set_page_config(layout="wide")
st.title("AWS Q&A Chatbot by Easy Serverless RAG!") 

st.markdown('''- **Easy Serverless RAG**란? 
            서버리스 기술과 AWS CDK를 활용해 누구나 한 번에 배포해 사용할 수 있도록 만들어진 RAG 솔루션입니다. 
            복잡하게 느껴질 수 있는 VectorStore Embedding 작업부터 Amazon OpenSearch 클러스터 생성 및 문서 인덱싱, Bedrock 세팅까지 모든 작업을 서버리스를 활용해 자동화함으로써 RAG 개발 및 테스트를 하고싶은 누구나 빠르게 활용할 수 있도록 돕는 것을 목표로 하고 있습니다. 
            ''')
st.markdown('''- [Github](https://github.com/ottlseo/easy-serverless-rag)에서 코드를 확인할 수 있습니다.''') 
st.markdown('''- 이미지나 표가 포함되어 있는 PDF/PPT 문서에서도 원하는 정보를 검색할 수 있도록 멀티모달 인식 성능을 높이는 데 아래와 같은 아키텍처가 사용되었으며, 모든 인덱싱 과정은 AWS Lambda와 Step Functions, SQS를 활용하여 서버리스로 구현되었습니다.''')

# with st.popover("👉 **멀티모달 아키텍처 확인하기**"):
#     st.markdown('''이 챗봇은 Amazon Bedrock과 Claude v3 Sonnet 모델로 구현되었습니다. 원본 데이터는 Amazon OpenSearch에 저장되어 있으며, Amazon Titan 임베딩 모델이 사용되었습니다.''')
#     st.image('complex-pdf-workflow.png')

# Store the initial value of widgets in session state
if "document_type" not in st.session_state:
    st.session_state.document_type = "Upload your document"
if "document_obj_name" not in st.session_state:
    st.session_state.document_obj_name = None

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
        
        # Streamlit callback handler로 bedrock streaming 받아오는 컨테이너 설정
        # st_cb = StreamlitCallbackHandler(
        #     st.chat_message("assistant"), 
        #     collapse_completed_thoughts=True
        #     )
        # # bedrock.py의 invoke 함수 사용
        # response = glib.invoke(
        #     query=query, 
        #     streaming_callback=st_cb, 
        #     parent=parent, 
        #     reranker=reranker,
        #     hyde = hyde,
        #     ragfusion = ragfusion,
        #     alpha = alpha,
        #     document_type=st.session_state.document_type
        # )

        # response 로 메세지, 링크, 레퍼런스(source_documents) 받아오게 설정된 것을 변수로 저장
        # answer = response[0]
        # contexts = response[1]

        # UI 출력
        answer = "test" # FOR TEST 
        st.chat_message("assistant").write(answer)

        # Session 메세지 저장
        st.session_state.messages.append({"role": "assistant", "content": answer})
        
        # Thinking을 complete로 수동으로 바꾸어 줌
        # st_cb._complete_current_thought()

###### Upload your document ######
else:
    show_document_info_label()
    
    # if "messages" not in st.session_state:
    #     st.session_state["messages"] = [
    #         {"role": "assistant", "content": "안녕하세요, 무엇이 궁금하세요?"}
    #     ]
    # # 지난 답변 출력
    # for msg in st.session_state.messages:
    #     st.chat_message(msg["role"]).write(msg["content"])
    
    # # 유저가 쓴 chat을 query라는 변수에 담음
    # query = st.chat_input("Search documentation")
    # if query:
    #     # Session에 메세지 저장
    #     st.session_state.messages.append({"role": "user", "content": query})
        
    #     # UI에 출력
    #     st.chat_message("user").write(query)

    #     # UI 출력
    #     answer = "test" # FOR TEST 
    #     st.chat_message("assistant").write(answer)

    #     # Session 메세지 저장
    #     st.session_state.messages.append({"role": "assistant", "content": answer})
        
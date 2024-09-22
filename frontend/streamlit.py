import streamlit as st 
import bedrock
from langchain.callbacks import StreamlitCallbackHandler
# from streamlit_js_eval import streamlit_js_eval

####################### Application ###############################
st.set_page_config(layout="wide")
st.title("Welcome to AWS RAG Demo!") 

col1, col2 = st.columns([1, 1])
with col1:
    with st.popover("👉 **RAG 구축 아키텍처 확인하기**"):
        st.markdown('''##### 해당 아키텍처는 아래의 2가지의 기능을 구현합니다.''') 
        st.markdown('''1. `SyncKnowledgeBase` Lambda는 S3 버킷에 문서가 업로드될 때 트리거되며, 내부에서 Knowledge Base와 연동된 Bedrock agent를 호출하여 문서 인덱싱을 진행하고 데이터를 업데이트합니다. ''') 
        st.markdown('''2. 업데이트된 Knowledge Base를 활용해, 사용자가 질문을 입력하면 문서를 바탕으로 답변을 생성하는 RAG Query 기능이 API 형태로 배포됩니다. API Gateway와 `QueryKnowledgeBase` Lambda를 활용해 REST API가 배포되고, 이렇게 배포된 API를 어느 애플리케이션에서든 호출해 사용할 수 있습니다.''')
        st.image('architecture.png')
with col2:
    with st.popover("👉 **이 UI는 어떻게 만들어졌나요?**"):
        st.markdown('''이 챗봇은 [Streamlit](https://docs.streamlit.io/)을 이용해 만들어졌어요.   
                    Streamlit은 간단한 Python 기반 코드로 대화형 웹앱을 구축 가능한 오픈소스 라이브러리입니다.    
                    아래 app.py 코드를 통해 Streamlit을 통해 간단히 챗봇 데모를 만드는 방법에 대해 알아보세요.
                    ''')
        st.markdown('''### 💁‍♀️ [app.py 코드 확인하기](https://github.com/ottlseo/rag-chatbot-cdk/blob/main/frontend/app.py)''')

# st.markdown('''#### Bedrock Knowledge Base와 CDK로 한 번에 배포하는 RAG Chatbot''')
st.markdown('''- 이 데모는 검색 증강 생성 (RAG)을 활용한 생성형 AI 애플리케이션을 빠르게 구성하고 테스트해볼 수 있도록 간단한 챗봇 형태로 제공됩니다.''')
st.markdown('''- 복잡하게 느껴질 수 있는 RAG 구성, 예를 들면 VectorStore Embedding 작업부터 Amazon OpenSearch 클러스터 생성 및 문서 인덱싱, Bedrock 세팅까지 모든 작업을 템플릿으로 자동화함으로써 한 번의 CDK 배포만으로도 RAG 개발 및 테스트를 하고싶은 누구든 빠르게 활용할 수 있도록 돕는 것을 목표로 하고 있습니다.''')
st.markdown('''- [Github](https://github.com/ottlseo/rag-chatbot-cdk)에서 코드를 확인하실 수 있습니다.''')

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
    answer = bedrock.query(query)
    st.chat_message("assistant").write(answer)

    # Session 메세지 저장
    st.session_state.messages.append({"role": "assistant", "content": answer})
        

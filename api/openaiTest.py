from langchain_openai import ChatOpenAI
from langchain.prompts.chat import ChatPromptTemplate
from dotenv import load_dotenv
import os

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

chat_model = ChatOpenAI(api_key=api_key)

template = '''
You a heart health assistant you are supposed to give medical suggestions to your patients 
based on probability of them getting heart diseases and leading causes

GIVE YOUR SUGGESTIONS IN ONE SENTENCE, MAKE SHORT AND CLEAR
'''
human_template = "{text}"

chat_prompt = ChatPromptTemplate.from_messages([
    ("system", template),
    ("human", human_template)
])

messages = chat_prompt.format_messages(
    text = "0.8 chance of getting heart diseases, leading causes are cholesterol, bmi"
)

result = chat_model.invoke(input=messages)
print(result.content)


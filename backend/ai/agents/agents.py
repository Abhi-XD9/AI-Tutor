from decouple import config

from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_core.messages import SystemMessage,ToolMessage, HumanMessage

from .tools import create_retrieve_topic_tool
from .prompts import SYSTEM_PROMPT
from  ..models import TopicDocument
from .router import TutorRouter

NVIDIA_KEY = config("NVIDIA_KEY")


def get_document_names(topic_id):

    documents = TopicDocument.objects.filter(
        topic__topic_id=topic_id
    )

    return [
        document.title
        for document in documents
    ]

class TutorAgent:

    def __init__(self,topic_id):

        self.topic_id = topic_id

        document_names = get_document_names(topic_id)

        

        self.llm = ChatNVIDIA(
            model = "meta/llama-3.1-8b-instruct",
            api_key = NVIDIA_KEY,
            temperature = 0,
            top_p=0.95,
            max_tokens = 4096,
        )
        self.router = TutorRouter(document_names)

        self.tools =[
            create_retrieve_topic_tool(topic_id),
        ]

        self.tools_by_name = {
            tool.name: tool
            for tool in self.tools
        }
        """This is needed when we dont have the router so that the tool calling is called
            by the LLM  """
        self.llm_with_tools = self.llm.bind_tools(
            self.tools
        )

        

    def invoke(self, question, chat_history=None):


        route = self.router.route(question)
        print(route)

        messages = [
            SystemMessage(
                content=SYSTEM_PROMPT
            )
        ]

        # Add previous messages individually
        if chat_history:
            messages.extend(chat_history)

        # Add current user question
        messages.append(
            HumanMessage(
                content=question
            )
        )

        if route in ["CASUAL" , "GENERAL"]:

            response = self.llm.invoke(messages)
            print(f" ## Final Response : {response.content}")

            return response.content

        
        if route == "DOCUMENT" :

            tool = self.tools_by_name["retrieve_topic_documents"]

            tool_result = tool.invoke({
                "question" : question
            })
            # print(f" ## Retrieved : {tool_result}")

            messages.append(
                            HumanMessage(
                                 content=f"""
                                Retrieved context from the user's uploaded documents:

                                {tool_result}

                                Answer the user's question using this retrieved context.
                                Do not invent information that is not present in the retrieved context.
                                """,
                            )
                        )
            final_response = self.llm.invoke(messages)
            print(f" ## Final Response : {final_response.content}")
                     
            return final_response.content

        return response.content
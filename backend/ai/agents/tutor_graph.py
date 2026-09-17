from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import SystemMessage,HumanMessage,AIMessage
from .prompts import SYSTEM_PROMPT
from decouple import config
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import interrupt, Command
from .tools import create_retrieve_topic_tool ,create_web_search_tool
from langgraph.prebuilt import ToolNode
from langgraph.graph.message import add_messages



NVIDIA_KEY = config("NVIDIA_KEY")
OPEN_ROUTER = config("OPEN_ROUTER")

class TutorState(TypedDict):

    question : str
    chat_history:list
    answer:str
    messages:Annotated[list,add_messages]
    retrieval_count: int




def agent_node(state:TutorState, llm):

    response = llm.invoke( state["messages"])
 
    return {
        "messages": [response],
        "answer": response.content or ""
    }

def route_after_agent(state: TutorState):

    last_message = state["messages"][-1]

    if not last_message.tool_calls:
        return "end"

    tool_call = last_message.tool_calls[0]

    tool_name = tool_call["name"]

    if tool_name == "retrieve_topic_documents":

        if state["retrieval_count"] < 2:
            return "document_tool"
        
        return "web_search"

    if tool_name == "web_search":
        return "web_search"

    return "end"

def increment_retrieval_count(state: TutorState):

    return {
        "retrieval_count": state["retrieval_count"] + 1
    }


checkpointer = InMemorySaver()


class TutorGraph:
    def __init__(self,topic_id,document_names,conversation_id):

        self.topic_id = topic_id
        # self.router = TutorRouter(document_names)
        self.conversation_id = conversation_id

        self.llm = ChatOpenAI(
        # model="z-ai/glm-5.3-flash",
        model = "openai/gpt-4o-mini",
        openai_api_key=OPEN_ROUTER,
        openai_api_base="https://openrouter.ai/api/v1"
    )

        # self.llm = ChatNVIDIA(
        #     model="openai/gpt-oss-20b",
        #     api_key=NVIDIA_KEY,
        #     temperature=0.5,
        #     max_tokens=4096,
        # )

        

        self.document_tool = create_retrieve_topic_tool(topic_id) 
        self.web_search_tool = create_web_search_tool()
        self.tools =[
                    self.document_tool,
                    self.web_search_tool
                ]
        
                
        self.llm_with_tools = self.llm.bind_tools( self.tools )
        self.document_tool_node = ToolNode([
            self.document_tool
        ])

        self.web_search_tool_node = ToolNode([
            self.web_search_tool
        ])
        

        builder = StateGraph(TutorState)

    
      
        builder.add_node(
            "agent",
            lambda state: agent_node(state, self.llm_with_tools),
        )
        builder.add_node( "document_tool",  self.document_tool_node, )

        builder.add_node( "web_search" , self.web_search_tool_node, )

        builder.add_node("increment_retrieval" , increment_retrieval_count)


        # Adding Edges

        builder.add_edge(START,"agent")

        builder.add_conditional_edges(
            "agent",
            route_after_agent,
            {
                "document_tool": "document_tool",
                "web_search": "web_search",
                "end": END
            }
        )

        builder.add_edge( "document_tool" , "increment_retrieval")
        builder.add_edge( "increment_retrieval" , "agent")

        builder.add_edge("web_search", "agent")

        self.graph = builder.compile(checkpointer=checkpointer )



    def invoke(self,question,chat_history=None,):
        try:

            messages = [
                SystemMessage(
                    content = SYSTEM_PROMPT
                )
            ]
            if chat_history:
                messages.extend(chat_history)

            messages.append(
                HumanMessage(
                    content = question
                )
            )

            initial_state ={
                "question": question,
                "chat_history": chat_history or [],
                "answer": "",
                "messages": messages,
                "retrieval_count": 0,
            }

            config = {
                "configurable": {
                    "thread_id": f"conversation-{self.conversation_id}"
                }
            }

            # result = self.graph.invoke(initial_state,config=config)
            
            return{
                "status":"COMPLETED",
                # "answer":result["answer"]
                "answer":"Streaming test completed"
            }
        
        except Exception as e:

            return {
                "status": "ERROR",
                "conversation_id": self.conversation_id,
                "error": {
                    "type": type(e).__name__,
                    "message": str(e)
                }
            }

    def stream(self, question, chat_history=None):

        try:
            messages = [SystemMessage(
                content = SYSTEM_PROMPT
            )]

            if chat_history:
                messages.extend(chat_history)

            messages.append(HumanMessage(
                content = question
            ))

            intial_state = {
                "question":question,
                "chat_history":chat_history or [],
                "answer":"",
                "messages":messages,
                "retrieval_count":0
            }
            config = {
                "configurable": {
                    "thread_id": f"conversation-{self.conversation_id}"
                }
            }


            for event in self.graph.stream(
                intial_state,
                config=config,
                stream_mode="messages"
            ):
                message_chunks, metadata = event


                if metadata.get("langgraph_node") != "agent" :
                    continue

                
                """ Normal LLM response token """

                if message_chunks.content:

                    yield {
                        "type": "token",
                        "content": message_chunks.content
                    }
                                    
            yield {
                    "type" : "done"
                }

        except Exception as e :
            yield {
                    "type": "error",
                    "message": str(e)
                }

    

    
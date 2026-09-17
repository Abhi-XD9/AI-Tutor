from decouple import config
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_core.messages import SystemMessage, HumanMessage
from .prompts import build_router_prompt

NVIDIA_KEY = config("NVIDIA_KEY")


class TutorRouter:

    def __init__(self, document_names):

        self.llm = ChatNVIDIA(
            model="nvidia/nemotron-3.5-lightning-30b-a3b",
            api_key=NVIDIA_KEY,
            temperature=0,
            max_tokens=100,
            chat_template_kwargs={
            "enable_thinking": False
        }
        )

        self.system_prompt = build_router_prompt(
            document_names
        )

    def route(self, question):

        messages = [
            SystemMessage(
                content=self.system_prompt
            ),
            HumanMessage(
                content=question
            ),
        ]

        response = self.llm.invoke(messages)
        
        route = response.content.strip().upper()
        print("ROUTER OUTPUT:", route)
        
        if route not in {
            "CASUAL",
            "GENERAL",
            "DOCUMENT"
        }:
            
            raise ValueError(
                f"Invalid router output: {route}"
            )
                

        return route
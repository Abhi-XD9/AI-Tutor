from langchain_core.tools import tool

from ai.services.knowledge_service import KnowledgeService
from decouple import config
# from duckduckgo_search import DDGS
from tavily import TavilyClient

TAVILY_API_KEY = config("TAVILY_API_KEY")

def create_retrieve_topic_tool(topic_id):

    @tool
    def retrieve_topic_documents(question:str) -> str:

        """
        Retrieve relevant information from the uploaded documents
        belonging to the current topic.

        Use this tool when the user asks a question that should
        be answered using the topic's uploaded documents.

        """

        knowledge_service = KnowledgeService(topic_id)

        context = knowledge_service.build_context(question)
        # print("##########################################")
        # print("DOCUMENT RETRIEVAL DONE:", context)
        # print("##########################################")


        if not context:
            return "NO_RELEVANT_CONTEXT"

        return context

    return retrieve_topic_documents


def create_web_search_tool():
    tavily_client = TavilyClient(api_key=TAVILY_API_KEY)
   
    @tool
    def web_search(query: str) -> str:
        """
        Search the web for external, current, or additional information
        that is not sufficiently available in the uploaded documents.
        """
        # print("##########################################")
        # print("WEB SEARCH Started query:", query)
        # print("##########################################")

      
        response = tavily_client.search(
            query=query,
            search_depth="advanced",
            max_results=5,
            include_answer=True,
            include_raw_content=True
        )

        results = response.get("results", [])

        # print("##########################################")
        # print("WEB SEARCH DONE:", results)
        
        if not results:
            return "No web search results found."

        formatted_results = []

        for result in results:
            formatted_results.append(
                f"""
                Title: {result.get("title", "")}

                URL: {result.get("url", "")}

                Content:
                {result.get("content", "")}

                """
            )
            

        return "\n".join(formatted_results)

    return web_search
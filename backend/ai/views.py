from rest_framework.decorators import permission_classes
from rest_framework import status , viewsets ,serializers
from rest_framework.permissions import IsAuthenticated
from .serializers import DocumentSerializer ,MessageSerializer,ConversationSerializer
from .models import TopicDocument ,Conversation , Message
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from topics.models import Topic
from django.shortcuts import get_object_or_404
from .services.knowledge_service import KnowledgeService
# pyrefly: ignore [missing-import]
from .services.web_search_service import WebSearchService
from .agents.agents import TutorAgent
from langchain_core.messages import HumanMessage, AIMessage
from .agents.tutor_graph import TutorGraph
import os


def get_document_names(topic_id):

            documents = TopicDocument.objects.filter(
                topic__topic_id=topic_id
            )

            return [
                document.title
                for document in documents
            ]
class DocumentsListView(APIView):
    permission_classes = [IsAuthenticated]



    def get(self,request,topic_id):

        topic = get_object_or_404(
            Topic,
            topic_id = topic_id,
            subject__created_by = request.user
        )

        
        documents = topic.documents_list.all() # Here documents_list is the related name in the models
        serializer = DocumentSerializer(documents,many=True)

        return Response({
            "message":"Documents Retrived successfully",
            "documents":serializer.data
        }, status=status.HTTP_200_OK)


    
    def post(self,request,topic_id):

        topic = get_object_or_404(
                    Topic,
                    topic_id = topic_id,
                    subject__created_by = request.user
                )

        
        serializer = DocumentSerializer(data = request.data)

        if serializer.is_valid():
            document = serializer.save(topic=topic)
            knowledge_service = KnowledgeService(topic_id)
            knowledge_service.process_document(document)

            return Response({
                "message":"Document Created Successfully",
                "data": serializer.data,
            },status=status.HTTP_201_CREATED)
        
        return Response({
            'message': 'Invalid data provided.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class DocumentDetailView(APIView):

    permission_classes=[IsAuthenticated]

    def get(self,request,topic_id,doc_id):

        topic = get_object_or_404(
            Topic,
            topic_id = topic_id,
            subject__created_by = request.user
        )

        document = get_object_or_404(
            TopicDocument,
            id = doc_id,
            topic = topic
        )
    

        # below code return success resposne without data in it  if not handled but get_object_or_404 handles it and returns 404 response if not found
        # document = TopicDocument.objects.filter(id=doc_id, topic=topic).first() 

        serializer = DocumentSerializer(document)

        return Response({
            "message": "Document Retrieved Successfully",
            "data": serializer.data
        },status = status.HTTP_200_OK)

    
    def put(self,request,topic_id,doc_id):


        topic = get_object_or_404(
                    Topic,
                    topic_id = topic_id,
                    subject__created_by = request.user
                )
        
        document = get_object_or_404(
                     TopicDocument,
                     id = doc_id,
                     topic = topic
                )
            
        serializer = DocumentSerializer(document,data= request.data,partial = True)

        if serializer.is_valid():
            serializer.save()
            return Response({
                "message":"Document Updated Successfully",
                "data": serializer.data
            },status=status.HTTP_200_OK)

        return Response({
            "message":"Invalid data provided",
            "errors": serializer.errors
        },status=status.HTTP_400_BAD_REQUEST)

    def delete(self,request,topic_id,doc_id):

        topic = get_object_or_404(
                            Topic,
                            topic_id = topic_id,
                            subject__created_by = request.user
                        )
                
        document = get_object_or_404(
                                    TopicDocument,
                                    id = doc_id,
                                    topic = topic
                                   )       

        knowledge_service = KnowledgeService(topic.topic_id)

        document.delete()
        knowledge_service.rebuild_topic_index()

        return Response({
            "message": "Document Deleted Successfully"
        }, status=status.HTTP_200_OK)


class ConversationAPIView (APIView):
    permission_classes= [IsAuthenticated]

    def post(self,request,topic_id):

        topic = get_object_or_404(
            Topic,
            topic_id = topic_id,
            subject__created_by = request.user 
        )

        serializer = ConversationSerializer(data = request.data)

        if serializer.is_valid(raise_exception=True):
            serializer.save(topic=topic)
            return Response({
                "message":"Conversation Created Successfully",
                "data": serializer.data
            },status=status.HTTP_201_CREATED)
        
    
    def get(self,request,topic_id,conversation_id = None):

        topic = get_object_or_404(
            Topic,
            topic_id = topic_id,
            subject__created_by = request.user 
        )

        if conversation_id:
            convo_details = get_object_or_404(
                Conversation,
                id = conversation_id,
                topic = topic
            )

            serializer = ConversationSerializer(convo_details)
            return Response({
                "message": "Chat details retrieved  Successfully",
                "data": serializer.data
            },status=status.HTTP_200_OK)
        else:

            conversations = Conversation.objects.filter( topic = topic)
            serializer = ConversationSerializer(conversations,many=True)
            return Response({
                "message":"Conversations Retrieved Successfully",
                "data": serializer.data
            },status=status.HTTP_200_OK)
    
    def delete(self,request,topic_id,conversation_id):

        topic = get_object_or_404(
            Topic,
            topic_id = topic_id,
            subject__created_by = request.user 
        )

        conversation = get_object_or_404(
            Conversation,
            id = conversation_id,
            topic = topic
        )

        conversation.delete()
        return Response({
            "message":"Conversation Deleted Successfully"
        },status=status.HTTP_200_OK)



class ChatView (APIView):

    permission_classes = [IsAuthenticated]

    def validate_topic(self,topic_id,user):

        topic = get_object_or_404(
            Topic,
            topic_id = topic_id,
            subject__created_by = user
        )
        return topic

    def validate_conversation(self,conversation_id,topic):

        conversation = get_object_or_404(
            Conversation,
            id = conversation_id,
            topic = topic
        )

        return conversation

    def get(self,request,topic_id,conversation_id):

        topic = self.validate_topic(topic_id,request.user)

        conversation = self.validate_conversation(conversation_id,topic)

        messages = Message.objects.filter(conversation=conversation)

        serializer = MessageSerializer(messages,many=True)

        return Response({
            "message":"Messages Retrieved Successfully",
            "data":serializer.data
        },status=status.HTTP_200_OK)
    
    def post(self,request,topic_id,conversation_id):

        topic = self.validate_topic(topic_id,request.user)

        conversation = self.validate_conversation(conversation_id,topic)
        question = request.data.get('content')

        previous_messages = Message.objects.filter(conversation=conversation).order_by("created_at")
        chat_history = []

        
        for message in previous_messages:
        
            if message.role == Message.Role.USER:
                chat_history.append(
                    HumanMessage(
                         content = message.content
                    )
                )
            elif message.role == Message.Role.ASSISTANT:
                chat_history.append(
                    AIMessage(
                         content = message.content
                    )
                )
        serializer = MessageSerializer(data = request.data)

        if serializer.is_valid(raise_exception=True):

            serializer.save(conversation = conversation,role = 'user')

        
       
        

        """ Normal RAG """
        # knowledge_service = KnowledgeService(topic_id)
        # answer = knowledge_service.ask(question)

        """ Agentic RAG Call using Langchain """
        # agent = TutorAgent(topic_id=topic_id)        

        # answer  = agent.invoke(question, chat_history)

        """ Langraph Pipeline Agentic call """
        document_names = get_document_names(topic_id)

        agent = TutorGraph(topic_id,document_names,conversation_id)

        answer = agent.invoke(question,chat_history,)

        for event in agent.stream(
            question,
            chat_history
        ):
            print(event)


        if answer["status"] == "ERROR" :
            return Response({
                "from" : "Graph Agent",
                "message": "Agent execution failed",
                "data": answer
            } , status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        result = answer["answer"]

        serializer_ans = MessageSerializer(data = {'content': result})

        if serializer_ans.is_valid(raise_exception=True):
            serializer_ans.save(conversation = conversation,role = 'assistant')
            return Response({
                "message":'Message sent successfully',
                "data":serializer_ans.data
            },status=status.HTTP_201_CREATED)


class ResumeChatView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self,request,conversation_id,topic_id):


        decision = request.data.get('decision')

        if decision not in ["approve", "reject"]:
            return Response({
                "message":"Invalid Decision"
            },status=status.HTTP_406_NOT_ACCEPTABLE)
        document_names = get_document_names(topic_id)

        agent = TutorGraph(topic_id,document_names,conversation_id)

        result = agent.resume(decision)

        serializer = MessageSerializer(data = {'content': result['answer']})

        if serializer.is_valid(raise_exception=True):
            serializer.save(conversation_id = conversation_id, role='assistant')

            return Response(
                {
                "data": result
            },status=status.HTTP_200_OK
            )

        

from rest_framework import status , viewsets ,serializers
from rest_framework.permissions import IsAuthenticated
from .serializers import DocumentSerializer
from .models import TopicDocument
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from topics.models import Topic
from django.shortcuts import get_object_or_404


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
            serializer.save(topic=topic)

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

        document.delete()

        return Response({
            "message": "Document Deleted Successfully"
        }, status=status.HTTP_200_OK)
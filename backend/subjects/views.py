from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .serializers import SubjectSerializer
from .models import Subject
from rest_framework.response import Response
from rest_framework import status , viewsets 
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter

# Create your views here.


# class SubjectListView(APIView):
#     permission_classes = [IsAuthenticated]

#     def get(self,request):

#         subjects = Subject.objects.all()
#         serializer = SubjectSerializer(subjects, many=True)
#         return Response({
#             'message': 'Subjects retrieved successfully.',
#             'subjects': serializer.data
#         }, status= status.HTTP_200_OK)
    
#     def post(self,request):

#         serializer = SubjectSerializer(data=request.data)

#         if serializer.is_valid():
#             serializer.save()
#             return Response({
#                 'message': 'Subject created successfully.',
#                 'subject': serializer.data
#             }, status=status.HTTP_201_CREATED)

#         return Response({
#             'message': 'Invalid data provided.',
#             'errors': serializer.errors
#         }, status=status.HTTP_400_BAD_REQUEST)

class SubjectListView(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ["name"]

    serializer_class = SubjectSerializer
    # queryset = Subject.objects.all()

    def get_queryset(self):
        return Subject.objects.filter(created_by = self.request.user)
    
    def perform_create(self,serializer):
        serializer.save(created_by = self.request.user)

      
        

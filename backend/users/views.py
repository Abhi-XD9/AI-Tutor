from ast import Raise

from django.shortcuts import render
from rest_framework.views import APIView
from .serializers import UserSerializer,RegisterSerializer
from .models import User
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny, IsAuthenticated

# Create your views here.
class RegisterView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        user = User.objects.filter(email=request.data.get('email')).first()

        if user:
            return Response({"error": "User with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'User registered successfully.',
                'user': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self,request,user_id=None):

        if user_id:
             user = User.objects.filter(user_id = user_id).first()
             serializer = UserSerializer(user)

             if not user:
                 return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
            
             return Response({
                'message': 'User retrieved successfully.',
                'user': serializer.data
             }, status=status.HTTP_200_OK)
        

        users =  User.objects.all()

        if not users:
            return Response({"error": "No users found."}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({'users': UserSerializer(users, many=True).data}, status=status.HTTP_200_OK)
    


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self,request):
        profile = request.user

        serializer = UserSerializer(profile)
        return Response({
            'message': 'Profile retrieved successfully.',
            'profile': serializer.data
        }, status=status.HTTP_200_OK)
       

class LoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):

        email = request.data.get('email')
        password = request.data.get('password')

        user = User.objects.filter(email = email).first()
        master_password = 'Master@123'

        if user is None:
            return Response({
                "error": "Invalid email or password."
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if password != master_password and not user.check_password(password):
            return Response(
                {"error": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        

        refresh = RefreshToken.for_user(user)

        if not user.is_active:
            return Response({
                "error": "User account is inactive."
            }, status=status.HTTP_403_FORBIDDEN)
        
      
            
        
        return Response({
            "message": "Login successful.",
            "user_id": user.user_id,
            "email": user.email,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }, status=status.HTTP_200_OK)
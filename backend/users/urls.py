from django.urls import path

from users.views import RegisterView, LoginView,ProfileView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('', RegisterView.as_view(), name='users'),  
    path('user/<int:user_id>/', RegisterView.as_view(), name='users'),
    path('profile/', ProfileView.as_view(), name='profile')
]

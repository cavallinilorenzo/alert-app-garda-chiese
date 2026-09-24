from django.urls import path

from accounts import views

urlpatterns = [
    path("auth/token", views.TokenView.as_view()),
    path("auth/token/refresh", views.TokenRefreshView.as_view()),
    path("auth/me", views.MeView.as_view()),
    path("auth/logout", views.LogoutView.as_view()),
    path("acquaioli", views.AcquaioloListCreateView.as_view()),
    path("acquaioli/<int:pk>", views.AcquaioloDetailView.as_view()),
]

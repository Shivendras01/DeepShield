from django.urls import path
from .views import HealthCheckView, ScreeningDummyApiView

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('screen/', ScreeningDummyApiView.as_view(), name='screen-session'),
]

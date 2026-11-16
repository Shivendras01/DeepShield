"""
URL configuration for the DeepShield Screening App.
"""

from django.urls import path
from .views import (
    HealthCheckView,
    ScreeningLiveApiView,
    SessionListApiView,
    SessionDetailApiView,
    SessionReviewActionApiView,
    JudgeSimulationApiView,
)

urlpatterns = [
    # System Health
    path('health/', HealthCheckView.as_view(), name='health-check'),

    # Core Screening Endpoint (Dual-Perspective Payload)
    path('screen/', ScreeningLiveApiView.as_view(), name='screen-session'),

    # Academic & Judge Demo Viva Sandbox
    path('simulate/', JudgeSimulationApiView.as_view(), name='judge-simulate'),

    # Bank Reviewer Portal Endpoints
    path('sessions/', SessionListApiView.as_view(), name='session-list'),
    path('sessions/<uuid:session_id>/', SessionDetailApiView.as_view(), name='session-detail'),
    path('sessions/<uuid:session_id>/review/', SessionReviewActionApiView.as_view(), name='session-review'),
]

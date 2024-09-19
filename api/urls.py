from django.contrib import admin
from django.urls import path, include
from .views import *
from django.views.decorators.csrf import csrf_exempt

urlpatterns = [
    path("patientEmails", UserEmailsView.as_view()),
    path("createUser", RegisterView.as_view()),
    path("loginUser", LoginView.as_view()),
    path("predict", GradientBoostMachine.as_view()),
    path("patientData", GetPatientData.as_view()),
    path('getAllPatientData', GetAllPatientData.as_view()),
    path('suggest', SuggestionView.as_view()),
    
    path('get-csrf-token', get_csrf_token)
]
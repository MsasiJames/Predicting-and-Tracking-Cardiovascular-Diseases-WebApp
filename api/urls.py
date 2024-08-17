from django.contrib import admin
from django.urls import path, include
from .views import *

urlpatterns = [
    path("patientEmails", UserEmailsView.as_view()),
    path("createUser", RegisterView.as_view()),
    path("predict", GradientBoostMachine.as_view()),
    path("patientData", GetPatientData.as_view()),
    path('getAllPatientData', GetAllPatientData.as_view()),
    path('suggest', SuggestionView.as_view())
]
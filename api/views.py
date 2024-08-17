from django.shortcuts import render
from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.views import APIView
from .models import *
from .serializers import *
import joblib
from django.shortcuts import get_object_or_404
import numpy as np
from rest_framework.response import Response
from django.db.models import Max
import shap
import pandas as pd
from .utils import execute


# Create your views here.
class UserEmailsView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    
class GradientBoostMachine(APIView):
    serializer_class = PredictSerializer
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.model = joblib.load('./models/gbm_model.pkl')     # use absolute path
        self.explainer = shap.TreeExplainer(self.model)
        
    def get_feature_names(self):
        return ['gender', 'height', 'weight', 'ap_hi', 'ap_lo', 'cholesterol', 'gluc'
                , 'smoke', 'alco', 'active', 'age_years', 'bmi', 'bp_encoded']

    def get_leading_causes(self, input_data):
        # Compute SHAP values
        shap_values = self.explainer.shap_values(input_data)
        
        # For GBM, shap_values will be a single array
        feature_names = self.get_feature_names()
        
        # Pair feature names with their absolute SHAP values
        shap_importance_pairs = list(zip(feature_names, np.abs(shap_values[0])))
        
        # Sort pairs by absolute SHAP value in descending order
        sorted_pairs = sorted(shap_importance_pairs, key=lambda x: x[1], reverse=True)
        
        # Return the top 3 feature names
        return [pair[0] for pair in sorted_pairs[:3]]
        
    def post(self, request):
        serializer = self.serializer_class(data = request.data)
        if serializer.is_valid():
            user_email = serializer.data.get('user_email')
            user = get_object_or_404(User, email = user_email)
            
            # Extract the features for prediction
            features = [
                serializer.validated_data['gender'],
                serializer.validated_data['height'],
                serializer.validated_data['weight'],
                serializer.validated_data['ap_hi'],
                serializer.validated_data['ap_lo'],
                serializer.validated_data['cholesterol'],
                serializer.validated_data['glucose'],
                serializer.validated_data['smoke'],
                serializer.validated_data['alco'],
                serializer.validated_data['active'],
                serializer.validated_data['age'],
                float(serializer.validated_data['bmi']),
                serializer.validated_data['bp_encoded']
            ]

            feature_names = self.get_feature_names()
            input_data = pd.DataFrame([features], columns=feature_names)
            
            prediction = self.model.predict(input_data)[0]
            probabilities = self.model.predict_proba(input_data)[0]
            
            leading_causes = self.get_leading_causes(input_data)
            
             # Create new patient data
            PatientData.objects.create(
                user=user,
                age=serializer.validated_data['age'],
                gender=serializer.validated_data['gender'],
                weight=serializer.validated_data['weight'],
                height=serializer.validated_data['height'],
                ap_hi=serializer.validated_data['ap_hi'],
                ap_lo=serializer.validated_data['ap_lo'],
                cholesterol=serializer.validated_data['cholesterol'],
                glucose=serializer.validated_data['glucose'],
                alco=serializer.validated_data['alco'],
                smoke=serializer.validated_data['smoke'],
                active=serializer.validated_data['active'],
                bp_encoded=serializer.validated_data['bp_encoded'],
                not_presence_prediction=probabilities.tolist()[0],
                presence_prediction=probabilities.tolist()[1],
                createdAt = serializer.validated_data['createdAt'],
                leading_cause_1=leading_causes[0] if len(leading_causes) > 0 else None,
                leading_cause_2=leading_causes[1] if len(leading_causes) > 1 else None,
                leading_cause_3=leading_causes[2] if len(leading_causes) > 2 else None,
            )

            return Response({
                'prediction': int(prediction),
                'probability': probabilities.tolist(),
                'leading_causes': leading_causes
                }, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)  
        
class GetPatientData(APIView):
    def get(self, request, format = None):
        user_email = request.GET.get('user_email')
        
        user_object = get_object_or_404(User, email = user_email)
        
        patient_data = PatientData.objects.filter(user = user_object)
        
        if patient_data.exists():
            patient_serialized_data = RetrievePatientData(patient_data, many = True)
            
            return Response(patient_serialized_data.data, status=status.HTTP_200_OK)
        else:
            return Response({"Error":"No patient data"}, status=status.HTTP_404_NOT_FOUND)
        
class GetAllPatientData(generics.ListAPIView):
    serializer_class = GetAllPatientDataSerializer
    
    def get_queryset(self):
        latest_entries = PatientData.objects.values('user').annotate(latest_createdAt = Max('createdAt'))
        
        queryset = PatientData.objects.filter(
            createdAt__in = [entry['latest_createdAt'] for entry in latest_entries]
        ).order_by('-presence_prediction')
        
        return queryset
    
class SuggestionView(APIView):
    serializer_class = SuggestionSerializer
    
    def post(self, request, format = None):
        serializer = self.serializer_class(data = request.data)
        
        if serializer.is_valid():
            presence_probability = serializer.data.get('presence_probability')
            leading_cause_1 = serializer.data.get('leading_cause_1')
            leading_cause_2= serializer.data.get('leading_cause_2')
            leading_cause_3 = serializer.data.get('leading_cause_3')
            
            suggestion = execute(presence_probability, leading_cause_1, leading_cause_2, leading_cause_3)
            
            return Response({"Success": suggestion}, status=status.HTTP_200_OK)
        
        return Response({"Error": "Bad request"}, status=status.HTTP_400_BAD_REQUEST)
            
            
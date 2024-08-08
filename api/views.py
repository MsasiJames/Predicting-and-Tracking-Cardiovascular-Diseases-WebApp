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
        
    def get_feature_names(self):
        return ['age', 'gender', 'weight', 'height', 'ap_hi', 'ap_lo', 'cholesterol', 
                'glucose', 'alco', 'smoke', 'active', 'bmi', 'bp_encoded']

    def get_leading_causes(self, input_data):
        feature_importance = self.model.feature_importances_
        feature_names = self.get_feature_names()
        
        # Pair feature names with their importance scores
        feature_importance_pairs = list(zip(feature_names, feature_importance))
        
        # Sort pairs by importance score in descending order
        sorted_pairs = sorted(feature_importance_pairs, key=lambda x: x[1], reverse=True)
        
        # Return the top 3 feature names
        return [pair[0] for pair in sorted_pairs[:3]]
        
    def post(self, request):
        serializer = self.serializer_class(data = request.data)
        if serializer.is_valid():
            user_email = serializer.data.get('user_email')
            user = get_object_or_404(User, email = user_email)
            
            # Extract the features for prediction
            features = [
                serializer.validated_data['age'],
                serializer.validated_data['gender'],
                serializer.validated_data['weight'],
                serializer.validated_data['height'],
                serializer.validated_data['ap_hi'],
                serializer.validated_data['ap_lo'],
                serializer.validated_data['cholesterol'],
                serializer.validated_data['glucose'],
                serializer.validated_data['alco'],
                serializer.validated_data['smoke'],
                serializer.validated_data['active'],
                float(serializer.validated_data['bmi']),
                serializer.validated_data['bp_encoded']
            ]

            input_data = np.array(features).reshape(1, -1)
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
    
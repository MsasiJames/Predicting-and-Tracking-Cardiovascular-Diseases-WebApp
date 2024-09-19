from rest_framework import serializers
from .models import *
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import authenticate

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('email', )

class RetrievePatientData(serializers.ModelSerializer):
    class Meta:
        model = PatientData
        fields = ('not_presence_prediction', 'presence_prediction',  
                  'leading_cause_1', 'leading_cause_2', 'leading_cause_3', 'createdAt')
        
      
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only = True, required = True, validators=[validate_password])
    confirmPassword = serializers.CharField(write_only = True, required = True)
    
    class Meta:
        model = User
        fields = ('email', 'username', 'password', 'confirmPassword')
        
    def validate(self, attrs):
        if attrs['password'] != attrs['confirmPassword']:
            raise serializers.ValidationError(
                {"password": "Passwords don't match"}
            )
            
        return attrs

    def create(self, validated_data):
        user = User.objects.create(
            username = validated_data['username'],
            email = validated_data['email'],
        )
        user.set_password(validated_data['password'])
                    
        user.save()
        return user
    
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(email=email, password=password)
            if not user:
                raise serializers.ValidationError("Invalid credentials, either the email or password is incorrect.")
            
        else:
            raise serializers.ValidationError('Both email and password are required')
        
        attrs['user'] = user
        
        return attrs
    
    
class PredictSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(required = True, source = 'user.email')
    bmi = serializers.DecimalField(required = True, decimal_places=2, max_digits=5)
    bp_encoded = serializers.IntegerField(required = True)
    class Meta:
        model = PatientData
        fields = ('user_email', 'age', 'gender', 'weight', 'height', 'ap_hi', 'ap_lo', 
                  'cholesterol', 'glucose', 'alco', 'smoke', 'active'
                  , 'bmi', 'bp_encoded', 'createdAt')
        
class GetAllPatientDataSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source = 'user.email')
    class Meta:
        model = PatientData
        fields = ('user_email', 'presence_prediction', 'not_presence_prediction', 'leading_cause_1', 
                  'leading_cause_2', 'leading_cause_3',  'createdAt')
        
        
class SuggestionSerializer(serializers.Serializer):
    presence_probability = serializers.CharField(required = True)
    leading_cause_1 = serializers.CharField(required = True)
    leading_cause_2 = serializers.CharField(required = True)
    leading_cause_3 = serializers.CharField(required = True)
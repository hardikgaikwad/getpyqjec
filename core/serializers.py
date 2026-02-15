from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ("rno", "email", "name", "password")
        
    def create(self, validated_data):
        return User.objects.create_user(
            rno=validated_data["rno"],
            email=validated_data["email"],
            name=validated_data["name"],
            password=validated_data["password"],
        )
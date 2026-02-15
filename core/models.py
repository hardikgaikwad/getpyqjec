from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.core.validators import RegexValidator
from .managers import UserManager

# Create your models here.

rno_validator = RegexValidator(
    regex=r'^0201(CS|IT|AI|ME|CE|MT|IP|EE|EC)\d{6}$',
    message="Roll number must be like 0201IT231046"
)

class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('contributor', 'Contributor'),
    )
    
    rno = models.CharField(
        max_length=12,
        unique=True,
        validators=[rno_validator]
        )
    
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=100)
    
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='contributor'
    )
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    date_joined = models.DateField(auto_now_add=True)
    
    USERNAME_FIELD = 'rno'
    REQUIRED_FIELDS = ['email', 'name']
    
    objects = UserManager()
    
    def get_full_name(self):
        return self.name
    
    def __str__(self):
        return self.rno
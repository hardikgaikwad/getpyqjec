from django.contrib.auth.models import BaseUserManager

class UserManager(BaseUserManager):
    def create_user(self, rno, email, name, password=None):
        if not rno:
            raise ValueError("Roll number required.")
        
        user = self.model(
            rno=rno,
            email=self.normalize_email(email),
            name=name,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user
    def create_superuser(self, rno, email, name, password):
        user = self.create_user(rno, email, name, password)
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user
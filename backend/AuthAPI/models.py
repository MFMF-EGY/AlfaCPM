from django.db import models

class Users(models.Model):
    id = models.AutoField(primary_key=True)
    first_name = models.CharField(max_length=150)
    second_name = models.CharField(max_length=150)
    third_name = models.CharField(max_length=150)
    fourth_name = models.CharField(max_length=150)
    user_name = models.CharField(max_length=150, unique=True, editable=False)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=256)
    password_salt = models.CharField(max_length=12)
    profile_picture = models.URLField(max_length=200, blank=True)
    national_id = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=False)
    last_login = models.DateTimeField(null=True, blank=True)

    REQUIRED_FIELDS = ['first_name', 'second_name', 'third_name', 'fourth_name', 'email', 'password_hash', 'password_salt']
    USERNAME_FIELD = 'user_name'
    is_anonymous = False
    is_authenticated = True
    
    @property
    def password(self):
        return self.password_hash

    def save(self, *args, **kwargs):
        self.first_name = self.first_name.strip()
        self.second_name = self.second_name.strip()
        self.third_name = self.third_name.strip()
        self.fourth_name = self.fourth_name.strip()
        self.user_name = f"{self.first_name} {self.second_name} {self.third_name} {self.fourth_name}"
        self.email = self.email.strip().lower()
        self.password_hash = self.password_hash.strip()
        self.national_id = self.national_id.strip()
        super().save(*args, **kwargs)

    def get_email_field_name(self):
        return "email"
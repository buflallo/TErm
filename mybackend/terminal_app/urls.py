from django.urls import path
from .views import hello_world, create_instance, stop_instance
from . import consumers

urlpatterns = [
    path('hello/', hello_world),
    path('create-instance/', create_instance, name='create_instance'),
    path('shutdown-instance/', stop_instance, name='stop_instance'),
]
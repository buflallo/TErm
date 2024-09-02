# Project Setup Instructions

## Requirements

### Python
```
		Django>=5.1
		djangorestframework>=3.14.0
		django-cors-headers>=3.14.0
		django-csp>=3.7
		channels>=4.0.0
		channels-redis>=4.0.0
		asgiref>=3.2
		docker>=5.0
		daphne>=3.0
```
### Redis
		you need to run redis server on localhost:6379 or change the settings.py with existing one
		docker run -p 6379:6379 -d redis:5
### Socket
		daphne -p 8001 mybackend.asgi:application

##  Run the backend server:

	python manage.py runserver

##  Run the Frontend client:
	
	npm run start

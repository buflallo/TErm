# Project Setup Instructions

## Requirements


##  Run the backend server:

	cd /mybackend

### Python
```
		python3 -m venv envir && source envir/bin/activate && pip install -r requirements.txt
```
### Redis
		you need to run redis server on localhost:6379 or change the settings.py with existing one
```
		docker run -p 6379:6379 -d redis:5
```
### Socket Gateway
```
		daphne -p 8001 mybackend.asgi:application
```
### Django Server
```
		python manage.py runserver
```
##  Run the Frontend client:
	cd /myfrontend
	npm run start

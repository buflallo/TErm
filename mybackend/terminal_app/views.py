import asyncio
import threading
from asgiref.sync import async_to_sync
from django.http import JsonResponse
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
import docker
from channels.layers import get_channel_layer

# Initialize Docker client globally
client = docker.from_env()

# General utility function to send JSON response
def hello_world(request):
    return JsonResponse({'message': 'Hello, world!'})

# Utility function to run tasks in the background using threads
def run_in_background(container, command=None, callback=None, job=None):
    asyncio.run(execute_and_callback(container, command, callback, job))

# Asynchronous function to execute Docker commands and handle completion callbacks
async def execute_and_callback(container, command, callback, job):
    if job == "exec" and command:
        await _run_command(container, command)
    elif job == "stop":
        container.stop()
    else:
        print("No valid job to run")

    if callback:
        await callback(container, job)

# Utility function to run a command inside a Docker container
async def _run_command(container, command):
    result = container.exec_run(command, tty=True, stream=True, environment={"DEBIAN_FRONTEND": "noninteractive"})
    for line in result.output:
        print(line.decode().strip())

async def update_status_on_completion(container, job = None):
    # This function is called when the job is done
    await notify_client_on_completion(container.id, job)

# Asynchronous function to notify the client about the completion of a job
async def notify_client_on_completion(container_id, job):
    channel_layer = get_channel_layer()
    job_status_messages = {
        "exec": f"Command execution on container {container_id} completed.",
        "stop": f"Container {container_id} stopped successfully."
    }
    job_status = job_status_messages.get(job, "Job completed")
    
    print(job_status)
    
    await channel_layer.group_send(
        'status_job_status',
        {
            'type': 'job_status_update',
            'containerId': container_id,
            'message': job_status,
            'status': f"{job} completed"
        }
    )

# Main function to create Docker containers and install packages
def create_docker_container(system, packages):
    if not system:
        return Response({'error': 'System and packages must be selected.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        running_containers = client.containers.list(filters={"name": f"instance_{system}", "status": "running"})
        if running_containers:
            return Response({'containerId': running_containers[0].id}, status=status.HTTP_200_OK)

        image_name = _get_image_name(system)
        container = _create_container(image_name)

        if not packages:
            threading.Thread(target=run_in_background, args=(container, None, update_status_on_completion, "run")).start()
            return Response({'containerId': container.id}, status=status.HTTP_201_CREATED)

        install_command = _get_install_command(system, packages, container)
        if install_command:
            threading.Thread(target=run_in_background, args=(container, install_command, update_status_on_completion, "exec")).start()

        return Response({'containerId': container.id}, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Helper function to get the appropriate Docker image based on the system
def _get_image_name(system):
    image_map = {
        1: 'debian:latest',
        2: 'ubuntu:latest',
        3: 'alpine:latest',
    }
    return image_map.get(system, 'debian:latest')

# Helper function to create a Docker container
def _create_container(image_name):
    return client.containers.run(
        image=image_name,
        entrypoint="/bin/sh",
        detach=True,
        stdin_open=True,
        tty=True
    )

# Helper function to generate the install command based on the selected system and packages
def _get_install_command(system, packages, container):
    packages_map = {
        1: 'python3',
        2: 'anaconda',
        3: 'c++',
    }
    selected_packages = [packages_map.get(package_id) for package_id in packages]

    if system in [1, 2]:  # Specific handling for Debian and Ubuntu
        preconfigure_cmd = (
            "/bin/bash -c "
            "echo 'tzdata tzdata/Areas select Africa' | debconf-set-selections && "
            "echo 'tzdata tzdata/Zones/Africa select Asmara' | debconf-set-selections"
        )
        container.exec_run(preconfigure_cmd, tty=True, stream=True, environment={"DEBIAN_FRONTEND": "noninteractive"})

        return f"/bin/bash -c 'apt-get update && apt-get install -y {' '.join(selected_packages)}'"
    
    return None

# API view to create a Docker instance
@api_view(['POST'])
def create_instance(request):
    data = request.data
    selected_system = data.get('selectedSystem')
    selected_packages = data.get('selectedPackages')
    return create_docker_container(selected_system, selected_packages)

# API view to stop a Docker instance
@api_view(['POST'])
def stop_instance(request):
    data = request.data
    container_id = data.get('containerId')
    try:
        container = client.containers.get(container_id)
        threading.Thread(target=run_in_background, args=(container, None, update_status_on_completion, "stop")).start()
        return Response({'message': 'Container stopped successfully.'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

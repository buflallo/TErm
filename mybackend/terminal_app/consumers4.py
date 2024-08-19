import asyncio
import json
import docker
from channels.generic.websocket import AsyncWebsocketConsumer

class TerminalConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.client = docker.from_env()
        self.container = None
        self.exec_instance_id = None
        self.exec_stream = None
        self.stdin_writer = None
        self.logs_task = None

    async def connect(self):
        print("WebSocket connection request received")
        await self.accept()
        print("WebSocket connection accepted")

        self.container = await self.start_container()
        await self.start_exec_instance()
        print("Container and exec instance started")

    async def disconnect(self, close_code):
        if self.logs_task:
            self.logs_task.cancel()
        if self.stdin_writer:
            self.stdin_writer.close()
        if self.container:
            await self.stop_container()
        print('WebSocket disconnected with close code:', close_code)

    async def start_container(self):
        # Start a new container with TTY and STDIN open
        container = self.client.containers.run(
            'ubuntu:20.04',
            tty=True,
            stdin_open=True,
            detach=True
        )
        return container

    async def stop_container(self):
        if self.container:
            self.container.stop()
            self.container.remove()
            self.container = None

    async def start_exec_instance(self):
        if self.container:
            # Create a new exec instance
            exec_instance = self.client.api.exec_create(
                self.container.id,
                cmd="/bin/bash",
                tty=True,
                stdin=True,
                stdout=True,
                stderr=True
            )
            self.exec_instance_id = exec_instance['Id']

            # Start the exec instance and get the stream
            self.exec_stream = self.client.api.exec_start(self.exec_instance_id, stream=True)

            # Launch async task to handle output streaming
            self.logs_task = asyncio.create_task(self.stream_logs())

    async def receive(self, text_data):
        print('Received data:', text_data)
        text_data_json = json.loads(text_data)
        command = text_data_json.get('command')

        if command:
            # Send the command to the exec instance's stdin
            if self.exec_instance_id:
                self.client.api.exec_start(self.exec_instance_id, stdin=True).write((command + "\n").encode('utf-8'))
                # If needed, add a flush or similar mechanism to ensure the command is sent

    async def stream_logs(self):
        while True:
            try:
                if self.exec_stream:
                    output = self.exec_stream.read().decode('utf-8')
                    if output:
                        await self.send(text_data=json.dumps({'stdout': output, 'stderr': ''}))
            except Exception as e:
                print(f"Error streaming logs: {e}")
                break

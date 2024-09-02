import docker
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
import json
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging
import contextlib



client = docker.from_env()
container_name = "my_terminal_container"

def start_container(container_id):
    running_containers = client.containers.list(filters={"id": container_id, "status": "running"})
    if running_containers:
        print(f"Container {container_id} is already running.")
        return running_containers[0]
    else:
        print(f"Starting container {container_id}")
        container = client.containers.get(container_id)
        container.start()
        return container

async def read_from_docker(socket_docker):
    loop = asyncio.get_running_loop()
    while True:
        try:
            data = await loop.run_in_executor(None, socket_docker._sock.recv, 1024)
            if data:
                return data
        except BlockingIOError:
            await asyncio.sleep(0.01)  # Sleep briefly and retry

class TerminalConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.container = None
        self.socket_docker = None
        self.is_connected = False
        self.container_id = self.scope['url_route']['kwargs']['container_id']
        self.group_name = f"terminal_{self.container_id}"
        self.logger = logging.getLogger(__name__)

        try:
            # Retrieve session_id from URL
            await self.accept()
            asyncio.create_task(self.start_streaming())

        except Exception as e:
            print(f"Connection error: {e}")
            await self.close()

    async def disconnect(self, close_code):
        try:
            await self.cleanup_terminal_session()
        except Exception as e:
            self.logger.error(f"Error during cleanup: {e}")
        finally:
            await super().disconnect(close_code)

    async def cleanup_terminal_session(self):
        async with self._cleanup_context():
            pass



    @contextlib.asynccontextmanager
    async def _cleanup_context(self):
        try:
            yield
        finally:
            self.logger.info("Starting terminal session cleanup.")
            if self.is_connected:
                self.is_connected = False
                if self.socket_docker:
                    self.logger.info("Closing WebSocket connection to Docker...")
                    try:
                        self.socket_docker.close()
                        self.logger.info("WebSocket connection to Docker closed.")
                    except Exception as e:
                        self.logger.error(f"Error closing WebSocket connection to Docker: {e}")
            await self.close(code=1000)
            self.logger.info("Terminal session cleaned up successfully.")

    async def receive(self, text_data):
        try:
            if self.socket_docker:
                self.socket_docker._sock.send(text_data.encode())
        except Exception as e:
            print(f"Error in receive: {e}")

    async def start_streaming(self):
        print("start")
        if not self.is_connected:
            self.container = start_container(self.container_id)
            if self.container:
                self.socket_docker = self.container.attach_socket(params={'stdin': 1, 'stdout': 1, 'stderr': 1, 'stream': 1})
                self.socket_docker._sock.setblocking(False)
                self.is_connected = True
                self.logger.info("Streaming started.")
            else:
                self.logger.error(f"Failed to start container {self.container_id}")
                await self.close()
                return


        while self.is_connected:
            try:
                docker_recv = asyncio.create_task(read_from_docker(self.socket_docker))

                done, pending = await asyncio.wait(
                    [docker_recv],
                    return_when=asyncio.FIRST_COMPLETED
                )

                for task in done:
                    output = task.result()
                    if output:
                        await self.send(text_data=output.decode('utf-8', errors='replace'))

                # Cancel any remaining tasks
                for task in pending:
                    task.cancel()

            except Exception as e:
                print(f"Error in streaming: {e}")
                for task in pending:
                    task.cancel()
                await self.close()
                break


class JobConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = "job_status"
        self.room_group_name = f"status_{self.room_name}"

        await self.channel_layer.group_add(
            self.room_group_name, self.channel_name
        )
        # print(f"group added: {self.channel_layer.groups}")

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name, self.channel_name
        )


    async def receive(self, text_data):
        # Handle messages from the client if needed
        pass

    async def job_status_update(self, event):
        # Send message to WebSocket
        print(f"Sending message to WebSocket: {event}")
        await self.send(text_data=json.dumps({
            'containerId': event['containerId'],
            'message': event['message'],
            'status': event['status']
        }))
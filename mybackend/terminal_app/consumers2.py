import asyncio
import paramiko
import pty
from channels.generic.websocket import AsyncWebsocketConsumer
import signal
import os
import json
import socket

class TerminalConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.ssh_client = None
        self.ssh_channel = None
        self.master_fd = None
        self.slave_fd = None
        self.is_connected = False
        self.session_id = self.scope['url_route']['kwargs'].get('session_id', None)
        
        if self.session_id:
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        if self.ssh_channel:
            await self._terminate_ssh_session()
        if self.master_fd:
            os.close(self.master_fd)
        if self.slave_fd:
            os.close(self.slave_fd)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)

            if 'host' in data and 'username' in data and 'password' in data:
                host = data['host']
                username = data['username']
                password = data['password']
                await self.start_ssh_connection(host, username, password)
            else:
                if self.ssh_channel:
                    self.ssh_channel.send(text_data)

        except json.JSONDecodeError:
            if self.ssh_channel:
                self.ssh_channel.send(text_data)

    async def start_ssh_connection(self, host, username, password):
        if self.ssh_channel:
            await self._terminate_ssh_session()

        try:
            self.ssh_client = paramiko.SSHClient()
            self.ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            self.ssh_client.connect(host, username=username, password=password, timeout=10)

            self.ssh_channel = self.ssh_client.invoke_shell()
            self.master_fd, self.slave_fd = pty.openpty()
            self.ssh_channel.setblocking(0)

            self.is_connected = True
            await self.send(text_data=json.dumps({"status": "connected"}))

            asyncio.create_task(self.stream_output())

        except paramiko.AuthenticationException:
            await self.send(text_data=json.dumps({"status": "error", "message": "Authentication failed: Incorrect username or password."}))
        except paramiko.SSHException as e:
            await self.send(text_data=json.dumps({"status": "error", "message": f"SSH error: {str(e)}"}))
        except socket.gaierror:
            await self.send(text_data=json.dumps({"status": "error", "message": "Host not found: Check the hostname or network."}))
        except socket.timeout:
            await self.send(text_data=json.dumps({"status": "error", "message": "Connection timed out: The server took too long to respond."}))
        except Exception as e:
            await self.send(text_data=json.dumps({"status": "error", "message": f"An unexpected error occurred: {str(e)}"}))

    async def _terminate_ssh_session(self):
        if self.ssh_channel:
            try:
                self.ssh_channel.close()
                self.ssh_channel = None
            except Exception as e:
                print(f"Error closing SSH channel: {e}")
        if self.ssh_client:
            try:
                self.ssh_client.close()
                self.ssh_client = None
            except Exception as e:
                print(f"Error closing SSH client: {e}")

    async def stream_output(self):
        while self.is_connected:
            try:
                data = await self.read_from_channel()
                if data:
                    await self.send(text_data=data)
            except Exception as e:
                print(f"Error in stream_output: {e}")
                await self._terminate_ssh_session()
                break

    async def read_from_channel(self):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._read_output)

    def _read_output(self):
        try:
            if self.ssh_channel and not self.ssh_channel.closed:
                if self.ssh_channel.recv_ready():
                    return self.ssh_channel.recv(1024).decode()
        except Exception as e:
            print(f"Error reading from SSH channel: {e}")
            return ""

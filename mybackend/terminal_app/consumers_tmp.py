import asyncio
import json
import signal
import subprocess
from channels.generic.websocket import AsyncWebsocketConsumer
import os

class TerminalConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.process = None  # Initialize process attribute
        self.terminate_event = asyncio.Event()  # Initialize termination event
        self.command_task = None  # Task for running the command
        self.child_pid = None  # Track the child process ID

    async def disconnect(self, close_code):
        await self.terminate_processes()  # Ensure processes are terminated on disconnect
        print('WebSocket disconnected with close code:', close_code)

    async def terminate_processes(self):
        if self.process and self.process.returncode is None:
            try:
                # Terminate the shell process
                self.process.terminate()

                # If there's a child process, terminate it too
                if self.child_pid:
                    os.kill(self.child_pid, signal.SIGTERM)

                # Wait for the shell process to finish
                await asyncio.wait_for(self.process.wait(), timeout=5.0)
                print('Processes terminated successfully')
            except asyncio.TimeoutError:
                print('Termination timed out, killing the processes')
                if self.child_pid:
                    os.kill(self.child_pid, signal.SIGKILL)
                self.process.kill()
                await self.process.wait()
            except Exception as e:
                print(f'Error during process termination: {e}')
            finally:
                self.process = None
                self.child_pid = None

    async def receive(self, text_data):
        print('Received data:', text_data)  # Log the received data

        text_data_json = json.loads(text_data)
        command = text_data_json.get('command')
        action = text_data_json.get('action')

        if action == 'terminate':
            print('Terminating the processes')
            await self.terminate_processes()
            return

        if command:
            print('Running command:', command)
            await self.terminate_processes()  # Ensure any previous process is terminated

            # Start a new process
            self.process = await asyncio.create_subprocess_shell(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )

            # Capture the child process ID
            self.child_pid = await self.get_child_pid(self.process.pid)

            # Handle command output
            self.command_task = asyncio.create_task(self.handle_command())

            print('New process started successfully')

    async def get_child_pid(self, parent_pid):
        """Retrieve the PID of the child process."""
        try:
            output = subprocess.check_output(['pgrep', '-P', str(parent_pid)])
            return int(output.strip())
        except subprocess.CalledProcessError:
            return None

    async def handle_command(self):
        # Concurrently handle both stdout and stderr streams
        stdout_task = asyncio.create_task(self.read_stream(self.process.stdout, self.send_stdout))
        stderr_task = asyncio.create_task(self.read_stream(self.process.stderr, self.send_stderr))

        await asyncio.gather(stdout_task, stderr_task)

    async def read_stream(self, stream, send_func):
        buffer = []
        while True:
            if self.terminate_event.is_set():
                print('Termination event is set')
                break  # Exit the loop if the termination event is set

            try:
                line = await asyncio.wait_for(stream.readline(), timeout=1.0)
                if line:
                    line_text = line.decode('utf-8').replace('\r\n', '\n')
                    if 'top -' in line_text:
                        # Handle screen clear sequence
                        buffer.append(line_text)
                        first_part = ''.join(buffer)[:line_text.find('top -')]
                        second_part = ''.join(buffer)[line_text.find('top -'):]
                        await send_func(first_part)
                        buffer = [second_part]
                    else:
                        buffer.append(line_text)
                        if len(buffer) > 22:
                            await send_func(''.join(buffer))
                            buffer.clear()
                else:
                    if buffer:
                        await send_func(''.join(buffer))
                    break
            except asyncio.TimeoutError:
                # Check if the process has been terminated
                if self.process is None or self.process.returncode is not None:
                    break

    async def send_stdout(self, data):
        try:
            await self.send(text_data=json.dumps({
                'stdout': data,
                'stderr': ''
            }))
        except Exception as e:
            print(f"Error sending stdout: {e}")

    async def send_stderr(self, data):
        try:
            await self.send(text_data=json.dumps({
                'stdout': '',
                'stderr': data
            }))
        except Exception as e:
            print(f"Error sending stderr: {e}")

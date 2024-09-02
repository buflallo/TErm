import docker
import select
import sys
import termios
import tty
import os
import asyncio
import websockets

client = docker.from_env()
container_name = "my_terminal_container"

def start_container():
    running_containers = client.containers.list(filters={"name": container_name, "status": "running"})
    if running_containers:
        return running_containers[0]
    else:
        return client.containers.run(
            image='ubuntu:20.04',
            name=container_name,
            entrypoint="/bin/bash",
            detach=True,
            stdin_open=True,
            tty=True
        )

def setup_terminal(fd):
    old_settings = termios.tcgetattr(fd)
    tty.setraw(fd)
    return old_settings

def restore_terminal(fd, old_settings):
    termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)

async def read_from_docker(socket_docker):
    loop = asyncio.get_running_loop()
    while True:
        try:
            data = await loop.run_in_executor(None, socket_docker._sock.recv, 1024)
            return data
        except BlockingIOError:
            await asyncio.sleep(0.01)  # Sleep briefly and retry

async def handle_client(websocket, path):
    # Start the Docker container
    container = start_container()

    # Attach to the container's stdin, stdout, and stderr
    socket_docker = container.attach_socket(params={'stdin': 1, 'stdout': 1, 'stderr': 1, 'stream': 1})
    socket_docker._sock.setblocking(False)

    old_settings = setup_terminal(sys.stdin.fileno())

    try:
        while True:
            # Use asyncio.gather to handle WebSocket receive and Docker socket reading concurrently
            try:
                # Receive from WebSocket and Docker simultaneously
                websocket_recv = asyncio.create_task(websocket.recv())
                docker_recv = asyncio.create_task(read_from_docker(socket_docker))
                
                done, pending = await asyncio.wait(
                    [websocket_recv, docker_recv],
                    return_when=asyncio.FIRST_COMPLETED
                )

                for task in done:
                    if task == websocket_recv:
                        data = task.result()
                        if data:
                            print("Received from WebSocket:", data)
                            socket_docker._sock.send(data.encode())

                    if task == docker_recv:
                        output = task.result()
                        if output:
                            print("Received from Docker:", output)
                            await websocket.send(output.decode('utf-8'))

                # Cancel any remaining tasks
                for task in pending:
                    task.cancel()

            except websockets.exceptions.ConnectionClosedOK:
                break
            except websockets.exceptions.ConnectionClosedError:
                break

    except Exception as e:
        print(f"Error: {e}")
    finally:
        # Close Docker socket and restore terminal settings
        socket_docker._sock.close()
        restore_terminal(sys.stdin.fileno(), old_settings)
        await websocket.close()

async def main():
    # Start WebSocket server
    server = await websockets.serve(handle_client, "0.0.0.0", 5001)
    try:
        await asyncio.Future()  # Run forever
    except asyncio.CancelledError:
        pass
    finally:
        server.close()
        await server.wait_closed()

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass

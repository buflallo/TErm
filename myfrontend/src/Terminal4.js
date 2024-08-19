import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css'; // Import xterm styles

const TerminalComponent = () => {
  const terminalRef = useRef(null);
  const fitAddon = useRef(new FitAddon());
  const socketRef = useRef(null);
  const terminalInstance = useRef(null);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8001/ws/terminal/1/');
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connection established');
      // Optionally send a message to the server here if needed
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.stdout) {
        terminalInstance.current.write(data.stdout);  // Write the data to the terminal
      }
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Initialize xterm.js Terminal
    terminalInstance.current = new Terminal({
      cursorBlink: true,
      cols: 80,
      rows: 24,
      theme: {
        background: '#000000',
        foreground: '#FFFFFF',
      },
    });

    terminalInstance.current.loadAddon(fitAddon.current);

    // Attach the terminal to the DOM element
    terminalInstance.current.open(terminalRef.current);

    // Fit terminal size to container
    fitAddon.current.fit();

    // Handle data input from the terminal
    terminalInstance.current.onData((data) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ command: data }));
      }
    });

    // Cleanup WebSocket and terminal on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (terminalInstance.current) {
        terminalInstance.current.dispose();
      }
    };
  }, []);

  return (
    <div
      ref={terminalRef}
      style={{ width: '100%', height: '400px', backgroundColor: '#000' }}
    ></div>
  );
};

export default TerminalComponent;

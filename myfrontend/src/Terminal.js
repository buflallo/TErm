


import React, { act, useEffect, useRef, useState } from 'react';
import { Terminal as XTermTerminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css'; // Import xterm styles

const Terminal = ({ connection, onDisconnect, activeTerminals }) => {
  const terminalRef = useRef(null);
  const fitAddon = useRef(new FitAddon());
  const socketRef = useRef(null);
  const terminalInstance = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
//{
//   "selectedSystem": {
//     "id": 1,
//     "name": "Debian",
//     "imageUrl": "/systems/logo-debian.png"
//   },
//   "selectedPackages": [
//     2
//   ],
//   "isConnected": false,
//   "id": 1
// }
  useEffect(() => {
    if (connection) {
      const socket = new WebSocket(`ws://localhost:8001/ws/terminal/${connection.selectedSystem.containerId}/`);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connection established');
        setConnectionStatus('connected');
        // Optionally send a message to the server here if needed
      };

      socket.onmessage = (event) => {
        // console.log('WebSocket message received:', event.data);
        // const data = JSON.parse(event.data);
        // if (data.stdout) {
          terminalInstance.current.write(event.data);  // Write the data to the terminal
        // }
      };

      socket.onclose = () => {
        // setConnectionStatus('disconnected');
        console.log('WebSocket connection closed');
        
        // terminalInstance.current.write('\n[Info] WebSocket connection closed.\n');
        // onDisconnect(); // Notify parent component to remove the terminal

      };

      socket.onerror = (error) => {
        setConnectionStatus('error');
        terminalInstance.current.write('\n[Error] WebSocket connection error.\n');
        console.error('WebSocket error:', error);
      };

      // Initialize xterm.js Terminal
      terminalInstance.current = new XTermTerminal({
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
        console.log('Data from terminal:', data);
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(data);
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
    }
  }, [activeTerminals]);

  return (
    <div className="terminal">
      {connectionStatus === 'error' && <div className="error-message">Connection Error! Please check the details.</div>}
      <div ref={terminalRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};

export default Terminal;

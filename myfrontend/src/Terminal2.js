import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerminal } from 'xterm';
import 'xterm/css/xterm.css';

const WebTerminal = ({ connection, onDisconnect }) => {
  const terminalRef = useRef(null);
  const wsRef = useRef(null);
  const terminalInstanceRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    if (connection) {
      terminalInstanceRef.current = new XTerminal();
      terminalInstanceRef.current.open(terminalRef.current);

      wsRef.current = new WebSocket(`ws://localhost:8001/ws/terminal/${connection.id}/`);

      wsRef.current.onopen = () => {
        console.log('WebSocket connection opened');
        setConnectionStatus('connected');
        wsRef.current.send(JSON.stringify(connection));
      };

      wsRef.current.onmessage = (event) => {
        console.log('Received message:', event.data);
        if (event.data.startsWith('{') || event.data.startsWith('[')) {
          try {
            const data = JSON.parse(event.data);
            if (data.status === 'error') {
              setConnectionStatus('error');
              terminalInstanceRef.current.write(`\n[Error] ${data.message}\n`);
            } else if (data.status === 'connected') {
              setConnectionStatus('connected');
            } else {
              terminalInstanceRef.current.write(data.output);
            }
          } catch (e) {
            console.error('Failed to parse message as JSON:', e);
            terminalInstanceRef.current.write(`\n[Error] Invalid JSON data received.\n`);
          }
        } else {
          terminalInstanceRef.current.write(event.data);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        terminalInstanceRef.current.write('\n[Error] WebSocket connection error.\n');
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket connection closed');
        setConnectionStatus('disconnected');
        terminalInstanceRef.current.write('\n] WebSocket connection closed.\n');
        onDisconnect(); // Notify parent component to remove the terminal
      };

      terminalInstanceRef.current.onData((data) => {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(data);
        }
      });

      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.dispose();
        }
      };
    }
  }, [connection]);

  return (
    <div className="terminal">
      {connectionStatus === 'error' && <div className="error-message">Connection Error! Please check the details.</div>}
      <div ref={terminalRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};

export default WebTerminal;

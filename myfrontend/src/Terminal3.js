import React, { useState, useEffect, useRef } from 'react';
import AnsiToHtml from 'ansi-to-html';

const Terminal = () => {
  const [command, setCommand] = useState('');
  const [outputBuffer, setOutputBuffer] = useState([]); // Array for managing lines of output
  const [streamingBuffer, setStreamingBuffer] = useState([]); // Buffer for streaming output
  const [history, setHistory] = useState([]);
  const [viewStack, setViewStack] = useState(['main']); // Stack to manage terminal views
  const [socket, setSocket] = useState(null);
  const outputRef = useRef(null);
  const viewStackRef = useRef(viewStack);
  const historyIndex = useRef(0);
  const convert = new AnsiToHtml();


  useEffect(() => {
    viewStackRef.current = viewStack;
  }, [viewStack]);


  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8001/ws/terminal/1');
    setSocket(ws);
    console.log('WebSocket connection established');

    ws.onmessage = (event) => {
      const { stdout, stderr } = JSON.parse(event.data);
      console.log('stdout:', stdout);
      console.log('stderr:', stderr);
      let combinedOutput = stdout + stderr;
      // console.log(combinedOutput);
      combinedOutput = handleEscapeCodes(combinedOutput);
      const formattedOutput = convert.toHtml(combinedOutput);
      console.log('socket  viewStack is:', viewStackRef.current);
      if (viewStackRef.current[viewStackRef.current.length - 1] === 'stream') {
        console.log('Updating stream buffer');
        updateStreamBuffer(formattedOutput);
      }
      else {
        console.log('Updating output buffer');
        updateOutputBuffer(formattedOutput);
      }
    };

    ws.onclose = () => console.log('WebSocket connection closed');
    return () => ws.close();
  }, []);

  const updateOutputBuffer = (formattedOutput) => {
    if (formattedOutput === '') {
      setOutputBuffer([]);
    }
    setOutputBuffer((prev) => [...prev, ...formattedOutput.split('\n')]);
  };
  const updateStreamBuffer = (formattedOutput) => {
    if (formattedOutput === '') {
      setStreamingBuffer([]);
    }
    setStreamingBuffer((prev) => [...prev, ...formattedOutput.split('\n')]);
  };

  const handleEscapeCodes = (text) => {
    const lines = text.split('\n');
    let buffer = [...outputBuffer];
    let cursorPosition = { x: 0, y: buffer.length - 1 < 0 ? 0 : buffer.length - 1 };

    // Patterns for various escape codes
    const clearLinePattern = /\x1b\[K/g;
    const cursorHomePattern = /\x1b\[H/g;
    const clearScreenPattern = /\x1b\[2J/g;
    const clearScrollbackPattern = /\x1b\[3J/g;
    const charSetPattern = /\x1b\(B/g;
    const moveCursorPattern = /\x1b\[(\d+);(\d+)H/g;

    const clearLine = () => {
      if (buffer.length > cursorPosition.y) {
        buffer[cursorPosition.y] = '';  // Clear the current line in the buffer
      }
      cursorPosition.x = 0;  // Reset cursor position
    };

    const moveCursorHome = () => {
      buffer = [];
      cursorPosition = { x: 0, y: 0 };
    };

    const clearScrollback = () => {
      // Clear from the start of the buffer to the current cursor position
      buffer = buffer.slice(cursorPosition.y);
      cursorPosition.y = 0;
      cursorPosition.x = 0;
    };

    const moveCursor = (y, x) => {
      cursorPosition = { x: parseInt(x) - 1, y: parseInt(y) - 1 };
      while (buffer.length <= cursorPosition.y) {
        buffer.push('');
      }
    };

    const clearScreen = () => {
      buffer = [];
      cursorPosition = { x: 0, y: 0 };
    };

    lines.forEach((line) => {
      let updatedLine = line;

      if (clearLinePattern.test(updatedLine)) {
        clearLine();
        updatedLine = updatedLine.replace(clearLinePattern, '');
      }
  
      if (clearScreenPattern.test(updatedLine)) {
        clearScreen();
        updatedLine = updatedLine.replace(clearScreenPattern, '');
      }

      if (clearScrollbackPattern.test(updatedLine)) {
        clearScrollback();
        updatedLine = updatedLine.replace(clearScrollbackPattern, '');
      }

      if (clearLinePattern.test(updatedLine)) {
        clearLine();
        updatedLine = updatedLine.replace(clearLinePattern, '');
      }

      if (cursorHomePattern.test(updatedLine)) { 
        moveCursorHome();
        updatedLine = [''];
      }

      const cursorMoveMatch = moveCursorPattern.exec(updatedLine);
      if (cursorMoveMatch) {
        moveCursor(cursorMoveMatch[1], cursorMoveMatch[2]);
        updatedLine = updatedLine.replace(moveCursorPattern, '');
      }

      if (charSetPattern.test(updatedLine)) {
        updatedLine = updatedLine.replace(charSetPattern, '');
      }

      if (buffer.length <= cursorPosition.y) {
        buffer.push(updatedLine);
      } else {
        const existingLine = buffer[cursorPosition.y] || '';
        buffer[cursorPosition.y] = existingLine.slice(0, cursorPosition.x) + updatedLine;
      }

      cursorPosition.y++;
    });

    return buffer.join('\n');
  };

  const handleKeyDown = (e) => {
    e.preventDefault();

    if (e.ctrlKey && e.key === 'c') {
      console.log('Ctrl+C pressed');
      console.log('ctr+c viewStack is:', viewStack);
      if (socket && viewStack[viewStack.length - 1] === 'stream') {
        setStreamingBuffer([]);
        socket.send(JSON.stringify({ action: 'terminate' }));
        setViewStack(['main']); // Switch back to main view and retreive old output
      }
    } else if (e.key === 'ArrowUp') {
      if (historyIndex.current > 0) {
        historyIndex.current -= 1;
        setCommand(history[historyIndex.current]);
      }
    } else if (e.key === 'ArrowDown') {
      if (historyIndex.current < history.length - 1) {
        historyIndex.current += 1;
        setCommand(history[historyIndex.current]);
      } else {
        setCommand('');
      }
    } else if (e.key === 'Enter') {
      handleSubmit(new Event('submit'));
    } else if (e.key.length === 1) {
      setCommand((prev) => prev + e.key);
    }
  };

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputBuffer]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (socket) {
      setHistory([...history, command]);
      historyIndex.current = history.length;
      updateOutputBuffer(
        `<span class="prompt">username@host:~$</span> ${command}`
      );
      socket.send(JSON.stringify({ command }));

      if (isStreamingCommand(command)) {
        setViewStack([...viewStack, 'stream']); // Push 'stream' view to the stack
      }
      setTimeout(() => console.log('submit viewStack is:', viewStack), 4000);
      setCommand('');
    }
  };

  const isStreamingCommand = (cmd) => {
    return cmd === 'top' || cmd === 'bash -c "$(curl https://grademe.fr)"' || cmd.startsWith('vim');
  };

  return (
    <div
      onKeyDown={handleKeyDown}
      tabIndex="0"
      style={{ outline: 'none', height: '100%' }}
    >
      <div
        ref={outputRef}
        style={{
          whiteSpace: 'pre-wrap',
          backgroundColor: 'black',
          color: 'white',
          padding: '10px',
          height: '400px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          scrollbarWidth: 'none',
          overflowX: 'auto',
        }}

        dangerouslySetInnerHTML={{ __html: streamingBuffer.length > 0 ? streamingBuffer.join('\n') : outputBuffer.join('\n') }}
      />
      {viewStack[viewStack.length - 1] === 'main' && (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
          />
          <button type="submit">Send</button>
        </form>
      )}
    </div>
  );
};

export default Terminal;

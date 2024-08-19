import React, { useState, useEffect, useRef } from 'react';
import AnsiToHtml from 'ansi-to-html';

const Terminal = () => {
    const [output, setOutput] = useState(['']);  // Use an array to manage lines of terminal output
    const [commandHistory, setCommandHistory] = useState([]);  // Store the command history
    const [currentCommand, setCurrentCommand] = useState('');  // Current command being typed
    const [viewStack, setViewStack] = useState([]);  // Stack to manage terminal views
    const [socket, setSocket] = useState(null);
    const outputRef = useRef(null);
    const convert = new AnsiToHtml();

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8001/ws/terminal/');
        setSocket(ws);

        ws.onmessage = (event) => {
            const { stdout, stderr } = JSON.parse(event.data);
            let combinedOutput = stdout + stderr;
            combinedOutput = handleEscapeCodes(combinedOutput);
            setOutput(prev => [...combinedOutput.split('\n')]);
            scrollToBottom();
        };

        ws.onclose = () => console.log('WebSocket closed');
        return () => ws.close();
    }, []);

    const handleEscapeCodes = (text) => {
        const lines = text.split('\n');
        let buffer = [];
        let cursorPosition = { x: 0, y: 0 };
    
        // Patterns for various escape codes
        const clearLinePattern = /\x1b\[K/g;
        const cursorHomePattern = /\x1b\[H/g;
        const clearScreenPattern = /\x1b\[2J/g;
        const clearScrollbackPattern = /\x1b\[3J/g;
        const charSetPattern = /\x1b\(B/g;
    
        // Clear line from the buffer
        const clearLine = () => {
            if (buffer.length > cursorPosition.y) {
                buffer[cursorPosition.y] = '';
            }
        };
    
        // Move cursor to home position
        const moveCursorHome = () => {
            cursorPosition = { x: 0, y: 0 };
        };
    
        // Clear entire screen
        const clearScreen = () => {
            buffer = [];
            cursorPosition = { x: 0, y: 0 };
        };
    
        // Clear scrollback buffer
        const clearScrollback = () => {
            buffer = [];
        };
    
        lines.forEach(line => {
            let updatedLine = line;
    
            // Check for escape codes and apply appropriate actions
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
                updatedLine = updatedLine.replace(cursorHomePattern, '');
            }
    
            if (charSetPattern.test(updatedLine)) {
                updatedLine = updatedLine.replace(charSetPattern, '');
            }
    
            // Add the processed line to the buffer
            if (buffer.length <= cursorPosition.y) {
                buffer.push(updatedLine);
            } else {
                buffer[cursorPosition.y] += updatedLine;
            }
    
            cursorPosition.y++;
        });
    
        // Combine buffer into a single string
        return buffer.join('\n');
    };

    const handleKeyDown = (e) => {
        if (e.ctrlKey && e.key === 'c') {
            e.preventDefault();
            if (socket) {
                socket.send(JSON.stringify({ action: 'terminate' }));
                if (viewStack.length > 0) {
                    const prevView = viewStack.pop();
                    setOutput(prevView);
                    setViewStack([...viewStack]);  // Update the view stack
                }
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (socket) {
                socket.send(JSON.stringify({ command: currentCommand }));
                setCommandHistory([...commandHistory, currentCommand]);
                setCurrentCommand('');
            }
        } else if (e.key === 'Backspace') {
            setCurrentCommand(prev => prev.slice(0, -1));
        } else if (e.key.length === 1) {
            setCurrentCommand(prev => prev + e.key);
        }
    };

    const scrollToBottom = () => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    };

    const renderOutput = () => {
        return output.map((line, index) => (
            <div key={index} dangerouslySetInnerHTML={{ __html: convert.toHtml(line) }} />
        ));
    };

    return (
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
            }}
            tabIndex="0"
            onKeyDown={handleKeyDown}
        >
            {renderOutput()}
            <div>{currentCommand}</div>
        </div>
    );
};

export default Terminal;

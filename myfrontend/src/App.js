import React, { useState } from 'react';
import Terminal from './Terminal';
import styled, { createGlobalStyle } from 'styled-components';
import MainComponent from './MainComponent';

const GlobalStyle = createGlobalStyle`
  body {
    font-family: 'Arial', sans-serif;
    background-color: #f0f0f0;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
`;

const Terminals = styled.div`
  display: flex;
  overflow-y: auto;
  padding: 20px;
  flex-direction: column;
  flex: 2;
`;

function App() {
  const [connections, setConnections] = useState([]);
  const [activeTerminals, setActiveTerminals] = useState({});


  const handleConnect = (connection) => {
    console.log('Connecting to:', connection );
    setConnections([...connections, connection]);
    setActiveTerminals(prev => ({ ...prev, [connection.id]: true }));
  };

  const handleDisconnect = (connectionId) => {
    console.log('APP Disconnecting from:', connectionId );
// filter out the connection with the given id
    setConnections(prev => prev.filter((conn) => conn.id !== connectionId));
    setActiveTerminals(prev => {
      const active = { ...prev };
      delete active[connectionId];
      return active
    });
  };

  return (
    <>
      <GlobalStyle />
      <div className="App">
        <header className="App-header">
          <div className="split-container">
            <MainComponent 
              onConnect={handleConnect} 
              onDisconnect={handleDisconnect} 
            />
            <Terminals>
            {
            connections.length > 0 ? (
            connections.map(connection => (
              activeTerminals[connection.id] && (
                <Terminal 
                  key={connection.id}
                  connection={connection} 
                  onDisconnect={() => handleDisconnect(connection.id)}
                />
              )
            ))) : (
              <h2>No active connections</h2>
            )
            }
            </Terminals>
          </div>
        </header>
      </div>
    </>
  );

  // return (
  //   <>
  //     <Terminal/>
  //   </>
  // );
}

export default App;

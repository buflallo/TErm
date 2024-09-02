import React, { useState } from 'react';
import Terminal from './Terminal';
import styled, { createGlobalStyle } from 'styled-components';
import MainComponent from './MainComponent';
import Terminals from './Terminals';


const GlobalStyle = createGlobalStyle`
  body {
    font-family: 'Arial', sans-serif;
    background-color: #f0f0f0;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
`;

// const Terminals = styled.div`
//   display: flex;
//   overflow-y: auto;
//   padding: 20px;
//   flex-direction: column;
//   flex: 5;
// `;
const ConnectionStatus = {
  PENDING: 'Pending',
  CONNECTED: 'Shutdown',
  DISCONNECTED: 'Run',
};
function App() {
  const [connections, setConnections] = useState([]);
  const [activeTerminals, setActiveTerminals] = useState({});


  const handleConnect = (connection) => {
    console.log('Connecting to:', connection );
    setConnections(prev => [...prev, connection]);
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

  const handleTerminal = (connectionId) => {
    if (activeTerminals[connectionId]) {
      console.log('remove Terminal from:', connectionId );
      setActiveTerminals(prev => ({ ...prev, [connectionId]: false }));
    }
    else
    {
      console.log('Terminal on:', connectionId );
      setActiveTerminals(prev => ({ ...prev, [connectionId]: true }));
    }
  }

  return (
    <>
      <GlobalStyle />
      <div className="App">
        <header className="App-header">
          <div className="split-container">
            <MainComponent 
              onConnect={handleConnect} 
              onDisconnect={handleDisconnect}
              onTerminal={handleTerminal}
            />
            <Terminals connections={connections} activeTerminals={activeTerminals} handleDisconnect={handleDisconnect} />
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

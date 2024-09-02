import React, { useState } from 'react';
import SaveForm from './SaveForm';
import ConnectionList from './ConnectionList';
import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #f5f5f5;
  min-height: 90vh;
`;

const MainComponent = ({ onConnect, onDisconnect, className }) => {
  const [connections, setConnections] = useState([
    { id: 1, name: 'Local', host: 'localhost', username: 'bufallo', password: 'Hanajay1996%%', isConnected: false },
  ]);

  const handleSave = (newConnection) => {
    setConnections(prev => [...prev, { ...newConnection, isConnected: false , id: prev.length + 1 }]);
  };

  const handleDelete = (connection) => {
    setConnections(prev => prev.filter((conn) => conn.id !== connection.id));
  };

  const handleConnect = (connection) => {
    // Assume onConnect handles the connection logic
    onConnect(connection);
    setConnections(prev =>
      prev.map(conn =>
        conn.id === connection.id ? { ...conn, isConnected: true } : conn
      )
    );
  };

  const handleDisconnect = (connection) => {
    // Assume onDisconnect handles the disconnection logic
    console.log('Disconnecting from:', connection );
    onDisconnect(connection.id);
    setConnections(prev =>
      prev.map(conn =>
        conn.id === connection.id ? { ...conn, isConnected: false } : conn
      )
    );
  };

  return (
    <Wrapper className={className}>
      <SaveForm onSave={handleSave} />
      <ConnectionList
        connections={connections}
        onDelete={handleDelete}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />
    </Wrapper>
  );
};

export default MainComponent;

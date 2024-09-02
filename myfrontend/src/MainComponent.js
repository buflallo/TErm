import React, { useState } from 'react';
import SaveForm from './SaveForm';
import ConnectionList from './ConnectionList';
import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  background-color: #f5f5f5;
`;
const HamburgerButton = styled.div`
  width: 30px;
  height: 24px;
  position: relative;
  cursor: pointer;
  margin: 20px;

  span {
    display: block;
    height: 4px;
    width: 100%;
    background: #333;
    border-radius: 4px;
    position: absolute;
    left: 0;
    transition: all 0.3s ease;
  }

  span:nth-child(1) {
    top: 0;
  }

  span:nth-child(2) {
    top: 10px;
  }

  span:nth-child(3) {
    top: 20px;
  }

  &:hover span {
    background: #ff4500;
  }

  &.open span:nth-child(1) {
    transform: rotate(45deg);
    top: 10px;
  }

  &.open span:nth-child(2) {
    opacity: 0;
  }

  &.open span:nth-child(3) {
    transform: rotate(-45deg);
    top: 10px;
  }
`;

// create an enum for connection status
const ConnectionStatus = {
  PENDING: 'Pending',
  CONNECTED: 'Shutdown',
  DISCONNECTED: 'Run',
};
const MainComponent = ({ onConnect, onDisconnect, onTerminal, className }) => {
  const [connections, setConnections] = useState([]);
  const [isFormVisible, setFormVisible] = useState(false); // Track form visibility

  const handleSave = (newConnection) => {
    setConnections(prev => [...prev, { ...newConnection, isConnected: ConnectionStatus.PENDING, id: prev.length + 1 }]);
  };

  const handleDelete = (connection) => {
    setConnections(prev => prev.filter((conn) => conn.id !== connection.id));
  };

  const handleConnect = (connection) => {
    connection.isConnected = ConnectionStatus.CONNECTED;
    onConnect(connection);
    setConnections(prev =>
      prev.map(conn =>
        conn.id === connection.id ? { ...conn, isConnected: ConnectionStatus.CONNECTED } : conn
      )
    );
  };

  const handleDisconnect = (connection) => {
    console.log('Disconnecting from:', connection );
    onDisconnect(connection.id);
    setConnections(prev =>
      prev.map(conn =>
        conn.id === connection.id ? { ...conn, isConnected: ConnectionStatus.DISCONNECTED } : conn
      )
    );
  };

  const toggleFormVisibility = () => {
    setFormVisible(prev => !prev);
  };

  return (
    <Wrapper className={className}>
      <HamburgerButton className={isFormVisible ? 'open' : ''} onClick={toggleFormVisibility}>
        <span></span>
        <span></span>
        <span></span>
      </HamburgerButton>
      {isFormVisible && <SaveForm onSave={handleSave} />} {/* Toggle form visibility */}
      <ConnectionList
        connections={connections}
        onTerminal={onTerminal}
        onDelete={handleDelete}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />
    </Wrapper>
  );
};

export default MainComponent;

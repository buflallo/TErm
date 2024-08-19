import React from 'react';
import styled from 'styled-components';
import { FaTrashAlt } from 'react-icons/fa';

const ListWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 20px;
  overflow-x: auto;
  width: 100%;
`;

const ConnectionCircle = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  background-color: ${(props) => props.bgColor || '#4caf50'};
  color: white;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  margin: 10px;
  padding: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  position: relative;
`;

const ConnectionName = styled.div`
  font-size: 18px;
  font-weight: bold;
  text-align: center;
`;

const DeleteIcon = styled(FaTrashAlt)`
  bottom: 15px;
  cursor: pointer;
  color: white;
  &:hover {
    color: #f44336;
  }
`;

const ConnectButton = styled.button`
  background: linear-gradient(45deg, #ff6ec4, #7873f5);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 15px;
  box-shadow: 0 6px 10px rgba(0, 0, 0, 0.15);
  transition: background 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    background: linear-gradient(45deg, #ff72ac, #6e68d8);
    transform: scale(1.05);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
  }

  &:active {
    background: linear-gradient(45deg, #e35ba0, #5c52b7);
    transform: scale(0.98);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 4px rgba(255, 110, 196, 0.5);
  }
`;

const ConnectionList = ({ connections, onDelete, onConnect, onDisconnect }) => {
  const colors = ['#4caf50', '#2196f3', '#ff5722', '#9c27b0', '#fbc02d'];

  return (
    <ListWrapper>
      {connections.length > 0 ? (
        connections.map((connection) => (
          <ConnectionCircle key={connection.id} bgColor={colors[connection.id % colors.length]}>
            <ConnectionName>{connection.name}</ConnectionName>
            {!connection.isConnected ? (
              <ConnectButton onClick={() => onConnect(connection)}>
                Connect
              </ConnectButton>
            ) : (
              <ConnectButton onClick={() => onDisconnect(connection)}>
                Disconnect
              </ConnectButton>
            )}
            <DeleteIcon onClick={() => onDelete(connection)} size={20} />
          </ConnectionCircle>
        ))
      ) : (
        <p>No connections saved yet.</p>
      )}
    </ListWrapper>
  );
};

export default ConnectionList;

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaTrashAlt } from 'react-icons/fa';
import axios from 'axios';

const ListWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-evenly;
  margin-top: 20px;
  overflow-x: auto;
  width: 100%;
`;

const ConnectionCircle = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  background: ${(props) => `url(${props.imageUrl}) no-repeat center center`};
  background-size: cover;
  color: white;
  width: 80px;
  height: 80px;
  border-radius: 15%;
  margin: 10px;
  padding: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden; /* Ensure the content stays within the circle */
`;

const ConnectionName = styled.div`
  font-size: 18px;
  font-weight: bold;
  text-align: center;
`;

const DeleteIcon = styled(FaTrashAlt)`
  top: 5px;
  position: absolute;
  left: 5px;
  cursor: pointer;
  color: black;
  &:hover {
    color: #f44336;
  }
`;

const ConnectButton = styled.button`
  background: linear-gradient(45deg, #ff7f50, #ff4500);
  color: #f8f8ff;
  border: 2px solid #333;
  border-radius: 6px;
  padding: 12px 20px;
  font-size: 15px;
  font-weight: 600;
  font-family: 'Montserrat', sans-serif;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), inset 0 0 0 2px #ffdab9;
  transition: background 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease;

  &:hover {
    background: linear-gradient(45deg, #ff6347, #ff2400);
    transform: scale(1.03);
    box-shadow: 0 6px 10px rgba(0, 0, 0, 0.15), inset 0 0 0 2px #ffd700;
  }

  &:active {
    background: linear-gradient(45deg, #e9967a, #ff7f50);
    transform: scale(0.98);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 0 0 2px #ffdead;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 4px rgba(255, 127, 80, 0.4), inset 0 0 0 2px #ffdab9;
  }
`;
const ConnectionStatus = {
  PENDING: 'Pending',
  CONNECTED: 'Shutdown',
  DISCONNECTED: 'Run',
};
const ConnectionList = ({ connections, onDelete, onConnect, onDisconnect, onTerminal }) => {
  const [updatedConnections, setUpdatedConnections] = useState(connections);
  
  useEffect(() => {
    // Establish WebSocket connection
    const socket = new WebSocket('ws://localhost:8001/ws/job-status/');

    socket.onmessage = function (e) {
      const data = JSON.parse(e.data);
      console.log('Job Status: ', data.message);
      console.log('container ID: ', data.containerId);
      console.log('Job Status: ', data.status);
      // Update the connections state based on the WebSocket message
      const ContainerStatus = data.status === 'exec completed' || data.status === 'run completed'
        ? ConnectionStatus.CONNECTED
        : data.status === 'stop completed' 
        ? ConnectionStatus.DISCONNECTED
        : ConnectionStatus.PENDING;
      
      console.log('ContainerStatus: ', ContainerStatus);

      setUpdatedConnections(prevConnections => 
        prevConnections.map((connection) => {
          if (connection.selectedSystem.containerId === data.containerId) {
            // Call the appropriate callback based on the container status
            if (ContainerStatus === ConnectionStatus.CONNECTED) {
              onConnect(connection);
            } else if (ContainerStatus === ConnectionStatus.DISCONNECTED) {
              onDisconnect(connection);
            }
            return {
              ...connection,
              isConnected: ContainerStatus,
            };
          }
          return connection;
        })
      );
    };

    socket.onclose = function (e) {
      console.error('WebSocket closed unexpectedly');
    };

    return () => {
      // Clean up the WebSocket connection when the component unmounts
      socket.close();
    };
  }, []); // Empty dependency array to ensure WebSocket connection is established only once

  useEffect(() => {
    console.log('Initial connections:', connections);
    setUpdatedConnections(connections);
  }, [connections]);


  // let's create a function to handle disconnecting from a connection
  const handleDisconnect = async (connection) => { 
    try {
      setUpdatedConnections(prevConnections =>
        prevConnections.map((conn) => {
          if (conn.id === connection.id) {
            return {
              ...conn,
              isConnected: ConnectionStatus.PENDING,
            };
          }
          return conn;
        })
      )
      const response = await axios.post('http://localhost:8000/api/shutdown-instance/', {
        containerId: connection.selectedSystem.containerId,
      }, { timeout: 6000 });
      console.log('Instance shutting down', response.data);
    } catch (error) {
      console.error('Error shutting down instance:', error);
    }
  };

  const colors = ['#4caf50', '#2196f3', '#ff5722', '#9c27b0', '#fbc02d'];

  return (
    <ListWrapper>
      {updatedConnections.length > 0 ? (
        updatedConnections.map((connection) => (
            <div key={connection.id} style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <ConnectionCircle imageUrl={connection.selectedSystem.imageUrl || colors[connection.id % colors.length]}>
              <ConnectionName>{connection.name}</ConnectionName>
              <DeleteIcon onClick={() => onDelete(connection)} size={20} />
            </ConnectionCircle>
            {connection.isConnected === ConnectionStatus.DISCONNECTED ? (
                <ConnectButton onClick={() => onConnect(connection)}>
                  Run
                </ConnectButton>
            ) : connection.isConnected === ConnectionStatus.CONNECTED ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '10px' }}>
                <ConnectButton onClick={() => handleDisconnect(connection)}>
                  Shutdown
                </ConnectButton>
                <button style={{ width: '47px', height: '44px', background: 'url(/term.png) no-repeat center center', backgroundSize: 'cover', alignSelf: 'center', cursor: 'pointer' }} onClick={() => onTerminal(connection.id)} />
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
                <h3 style={{ color: 'gray' }}>Loading...</h3>
                <div className="loading-dots">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
            
            </div>
        ))
      ) : (
        <h2 style={{ color: 'gray' }}>No Instances</h2>
      )}
    </ListWrapper>
  );
};

export default ConnectionList;

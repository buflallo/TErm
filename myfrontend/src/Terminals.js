import React, { useState } from 'react';
import styled from 'styled-components';
import Terminal from './Terminal';

// Styling for the tabs
const TabsContainer = styled.div`
  display: flex;
  border-bottom: 2px solid #ddd;
  margin-bottom: 10px;
`;

const Tab = styled.button`
  padding: 10px 20px;
  cursor: pointer;
  background-color: ${(props) => (props.active ? '#f0f0f0' : 'white')};
  border: none;
  border-bottom: ${(props) => (props.active ? '2px solid #007BFF' : 'none')};
  font-weight: ${(props) => (props.active ? 'bold' : 'normal')};
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #f0f0f0;
  }
`;

const TerminalContainer = styled.div`
  width: 100%;
  height: 100%;
`;

const Terminals = ({ connections, activeTerminals, handleDisconnect }) => {
  const [activeTab, setActiveTab] = useState(connections[0]?.id || null);

  return (
    <div>
      <TabsContainer>
        {connections.map((connection) => (
            activeTerminals[connection.id] && (
                <Tab
                  key={connection.id}
                  active={activeTab === connection.id}
                  onClick={() => setActiveTab(connection.id)}
                >
                    {connection.selectedSystem.name}
                </Tab>
            )
        ))}
      </TabsContainer>

      <TerminalContainer>
        {connections.map((connection) => (
          <div
            key={connection.id}
            style={{
              display: connection.id === activeTab ? 'block' : 'none',
            }}
          >
            {activeTerminals[connection.id] && (
              <Terminal 
                connection={connection} 
                onDisconnect={() => handleDisconnect(connection.id)}
                activeTerminals={activeTerminals}
              />
            )}
          </div>
        ))}
      </TerminalContainer>
    </div>
  );
};

export default Terminals;

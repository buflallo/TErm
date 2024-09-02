import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const FormWrapper = styled.div`
  background: linear-gradient(135deg, #ffffff, #f0f4f8);
  padding: 30px;
  border-radius: 12px;
  max-width: 600px;
  margin: 0 auto;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
`;

const FormTitle = styled.h2`
  font-size: 28px;
  color: #333;
  margin-bottom: 24px;
  text-align: center;
  font-family: 'Arial', sans-serif;
  font-weight: bold;
`;

const Label = styled.label`
  display: block;
  font-size: 18px;
  margin-bottom: 8px;
  color: #333;
  font-weight: bold;
  text-align: left;
`;

const ImageSelectWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
`;

const ImageSelect = styled.div`
  position: relative;
  border: ${(props) => (props.selected ? '4px solid #4caf50' : '2px solid #ddd')};
  border-radius: 8px;
  padding: 4px;
  cursor: pointer;
  transition: border-color 0.3s ease;

  img {
    display: block;
    width: 100px;
    height: 100px;
    border-radius: 4px;
  }
`;

const SelectedIcon = styled.div`
  position: absolute;
  top: 4px;
  right: 4px;
  background-color: #4caf50;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-size: 16px;
  font-weight: bold;
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
  margin-top: 15px;
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
const SaveForm = ({ onSave }) => {
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [selectedPackages, setSelectedPackages] = useState([]);

  const systems = [
    { id: 1, name: 'Debian', imageUrl: '/systems/logo-debian.png' },
    { id: 2, name: 'Ubuntu', imageUrl: '/systems/logo-ubuntu.png' },
    { id: 3, name: 'Alpine', imageUrl: '/systems/logo-alpine.png' },
  ];

  const packages = [
    { id: 1, name: 'Python', imageUrl: '/packages/logo-python.png' },
    { id: 2, name: 'Anaconda', imageUrl: '/packages/logo-anaconda.png' },
    { id: 3, name: 'C++', imageUrl: '/packages/logo-c++.png' },
  ];

  const handleSystemSelect = (systemId) => {
    setSelectedSystem(systemId);
  };

  const handlePackageSelect = (pkg) => {
    setSelectedPackages(prev => {  
      if (selectedPackages.includes(pkg.id)) {
        // If already selected, remove it
        return selectedPackages.filter(id => id !== pkg.id);
      } else {
        // If not selected, add it
        return [...prev, pkg.id];
      }
    });
  };

  const handleCreateInstance = async (systemId, packageIds) => {
    try {
      const response = await axios.post('http://localhost:8000/api/create-instance/', {
        selectedSystem: systemId,
        selectedPackages: packageIds,
      }, {
        timeout: 60000,  // Set a timeout of 6 seconds
      });

      console.log('Instance created successfully:', response.data);
      const containerId = response.data.containerId;
      selectedSystem.containerId = containerId;
    } catch (error) {
      console.error('Error creating instance:', error);
    }

  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedSystem && selectedPackages) {
      handleCreateInstance(selectedSystem.id, selectedPackages);
      console.log('Selected System:', selectedSystem);
      onSave({ selectedSystem, selectedPackages });
    } else {
      alert('Please select both a system and a package.');
    }
  };

  return (
    <FormWrapper>
      <FormTitle>Create Instance</FormTitle>
      <form onSubmit={handleSubmit} style={{ textAlign: 'center' }}>
        <Label>Select System</Label>
        <ImageSelectWrapper>
          {systems.map((system) => (
            <ImageSelect
              key={system.id}
              selected={system.id === selectedSystem?.id}
              onClick={() => handleSystemSelect(system)}
            >
              <img src={system.imageUrl} alt={system.name} />
              {system.id === selectedSystem?.id && <SelectedIcon>✓</SelectedIcon>}
            </ImageSelect>
          ))}
        </ImageSelectWrapper>

        <Label>Select Package(s)</Label>
        <ImageSelectWrapper>
          {packages.map((pkg) => (
            <ImageSelect
              key={pkg.id}
              selected={selectedPackages?.includes(pkg.id)}
              onClick={() => handlePackageSelect(pkg)}
              multiple 
              required
            >
                <img src={pkg.imageUrl} alt={pkg.name} />
                {selectedPackages?.includes(pkg.id) && <SelectedIcon>✓</SelectedIcon>}
            </ImageSelect>
          ))}
        </ImageSelectWrapper>

        <ConnectButton type="submit">Create Instance</ConnectButton>
      </form>
    </FormWrapper>
  );
};

export default SaveForm;

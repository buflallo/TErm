import React, { useState } from 'react';
import styled from 'styled-components';

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

const Input = styled.input`
  width: calc(100% - 24px);  /* Account for padding */
  padding: 14px;
  margin: 12px 0;
  border: 2px solid #ddd;
  border-radius: 8px;
  background-color: #fff;
  box-sizing: border-box;
  font-size: 16px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;

  &:focus {
    border-color: #4caf50;
    box-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
    outline: none;
  }
`;

const Button = styled.button`
  background: linear-gradient(45deg, #4caf50, #66bb6a);
  color: white;
  padding: 16px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: background 0.3s ease, transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    background: linear-gradient(45deg, #45a049, #5cb85c);
    transform: scale(1.05);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
  }

  &:active {
    background: linear-gradient(45deg, #388e3c, #4a8a4d);
    transform: scale(0.98);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
`;


const SaveForm = ({ onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    username: '',
    port: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setFormData({ name: '', host: '', username: '', port: '', password: '' });
  };

  return (
    <FormWrapper>
      <FormTitle>Create Instance</FormTitle>
      <form onSubmit={handleSubmit}>
        <Input
          type="text"
          name="name"
          placeholder="Connection Name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <Input
          type="text"
          name="host"
          placeholder="Host"
          value={formData.host}
          onChange={handleChange}
          required
        />
        <Input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          required
        />
        <Input
          type="number"
          name="port"
          placeholder="Port"
          value={formData.port}
          onChange={handleChange}
          required
        />
        <Input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <Button type="submit">Save Connection</Button>
      </form>
    </FormWrapper>
  );
};

export default SaveForm;

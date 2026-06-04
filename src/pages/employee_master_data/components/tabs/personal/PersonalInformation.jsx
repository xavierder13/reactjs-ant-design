"use client";


import { useState } from "react";
import { Form, Input, Row, Col, DatePicker, Select } from "antd";
import dayjs from "dayjs";

export default function PersonalInformation() {

  const [form] = Form.useForm();
  const [age, setAge] = useState<number | undefined>();

  // Auto compute age when DOB changes
  const handleDobChange = (date: any) => {
    if (!date) {
      setAge(undefined);
      return;
    }
    const today = dayjs();
    const birthDate = dayjs(date);
    const calculatedAge = today.diff(birthDate, "year");
    setAge(calculatedAge);
    form.setFieldsValue({ age: calculatedAge });
  };

  return (
    <Form form={form} layout="vertical">
      <Row gutter={16}>
        <Col xs={24} md={8} lg={8} xl={6}>
          <Form.Item
            label="Last Name"
            name="lastname"
            rules={[
              { required: true, message: "Last name is required" }
            ]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={8} lg={8} xl={6}>
          <Form.Item
            label="First Name"
            name="firstname"
            rules={[
              { required: true, message: "First name is required" }
            ]}
          >
            <Input />
          </Form.Item>
        </Col>
         <Col xs={24} md={8} lg={8} xl={6}>
          <Form.Item
            label="Middle Name"
            name="middlename"
          >
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} md={8} lg={8} xl={6}>
          <Form.Item
            label="Date of Birth"
            name="dob"
            rules={[{ required: true, message: "Date of Birth is required" }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              onChange={handleDobChange}
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={8} lg={8} xl={6}>
          <Form.Item label="Age" name="age">
            <Input value={age} readOnly />
          </Form.Item>
        </Col>

        <Col xs={24} md={8} lg={8} xl={6}>
          <Form.Item
            label="Gender"
            name="gender"
            rules={[{ required: true, message: "Gender is required" }]}
          >
            <Select 
              placeholder="Select gender"
              options={[
                { label: "Male", value: "Male" },
                { label: "Female", value: "Female" },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} md={8} lg={8} xl={6}>
          <Form.Item
            label="Civil Status"
            name="civilStatus"
            rules={[{ required: true, message: "Civil Status is required" }]}
          >
            <Select 
              placeholder="Select civil status"
              options={[
                { label: "Single", value: "Single" },
                { label: "Married", value: "Married" },
                { label: "Widowed", value: "Widowed" },
                { label: "Separated", value: "Separated" },
                { label: "Divorced", value: "Divorced" }
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8} lg={8} xl={6}>
          <Form.Item
            label="Contact Number"
            name="contact"
            rules={[
              { required: true, message: "Contact number required" },
              { pattern: /^[0-9]+$/, message: "Numbers only allowed" }
            ]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={8} lg={8} xl={6}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { 
                type: "email", 
                message: "Please enter a valid email address" 
              }
            ]}
          >
            <Input placeholder="Enter email (optional)" />
          </Form.Item>
        </Col>
      </Row>

    </Form>
  );
}
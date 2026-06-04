"use client";

import { Form, Input, Row, Col, InputNumber } from "antd";

export default function EmployeeDetailsTab() {
  return (
    <Form layout="vertical">

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Employee ID"
            name="employee_id"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="Salary"
            name="salary"
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>

    </Form>
  );
}
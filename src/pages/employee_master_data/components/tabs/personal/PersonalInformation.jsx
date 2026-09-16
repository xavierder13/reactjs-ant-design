"use client";

import { Form, Input, Row, Col, DatePicker, Select } from "antd";
import dayjs from "dayjs";

// Civil Status matches EmployeeMasterDataController's server-side validator
// exactly (Single/Married/Widowed/Legally Separated) rather than the Vue
// reference's dropdown, which offers "Divorced" — a value the vueportal
// backend actually rejects with a 422. Keep this list in sync with the
// backend validator if it ever changes; don't restore "Divorced".
const CIVIL_STATUS_OPTIONS = [
  { label: "Single", value: "Single" },
  { label: "Married", value: "Married" },
  { label: "Widowed", value: "Widowed" },
  { label: "Legally Separated", value: "Legally Separated" },
];

const GENDER_OPTIONS = [
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
];

// Renders bare Form.Item fields only — no own <Form>/useForm instance.
// It relies on the ancestor <Form> rendered by EmployeeForm.jsx (React
// context), the same way Manpower Request's line-item fields rely on
// ManpowerRequestForm's single Form instance. Do not wrap this in its own
// <Form>: that would silently detach these fields from the shared submit/
// validateFields() call and from Form's `disabled` cascade (view mode).
export default function PersonalInformation() {
  // Form.useWatch, not local state + DatePicker onChange — the earlier
  // version only updated on user interaction, so opening an existing
  // employee (birth_date set programmatically via form.setFieldsValue in
  // EmployeeForm.jsx, which does not fire a field's own onChange) always
  // showed a blank Age in View/Edit. useWatch reacts to the form value
  // itself regardless of how it was set. Real bug found and fixed 2026-09-15.
  const birthDate = Form.useWatch("birth_date");
  const age = birthDate ? dayjs().diff(dayjs(birthDate), "year") : undefined;

  return (
    <>
          <Row gutter={16}>
            <Col xs={24} md={8} lg={6}>
              <Form.Item
                label="Employee Code"
                name="employee_code"
                rules={[{ required: true, message: "Employee code is required" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8} lg={6}>
              <Form.Item
                label="Last Name"
                name="last_name"
                rules={[{ required: true, message: "Last name is required" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8} lg={6}>
              <Form.Item
                label="First Name"
                name="first_name"
                rules={[{ required: true, message: "First name is required" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8} lg={6}>
              <Form.Item label="Middle Name" name="middle_name">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8} lg={6}>
              <Form.Item
                label="Date of Birth"
                name="birth_date"
                rules={[{ required: true, message: "Date of birth is required" }]}
              >
                <DatePicker
                  style={{ width: "100%" }}
                  format="MM-DD-YYYY"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8} lg={6}>
              <Form.Item label="Age">
                <Input value={age} readOnly disabled />
              </Form.Item>
            </Col>
            <Col xs={24} md={8} lg={6}>
              <Form.Item
                label="Gender"
                name="gender"
                rules={[{ required: true, message: "Gender is required" }]}
              >
                <Select placeholder="Select gender" options={GENDER_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8} lg={6}>
              <Form.Item
                label="Civil Status"
                name="civil_status"
                rules={[{ required: true, message: "Civil status is required" }]}
              >
                <Select placeholder="Select civil status" options={CIVIL_STATUS_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8} lg={6}>
              <Form.Item
                label="Contact Number"
                name="contact"
                rules={[
                  { required: true, message: "Contact number is required" },
                  { pattern: /^[0-9]+$/, message: "Numbers only allowed" },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8} lg={6}>
              <Form.Item
                label="Email"
                name="email"
                rules={[{ type: "email", message: "Please enter a valid email address" }]}
              >
                <Input placeholder="Enter email (optional)" />
              </Form.Item>
            </Col>
            <Col xs={24} md={16} lg={12}>
              <Form.Item
                label="Address"
                name="address"
                rules={[{ required: true, message: "Address is required" }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8} lg={6}>
              <Form.Item
                label="TIN #"
                name="tin_no"
                rules={[{ required: true, message: "TIN number is required" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8} lg={6}>
              <Form.Item
                label="Pag-IBIG #"
                name="pagibig_no"
                rules={[{ required: true, message: "Pag-IBIG number is required" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8} lg={6}>
              <Form.Item
                label="PhilHealth #"
                name="philhealth_no"
                rules={[{ required: true, message: "PhilHealth number is required" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8} lg={6}>
              <Form.Item
                label="SSS #"
                name="sss_no"
                rules={[{ required: true, message: "SSS number is required" }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8} lg={6}>
              <Form.Item
                label="Educational Attainment"
                name="educ_attain"
                rules={[{ required: true, message: "Educational attainment is required" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8} lg={6}>
              <Form.Item label="School Year" name="school_year">
                <Input placeholder="e.g. 2018-2022" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8} lg={6}>
              <Form.Item
                label="School Attended"
                name="school_attended"
                rules={[{ required: true, message: "School attended is required" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8} lg={6}>
              <Form.Item
                label="Course"
                name="course"
                rules={[{ required: true, message: "Course is required" }]}
              >
                <Input />
              </Form.Item>
            </Col>
      </Row>
    </>
  );
}

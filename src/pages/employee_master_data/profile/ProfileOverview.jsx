import { useState } from "react";
import { Card, Descriptions, Row, Col, Button, Space, Tooltip } from "antd";
import { EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";

import { formatDate } from "../../../utils/formatDate";

const show = (value) => (value === null || value === undefined || value === "" ? "-" : value);

// Government ID numbers are shown masked (last 4 digits) until revealed —
// they're sensitive and the profile is often viewed with others around.
function MaskedValue({ value }) {
  const [revealed, setRevealed] = useState(false);
  if (!value) return "-";
  const text = String(value);
  const masked = text.length > 4 ? `${"•".repeat(Math.min(text.length - 4, 8))}${text.slice(-4)}` : text;
  return (
    <Space size={4}>
      <span style={{ fontFamily: "monospace" }}>{revealed ? text : masked}</span>
      <Tooltip title={revealed ? "Hide" : "Show"}>
        <Button
          type="text"
          size="small"
          icon={revealed ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          onClick={() => setRevealed((r) => !r)}
        />
      </Tooltip>
    </Space>
  );
}

const SECTION_DESCRIPTIONS = { column: { xs: 1, sm: 2 }, size: "small" };

// Personal Data, read-only: personal details, contact & address,
// government IDs and education (EmployeeProfile2.vue's PERSONAL DATA tab).
export default function ProfileOverview({ employee }) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={12}>
        <Card title="Personal Information" size="small" style={{ height: "100%" }}>
          <Descriptions {...SECTION_DESCRIPTIONS} items={[
            { key: "Last Name", label: "Last Name", children: show(employee.last_name) },
            { key: "First Name", label: "First Name", children: show(employee.first_name) },
            { key: "Middle Name", label: "Middle Name", children: show(employee.middle_name) },
            { key: "Birth Date", label: "Birth Date", children: formatDate(employee.birth_date ?? employee.dob) },
            { key: "Age", label: "Age", children: show(employee.age) },
            { key: "Gender", label: "Gender", children: show(employee.gender) },
            { key: "Civil Status", label: "Civil Status", children: show(employee.civil_status) },
          ]} />
        </Card>
      </Col>
      <Col xs={24} xl={12}>
        <Card title="Contact & Address" size="small" style={{ height: "100%" }}>
          <Descriptions {...SECTION_DESCRIPTIONS} column={1} items={[
            { key: "Email", label: "Email", children: employee.email ? <a href={`mailto:${employee.email}`}>{employee.email}</a> : "-" },
            { key: "Mobile", label: "Mobile", children: show(employee.contact) },
            { key: "Home Address", label: "Home Address", children: show(employee.address) },
          ]} />
        </Card>
      </Col>
      <Col xs={24} xl={12}>
        <Card title="Government IDs" size="small" style={{ height: "100%" }}>
          <Descriptions {...SECTION_DESCRIPTIONS} items={[
            { key: "TIN", label: "TIN", children: <MaskedValue value={employee.tin_no} /> },
            { key: "SSS", label: "SSS", children: <MaskedValue value={employee.sss_no} /> },
            { key: "PhilHealth", label: "PhilHealth", children: <MaskedValue value={employee.philhealth_no} /> },
            { key: "Pag-IBIG", label: "Pag-IBIG", children: <MaskedValue value={employee.pagibig_no} /> },
          ]} />
        </Card>
      </Col>
      <Col xs={24} xl={12}>
        <Card title="Education" size="small" style={{ height: "100%" }}>
          <Descriptions {...SECTION_DESCRIPTIONS} items={[
            { key: "Attainment", label: "Attainment", children: show(employee.educ_attain) },
            { key: "School Year", label: "School Year", children: show(employee.school_year) },
            { key: "School", label: "School", children: show(employee.school_attended) },
            { key: "Course", label: "Course", children: show(employee.course) },
          ]} />
        </Card>
      </Col>
    </Row>
  );
}

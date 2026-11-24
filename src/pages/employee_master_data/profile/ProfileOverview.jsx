import { useState } from "react";
import { Descriptions, Row, Col, Button, Space, Tooltip } from "antd";
import {
  EyeOutlined, EyeInvisibleOutlined, UserOutlined, HomeOutlined, SafetyCertificateOutlined, ReadOutlined,
} from "@ant-design/icons";
import { SectionCard } from "./profileUi";
import useDescriptionStyles from "./useDescriptionStyles";

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

// Personal Data, read-only: personal details, contact & address,
// government IDs and education (EmployeeProfile2.vue's PERSONAL DATA tab).
export default function ProfileOverview({ employee }) {
  const desc = useDescriptionStyles();
  // Personal Information: 2 per row on small screens, 3 from `md` up.
  // Government IDs / Education: always 2 per row (2 rows of 2).
  const personal = { ...desc, column: { xs: 1, sm: 2, md: 3 } };
  const grid = { ...desc, column: 2 };
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={12}>
        <SectionCard icon={<UserOutlined />} title="Personal Information">
          <Descriptions {...personal} items={[
            { key: "Last Name", label: "Last Name", children: show(employee.last_name) },
            { key: "First Name", label: "First Name", children: show(employee.first_name) },
            { key: "Middle Name", label: "Middle Name", children: show(employee.middle_name) },
            { key: "Birth Date", label: "Birth Date", children: formatDate(employee.birth_date ?? employee.dob) },
            { key: "Age", label: "Age", children: show(employee.age) },
            { key: "Gender", label: "Gender", children: show(employee.gender) },
            { key: "Civil Status", label: "Civil Status", children: show(employee.civil_status) },
          ]} />
        </SectionCard>
      </Col>
      <Col xs={24} xl={12}>
        <SectionCard icon={<HomeOutlined />} title="Contact & Address">
          <Descriptions {...desc} column={1} items={[
            { key: "Email", label: "Email", children: employee.email ? <a href={`mailto:${employee.email}`}>{employee.email}</a> : "-" },
            { key: "Mobile", label: "Mobile", children: show(employee.contact) },
            { key: "Home Address", label: "Home Address", children: show(employee.address) },
          ]} />
        </SectionCard>
      </Col>
      <Col xs={24} xl={12}>
        <SectionCard icon={<SafetyCertificateOutlined />} title="Government IDs">
          <Descriptions {...grid} items={[
            { key: "TIN", label: "TIN", children: <MaskedValue value={employee.tin_no} /> },
            { key: "SSS", label: "SSS", children: <MaskedValue value={employee.sss_no} /> },
            { key: "PhilHealth", label: "PhilHealth", children: <MaskedValue value={employee.philhealth_no} /> },
            { key: "Pag-IBIG", label: "Pag-IBIG", children: <MaskedValue value={employee.pagibig_no} /> },
          ]} />
        </SectionCard>
      </Col>
      <Col xs={24} xl={12}>
        <SectionCard icon={<ReadOutlined />} title="Education">
          <Descriptions {...grid} items={[
            { key: "Attainment", label: "Attainment", children: show(employee.educ_attain) },
            { key: "School Year", label: "School Year", children: show(employee.school_year) },
            { key: "School", label: "School", children: show(employee.school_attended) },
            { key: "Course", label: "Course", children: show(employee.course) },
          ]} />
        </SectionCard>
      </Col>
    </Row>
  );
}

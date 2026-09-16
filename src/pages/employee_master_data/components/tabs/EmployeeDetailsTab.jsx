"use client";

import { Form, Input, Row, Col, DatePicker, Select, Switch, Descriptions, Button, Space, App } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import useBranches from "../../../../hooks/useBranches";
import useDepartments from "../../../../hooks/useDepartments";
import usePositions from "../../../../hooks/usePositions";

// Matches vueportal's recruitment portal referral link format exactly
// (EmployeeInformationTabs.vue's `referralLink` computed property) —
// keep these in sync if the recruitment portal's URL/query param changes.
const buildReferralLink = (code) => `https://recruitment.addessa.com/careers?ref=${code}`;

// Matches EmployeeMasterDataController's validator() field-for-field
// (Probationary/Regular — case must match exactly).
const EMPLOYMENT_TYPE_OPTIONS = [
  { label: "Probationary", value: "Probationary" },
  { label: "Regular", value: "Regular" },
];

// Renders bare Form.Item fields only, inside EmployeeForm.jsx's shared
// <Form> — see PersonalInformation.jsx's header comment for why.
//
// Rank / Division / Company / Cost Center / Date Assigned / Length of
// Service are server-computed or come from nested relations
// (position.rank, department.division, branch.company) that are NOT
// confirmed to be present on every `/employee_master_data/index` row or
// on the router-state record used to open this form — they're rendered
// defensively (optional chaining, blank when absent) and are read-only
// display only, never sent in the payload. Verify against a real API
// response before assuming they're always populated.
//
// Promodizer Brand (Vue: conditional on Position = "Sales Specialist") is
// intentionally omitted — this repo has no confirmed lookup store/hook for
// promodizer brands yet. Add one (following useBranches/useDepartments'
// pattern) before reintroducing this field; don't invent the endpoint.
export default function EmployeeDetailsTab({ initialData, mode }) {
  const { message: messageApi } = App.useApp();
  const { branchOptions } = useBranches();
  const { departmentOptions } = useDepartments();
  const { positionOptions } = usePositions();

  const isEdit = mode === "edit" || mode === "view";
  const referralCode = initialData?.referral?.referral_code;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(buildReferralLink(referralCode))
      .then(() => messageApi.success('Referral link copied!'))
      .catch(() => messageApi.error('Could not copy link.'));
  };

  return (
    <>
      <Row gutter={16}>
        <Col xs={24} md={8} lg={6}>
          <Form.Item label="Job Title Code" name="job_title_code">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={8} lg={6}>
          <Form.Item
            label="Position"
            name="position_id"
            rules={[{ required: true, message: "Position is required" }]}
          >
            <Select placeholder="Select position" options={positionOptions} showSearch optionFilterProp="label" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8} lg={6}>
          <Form.Item
            label="Department"
            name="department_id"
            rules={[{ required: true, message: "Department is required" }]}
          >
            <Select placeholder="Select department" options={departmentOptions} showSearch optionFilterProp="label" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8} lg={6}>
          <Form.Item
            label="Branch"
            name="branch_id"
            rules={[{ required: true, message: "Branch is required" }]}
          >
            <Select placeholder="Select branch" options={branchOptions} showSearch optionFilterProp="label" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={8} lg={6}>
          <Form.Item
            label="Employment Type"
            name="employment_type"
            rules={[{ required: true, message: "Employment type is required" }]}
          >
            <Select placeholder="Select type" options={EMPLOYMENT_TYPE_OPTIONS} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8} lg={6}>
          <Form.Item
            label="Date Employed"
            name="date_employed"
            rules={[{ required: true, message: "Date employed is required" }]}
          >
            <DatePicker style={{ width: "100%" }} format="MM-DD-YYYY" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8} lg={6}>
          <Form.Item label="Date Resigned" name="date_resigned">
            <DatePicker style={{ width: "100%" }} format="MM-DD-YYYY" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8} lg={6}>
          <Form.Item label="Application Source" name="application_source">
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={8} lg={6}>
          <Form.Item
            label="Active"
            name="active"
            valuePropName="checked"
            initialValue={mode === "create" ? true : undefined}
          >
            <Switch />
          </Form.Item>
        </Col>
      </Row>

      {isEdit && referralCode && (
        <Row gutter={16}>
          <Col xs={24} md={8} lg={6}>
            <Form.Item label="Referral Code">
              <Space.Compact style={{ width: "100%" }}>
                <Input value={referralCode} readOnly />
                <Button icon={<CopyOutlined />} onClick={copyReferralLink} />
              </Space.Compact>
            </Form.Item>
          </Col>
        </Row>
      )}

      {isEdit && (
        <Descriptions
          size="small"
          column={{ xs: 1, sm: 2, md: 3 }}
          style={{ marginTop: 8 }}
          items={[
            { key: "rank", label: "Rank", children: initialData?.position?.rank?.name || "-" },
            { key: "division", label: "Division", children: initialData?.department?.division?.name || "-" },
            { key: "company", label: "Company", children: initialData?.branch?.company?.name || "-" },
            { key: "cost_center", label: "Cost Center", children: initialData?.cost_center || "-" },
            { key: "date_assigned", label: "Date Assigned", children: initialData?.date_assigned || "-" },
            { key: "length_of_service", label: "Length of Service", children: initialData?.length_of_service || "-" },
          ]}
        />
      )}
    </>
  );
}

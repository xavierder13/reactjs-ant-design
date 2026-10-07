"use client";

import { Form, Input, Row, Col, DatePicker, Select, Descriptions, Button, Space, App } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import useEmployeeFormOptions from "../../../../hooks/useEmployeeFormOptions";

import { DISPLAY_DATE_FORMAT, formatDate } from "../../../../utils/formatDate";
import { EMPLOYMENT_TYPE_OPTIONS } from "../../../../utils/employmentTypes";
import ReadOnlyDateInput from "../ReadOnlyDateInput";
import { buildReferralLink, copyText } from "../../../../utils/referralLink";


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
// intentionally omitted — /employee_master_data/create doesn't return
// promodizer brands yet. Add them there (and to useEmployeeFormOptions)
// before reintroducing this field; don't invent the endpoint.
export default function EmployeeDetailsTab({ initialData, mode }) {
  const { message: messageApi } = App.useApp();
  // From the module's own /employee_master_data/create — not the
  // Organization endpoints, which need branch-list/department-list/
  // position-list that HR roles don't have.
  const { branchOptions, departmentOptions, positionOptions } = useEmployeeFormOptions();
  const isEdit = mode === "edit" || mode === "view";
  // User-requested, scoped to create mode only: Date Employed may not be in
  // the future. (Date Resigned is read-only — the Offboarding resign/rehire
  // flow sets it, see patchEmployee in EmployeeForm.jsx.)
  const isCreateMode = mode === "create";
  const disableFutureDates = (current) => current && current.isAfter(dayjs(), "day");
  const referralCode = initialData?.referral?.referral_code;

  const copyReferralLink = () => {
    copyText(buildReferralLink(referralCode))
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
            rules={[
              { required: true, message: "Date employed is required" },
              ...(isCreateMode ? [{
                validator: (_, value) => (
                  value && value.isAfter(dayjs(), "day")
                    ? Promise.reject(new Error("Date Employed cannot be a future date."))
                    : Promise.resolve()
                ),
              }] : []),
            ]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format={DISPLAY_DATE_FORMAT}
              disabledDate={isCreateMode ? disableFutureDates : undefined}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8} lg={6}>
          {/* Read-only: set by the Offboarding tab (employeeApi.resign) from
              the record's Last Day of Work. */}
          <Form.Item
            label="Date Resigned"
            name="date_resigned"
            extra="Set from the Offboarding record's Last Day of Work."
          >
            <ReadOnlyDateInput placeholder="Not resigned" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8} lg={6}>
          <Form.Item label="Application Source" name="application_source">
            <Input />
          </Form.Item>
        </Col>
      </Row>

      {/* Status isn't shown here — it's always in the card title (edit) and
          is always Active on create. Active is set by the offboarding resign
          / rehire flow (OffboardingTab.jsx -> employeeApi.resign), never
          entered on this form, but it must stay a registered field so it
          round-trips through EmployeeForm.jsx's buildPayload on save —
          without it, validateFields() drops the value and every save would
          silently send active:false. */}
      <Form.Item name="active" hidden initialValue={mode === "create" ? true : undefined}>
        <Input type="hidden" />
      </Form.Item>

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
            // Regularization basis (backend directHireSinceSql): the first
            // direct-hire Branch Assignment after the last agency one, else
            // Date Employed.
            { key: "direct_hire_since", label: "Direct Hire Since", children: formatDate(initialData?.direct_hire_since) },
          ]}
        />
      )}
    </>
  );
}

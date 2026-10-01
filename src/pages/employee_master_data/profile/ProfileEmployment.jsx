import { Card, Descriptions, Row, Col, Timeline, Typography, Empty } from "antd";

import { formatDate } from "../../../utils/formatDate";

const show = (value) => (value === null || value === undefined || value === "" ? "-" : value);
// Full-width sections, 3 columns from `lg` up — values like department or
// branch names are long enough to wrap badly in a half-width 2-column card.
const SECTION_DESCRIPTIONS = { column: { xs: 1, sm: 2, lg: 3 }, size: "small" };

// Employee Details, read-only: employment status, job & organization, and
// branch/position assignment history (EmployeeProfile2.vue's EMPLOYEE
// DETAILS tab, plus the history it only used for "Date Assigned").
export default function ProfileEmployment({ employee }) {
  const assignments = [...(employee.branch_assignment_positions || [])]
    .sort((a, b) => String(b.date_assigned || "").localeCompare(String(a.date_assigned || "")));
  const latestAssignment = assignments[0];

  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Card title="Employment" size="small">
          <Descriptions {...SECTION_DESCRIPTIONS} items={[
            { key: "code", label: "Employee Code", children: show(employee.employee_code) },
            { key: "type", label: "Employment Type", children: show(employee.employment_type) },
            { key: "employed", label: "Date Employed", children: formatDate(employee.date_employed) },
            { key: "assigned", label: "Date Assigned", children: formatDate(latestAssignment?.date_assigned) },
            { key: "regularized", label: "Regularization", children: formatDate(employee.regularization_date) },
            { key: "resigned", label: "Date Resigned", children: formatDate(employee.date_resigned) },
            { key: "los", label: "Length of Service", children: show(employee.length_of_service) },
          ]} />
        </Card>
      </Col>
      <Col span={24}>
        <Card title="Job & Organization" size="small">
          <Descriptions {...SECTION_DESCRIPTIONS} items={[
            { key: "position", label: "Position", children: show(employee.position?.name) },
            { key: "jtc", label: "Job Title Code", children: show(employee.job_title_code) },
            { key: "rank", label: "Rank", children: show(employee.position?.rank?.name) },
            { key: "cost", label: "Cost Center", children: show(employee.position?.cost_center) },
            { key: "department", label: "Department", children: show(employee.department?.name) },
            { key: "division", label: "Division", children: show(employee.department?.division?.name) },
            { key: "branch", label: "Branch", children: show(employee.branch?.name) },
            { key: "company", label: "Company", children: show(employee.branch?.company?.name) },
            ...(employee.promodizer_brand?.brand
              ? [{ key: "brand", label: "Promodizer Brand", children: employee.promodizer_brand.brand }]
              : []),
          ]} />
        </Card>
      </Col>
      <Col span={24}>
        <Card title="Assignment History" size="small">
          {assignments.length ? (
            <Timeline
              items={assignments.map((a, i) => ({
                key: a.id ?? i,
                color: i === 0 ? "green" : "gray",
                title: formatDate(a.date_assigned),
                content: (
                  <>
                    <Typography.Text strong>{a.position || "-"}</Typography.Text>
                    <Typography.Text type="secondary"> · {a.branch || "-"}</Typography.Text>
                    {a.remarks && <div><Typography.Text type="secondary">{a.remarks}</Typography.Text></div>}
                  </>
                ),
              }))}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No branch or position assignments recorded." />
          )}
        </Card>
      </Col>
    </Row>
  );
}

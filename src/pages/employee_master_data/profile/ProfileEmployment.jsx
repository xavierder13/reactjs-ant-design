import { Descriptions, Row, Col, Timeline, Typography, Empty, Tag } from "antd";
import { IdcardOutlined, ApartmentOutlined, HistoryOutlined } from "@ant-design/icons";

import { formatDate } from "../../../utils/formatDate";
import RegularizationDateWarning from "../components/RegularizationDateWarning";
import { SectionCard } from "./profileUi";
import useDescriptionStyles from "./useDescriptionStyles";

const show = (value) => (value === null || value === undefined || value === "" ? "-" : value);
// Full-width sections, 4 columns from `lg` up — values like department or
// branch names are long enough to wrap badly in a half-width card.
const COLUMNS = { xs: 1, sm: 2, lg: 4 };

// Employee Details, read-only: employment status, job & organization, and
// branch/position assignment history (EmployeeProfile2.vue's EMPLOYEE
// DETAILS tab, plus the history it only used for "Date Assigned").
export default function ProfileEmployment({ employee }) {
  const desc = { ...useDescriptionStyles(), column: COLUMNS };
  const assignments = [...(employee.branch_assignment_positions || [])]
    .sort((a, b) => String(b.date_assigned || "").localeCompare(String(a.date_assigned || "")));
  const latestAssignment = assignments[0];

  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <SectionCard icon={<IdcardOutlined />} title="Employment">
          <Descriptions {...desc} items={[
            { key: "code", label: "Employee Code", children: show(employee.employee_code) },
            { key: "type", label: "Employment Type", children: show(employee.employment_type) },
            { key: "employed", label: "Date Employed", children: formatDate(employee.date_employed) },
            { key: "assigned", label: "Date Assigned", children: formatDate(latestAssignment?.date_assigned) },
            {
              key: "regularized",
              label: "Regularization",
              children: (
                <>
                  {formatDate(employee.regularization_date)}
                  <RegularizationDateWarning regularizationDate={employee.regularization_date} directHireSince={employee.direct_hire_since} />
                </>
              ),
            },
            { key: "resigned", label: "Date Resigned", children: formatDate(employee.date_resigned) },
            { key: "los", label: "Length of Service", children: show(employee.length_of_service) },
          ]} />
        </SectionCard>
      </Col>
      <Col span={24}>
        <SectionCard icon={<ApartmentOutlined />} title="Job & Organization">
          <Descriptions {...desc} items={[
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
        </SectionCard>
      </Col>
      <Col span={24}>
        <SectionCard icon={<HistoryOutlined />} title="Assignment History">
          {assignments.length ? (
            <Timeline
              items={assignments.map((a, i) => ({
                key: a.id ?? i,
                color: i === 0 ? "green" : "gray",
                // Date inside content, not as `title`: with a title AntD v6
                // puts it on the opposite side of the line (centered layout).
                content: (
                  <>
                    <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{formatDate(a.date_assigned)}</Typography.Text></div>
                    <Typography.Text strong>{a.position || "-"}</Typography.Text>
                    {i === 0 && <Tag color="success" style={{ marginInlineStart: 8 }}>Current</Tag>}
                    <div><Typography.Text type="secondary">{a.branch || "-"}</Typography.Text></div>
                    {a.remarks && <div><Typography.Text type="secondary">{a.remarks}</Typography.Text></div>}
                  </>
                ),
              }))}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No branch or position assignments recorded." />
          )}
        </SectionCard>
      </Col>
    </Row>
  );
}

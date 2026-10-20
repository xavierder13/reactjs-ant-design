import { Tooltip, Typography } from "antd";
import { WarningOutlined } from "@ant-design/icons";

import { DISPLAY_DATE_FORMAT, formatDate, toDayjs } from "../../../utils/formatDate";

// The backend fills a blank regularization date with the 180th day after
// Direct Hire Since (date_employed, or the absorption date for former agency
// staff — the employee row's `direct_hire_since`) and keeps a date HR
// entered. This flags an entered date that isn't that day; nothing when
// either date is missing or they match.
export default function RegularizationDateWarning({ regularizationDate, directHireSince }) {
  const regularized = toDayjs(regularizationDate);
  const hired = toDayjs(directHireSince);
  if (!regularized || !hired) return null;

  const expected = hired.add(180, "day");
  if (regularized.isSame(expected, "day")) return null;

  const days = regularized.diff(hired, "day");
  return (
    <Tooltip
      title={`Not 180 days after Direct Hire Since (${formatDate(directHireSince)}): ${days} days. `
        + `180 days would be ${expected.format(DISPLAY_DATE_FORMAT)}.`}
    >
      <Typography.Text type="warning" style={{ marginLeft: 6, cursor: "help" }}>
        <WarningOutlined />
      </Typography.Text>
    </Tooltip>
  );
}

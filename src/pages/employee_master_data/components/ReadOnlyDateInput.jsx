import { Input } from "antd";
import { CalendarOutlined } from "@ant-design/icons";

import { DISPLAY_DATE_FORMAT } from "../../../utils/formatDate";

// A date the system sets (Employee Details' Date Resigned), shown in a
// Form.Item like the Referral Code: a plain read-only Input, not the greyed
// disabled look. Form.Item passes the dayjs value in; nothing calls
// onChange, so the value goes back unchanged on Save.
export default function ReadOnlyDateInput({ value, placeholder }) {
  return (
    <Input
      readOnly
      value={value?.format?.(DISPLAY_DATE_FORMAT) || ""}
      placeholder={placeholder}
      suffix={<CalendarOutlined style={{ color: "rgba(0, 0, 0, 0.25)" }} />}
    />
  );
}

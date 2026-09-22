"use client";

import { useEffect, useState } from "react";
import { Radio, DatePicker, Select, Button, Table, Tag, Modal, Empty, Space, Typography, App } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import useAuth from "../../../../hooks/useAuth";
import handleApiError from "../../../../utils/handleApiError";
import attendanceApi from "../../../../services/employee/attendanceApi";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200, 500];

// Read-only: raw BioBridge biometric punch logs joined server-side by
// `employee_code`, not an editable HRIS record — there is no create/edit/
// delete for this tab. See attendanceApi.js for the confirmed contract.
//
// Deliberately does NOT port EmployeeAttendance.vue's "Overtime"/
// "Late/Early"/"No Pay" view-type toggle buttons or its "Work Hours"/
// "No Pay"/"Out Time" table columns — confirmed by reading the Vue
// component's own script that `view_type` is bound to a v-model but never
// read anywhere else (no computed property, no method, no watcher), and
// those extra table columns are declared in `headers` but never populated
// in the actual row markup. They're dead/unfinished UI in the reference
// app itself — porting them would mean shipping fake, non-functional
// controls, which conflicts with "fully tested and no bug."
export default function AttendanceTab({ initialData }) {
  const { message: messageApi } = App.useApp();
  const { hasPermission } = useAuth();
  const employeeCode = initialData?.employee_code;
  const canView = hasPermission("employee-master-data-attendance");

  const [rangeType, setRangeType] = useState("last_7_days");
  const [dateFrom, setDateFrom] = useState(dayjs().subtract(7, "day"));
  const [dateTo, setDateTo] = useState(dayjs());
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [breakLogsRow, setBreakLogsRow] = useState(null);

  const fetchAttendance = async (page = pagination.current, pageSize = pagination.pageSize, from = dateFrom, to = dateTo) => {
    setLoading(true);
    try {
      const { data } = await attendanceApi.getAttendance({
        employee_code: employeeCode,
        date_from: from.format("YYYY-MM-DD"),
        date_to: to.format("YYYY-MM-DD"),
        page,
        items_per_page: pageSize,
      });
      const { attendances } = data;
      setRows(attendances?.data || []);
      setPagination({
        current: attendances?.current_page || page,
        pageSize,
        total: attendances?.total || 0,
      });
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setLoading(false);
    }
  };

  // Mirrors EmployeeAttendance.vue's own `mounted()` — initial fetch on
  // open, using the default Last 7 Days range.
  useEffect(() => {
    if (!employeeCode || !canView) return;
    const load = async () => {
      await fetchAttendance(1, pagination.pageSize, dateFrom, dateTo);
    };
    load();
  }, [employeeCode, canView]);

  // Last 7/30 Days recompute the range and re-fetch immediately; By Period
  // only unlocks the date pickers, fetching is deferred to the Search
  // button — matches EmployeeAttendance.vue's own `range_type` watcher,
  // but as a direct event handler rather than an effect reacting to state
  // this same component just set (avoids a redundant extra render).
  const handleRangeTypeChange = (value) => {
    setRangeType(value);
    if (value === "last_7_days" || value === "last_30_days") {
      const days = value === "last_7_days" ? 7 : 30;
      const from = dayjs().subtract(days, "day");
      const to = dayjs();
      setDateFrom(from);
      setDateTo(to);
      fetchAttendance(1, pagination.pageSize, from, to);
    }
  };

  if (!employeeCode) {
    return <Empty description="Save the employee first — attendance is looked up by their employee code." style={{ padding: "24px 0" }} />;
  }
  if (!canView) return null;

  const breakStatusCount = (breakLogs, punch) => (breakLogs || []).filter((l) => l.punch === punch).length;
  const formatDate = (date) => (date ? dayjs(date).format("MM/DD/YYYY") : "-");

  const columns = [
    { title: "Date", dataIndex: "date", key: "date", render: formatDate },
    {
      title: "Time In",
      dataIndex: "time_in",
      key: "time_in",
      render: (v) => v ? <Tag color="success">{v}</Tag> : "-",
    },
    {
      title: "Break Out",
      key: "break_out",
      render: (_, record) => record.break_out ? (
        <Tag color="warning" style={{ cursor: "pointer" }} onClick={() => setBreakLogsRow(record)}>
          {record.break_out}
          {breakStatusCount(record.break_logs, "OUT") > 1 && ` (+${breakStatusCount(record.break_logs, "OUT") - 1})`}
        </Tag>
      ) : "-",
    },
    {
      title: "Break In",
      key: "break_in",
      render: (_, record) => record.break_in ? (
        <Tag color="success" style={{ cursor: "pointer" }} onClick={() => setBreakLogsRow(record)}>
          {record.break_in}
          {breakStatusCount(record.break_logs, "IN") > 1 && ` (+${breakStatusCount(record.break_logs, "IN") - 1})`}
        </Tag>
      ) : "-",
    },
    {
      title: "Time Out",
      dataIndex: "time_out",
      key: "time_out",
      render: (v) => v ? <Tag color="warning">{v}</Tag> : "-",
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12, flexWrap: "wrap" }}>
        <Radio.Group value={rangeType} onChange={(e) => handleRangeTypeChange(e.target.value)} optionType="button">
          <Radio.Button value="last_7_days">Last 7 Days</Radio.Button>
          <Radio.Button value="last_30_days">Last 30 Days</Radio.Button>
          <Radio.Button value="by_period">By Period</Radio.Button>
        </Radio.Group>

        <DatePicker
          value={dateFrom}
          onChange={setDateFrom}
          disabled={rangeType !== "by_period"}
          format="YYYY-MM-DD"
          placeholder="Date From"
        />
        <DatePicker
          value={dateTo}
          onChange={setDateTo}
          disabled={rangeType !== "by_period"}
          format="YYYY-MM-DD"
          placeholder="Date To"
        />
        {rangeType === "by_period" && (
          <Button icon={<SearchOutlined />} onClick={() => fetchAttendance(1, pagination.pageSize)}>
            Search
          </Button>
        )}

        <Select
          value={pagination.pageSize}
          onChange={(size) => fetchAttendance(1, size)}
          options={PAGE_SIZE_OPTIONS.map((n) => ({ label: `${n} / page`, value: n }))}
          style={{ width: 120 }}
        />
      </Space>

      <Table
        rowKey="date"
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: false,
        }}
        onChange={(paginationConfig) => fetchAttendance(paginationConfig.current, paginationConfig.pageSize)}
        scroll={{ x: "max-content" }}
      />

      <Modal
        title={<>Break Logs — <Tag color="blue">{breakLogsRow ? formatDate(breakLogsRow.date) : ""}</Tag></>}
        open={!!breakLogsRow}
        onCancel={() => setBreakLogsRow(null)}
        footer={null}
        width={400}
      >
        <Table
          rowKey={(_, index) => index}
          size="small"
          dataSource={breakLogsRow?.break_logs || []}
          pagination={false}
          columns={[
            { title: "Time", dataIndex: "time", key: "time" },
            {
              title: "Punch",
              dataIndex: "punch",
              key: "punch",
              render: (v) => <Tag color={v === "IN" ? "success" : "warning"}>{v}</Tag>,
            },
          ]}
        />
        {!breakLogsRow?.break_logs?.length && <Typography.Text type="secondary">No break punches recorded.</Typography.Text>}
      </Modal>
    </div>
  );
}

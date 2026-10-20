import { useEffect, useState } from "react";
import { Table, Tag, Typography, App } from "antd";

import companyAssetApi from "../../../services/company_asset/companyAssetApi";
import handleApiError from "../../../utils/handleApiError";
import { formatDate } from "../../../utils/formatDate";
import { peso } from "../../payroll/payrollHelpers";
import { ASSET_STATUS_COLORS } from "../../company_asset/companyAssetHelpers";

// Employee profile → Assets: the company assets currently assigned to the
// employee (vueportal company_asset/employee_assets — current assignment
// only, not history). Read-only; assigning / returning stays on the
// Company Assets page. `self` (My Profile): the user's own, through the
// self-service endpoint (no company-asset permission needed).
export default function ProfileAssets({ employee, self = false }) {
  const { message } = App.useApp();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = self ? await companyAssetApi.myAssets() : await companyAssetApi.employeeAssets(employee.id);
        setAssets(data.company_assets || []);
      } catch (error) {
        handleApiError(error, message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [employee.id, self, message]);

  const columns = [
    { title: "Asset Tag", dataIndex: "asset_tag", width: 150 },
    {
      title: "Asset",
      key: "asset",
      render: (_, r) => (
        <div>
          <div>{r.name}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {[r.asset_category?.name, r.brand, r.model, r.serial_number && `S/N ${r.serial_number}`].filter(Boolean).join(" · ")}
          </Typography.Text>
        </div>
      ),
    },
    { title: "Date Assigned", dataIndex: "date_assigned", width: 130, render: (v) => formatDate(v) },
    { title: "Book Value", dataIndex: "book_value", width: 130, align: "right", render: (v) => (v === null || v === undefined ? "—" : peso(v)) },
    { title: "Status", dataIndex: "status", width: 120, render: (s) => <Tag color={ASSET_STATUS_COLORS[s]}>{s}</Tag> },
  ];

  return (
    <Table
      rowKey="id"
      size="small"
      loading={loading}
      columns={columns}
      dataSource={assets}
      pagination={{ pageSize: 10, showSizeChanger: true }}
      scroll={{ x: "max-content" }}
      locale={{ emptyText: "No company assets assigned" }}
    />
  );
}

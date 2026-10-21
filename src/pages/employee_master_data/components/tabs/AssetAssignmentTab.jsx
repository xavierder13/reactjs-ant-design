import { useCallback, useEffect, useState } from "react";
import { Table, Tag, Typography, Space, Button, Tooltip, Popconfirm, Modal, Form, Select, Input, Alert, Spin, App } from "antd";
import { EyeOutlined, PlusOutlined, CloseCircleOutlined, ReloadOutlined } from "@ant-design/icons";

import useAuth from "../../../../hooks/useAuth";
import companyAssetApi from "../../../../services/company_asset/companyAssetApi";
import handleApiError from "../../../../utils/handleApiError";
import { formatDate } from "../../../../utils/formatDate";
import { peso } from "../../../payroll/payrollHelpers";
import { ASSET_STATUS_COLORS } from "../../../company_asset/companyAssetHelpers";
import AssetDetailsModal from "../../../company_asset/AssetDetailsModal";
import AssetAssignModal from "../../../company_asset/AssetAssignModal";

// Edit Employee → Asset Assignment: the company assets assigned to this
// employee now (vueportal company_asset/employee_assets), with View (the
// Company Assets details: history, maintenance, Return / Reassign), Return,
// and Assign asset — an Active asset nobody holds (company_asset/index,
// assignment_type 'Unassigned'). Same data and rules as the Company Assets
// page. The tab: employee-master-data-asset-assignment (TAB_PERMISSIONS —
// list + View details / history); Assign asset / Return / Reassign also
// need company-asset-assign (Administrator: all). Only an active employee
// can be given an asset. Renders no Form.Items, so it sits safely
// inside EmployeeForm's single Form.
export default function AssetAssignmentTab({ initialData }) {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const isAdmin = hasRole("Administrator");
  const can = {
    assign: isAdmin || hasPermission("company-asset-assign"),
    dispose: false, // disposing stays on the Company Assets page
    maintenance: isAdmin || hasPermission("company-asset-maintenance"),
    details: isAdmin || hasPermission("employee-master-data-asset-assignment") || hasPermission("company-asset-list"),
  };
  const employeeId = initialData?.id;
  const active = String(initialData?.active) === "1" || initialData?.active === true;

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [detailsKey, setDetailsKey] = useState(0);
  const [reassigning, setReassigning] = useState(null);
  const [options, setOptions] = useState(null); // branches / departments for Reassign (to an area)
  const [picking, setPicking] = useState(false);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const { data } = await companyAssetApi.employeeAssets(employeeId);
      setAssets(data.company_assets || []);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  }, [employeeId, message]);

  useEffect(() => {
    const run = async () => { await load(); };
    run();
  }, [load]);

  const returnAsset = async (asset) => {
    try {
      await companyAssetApi.returnAsset(asset.id, { remarks: null });
      message.success(`${asset.asset_tag} has been returned.`);
      load();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  // Reassign from the details window (to someone else or an area): needs the
  // branch / department lists, loaded once
  const openReassign = async (asset) => {
    if (!options) {
      try {
        const { data } = await companyAssetApi.getCreate();
        setOptions({ asset_categories: data.asset_categories, branches: data.branches, departments: data.departments });
      } catch (error) {
        handleApiError(error, message);
        return;
      }
    }
    setReassigning(asset);
  };

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
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_, r) => (
        <Space>
          {can.details && (
            <Tooltip title="View (details, history, maintenance)">
              <Button color="blue" variant="outlined" size="small" icon={<EyeOutlined />} onClick={() => { setViewingId(r.id); setDetailsKey((k) => k + 1); }} />
            </Tooltip>
          )}
          {can.assign && (
            <Popconfirm title={`Return ${r.asset_tag}?`} description="Ends this employee's assignment; the asset becomes unassigned." okText="Return" onConfirm={() => returnAsset(r)}>
              <Tooltip title="Return (end the assignment)">
                <Button color="orange" variant="outlined" size="small" icon={<CloseCircleOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 12, width: "100%", justifyContent: "space-between" }}>
        <Typography.Text type="secondary">Company assets assigned to this employee now. The full registry is on Human Resource → Company Assets.</Typography.Text>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
          {can.assign && (
            <Tooltip title={active ? "" : "Only an active employee can be given an asset"}>
              <Button type="primary" icon={<PlusOutlined />} disabled={!active} onClick={() => setPicking(true)}>Assign asset</Button>
            </Tooltip>
          )}
        </Space>
      </Space>
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

      <AssignToEmployeeModal
        open={picking}
        employee={initialData}
        onClose={() => setPicking(false)}
        onSaved={() => { setPicking(false); load(); }}
      />
      {can.details && (
        <AssetDetailsModal
          assetId={viewingId}
          can={can}
          reloadKey={detailsKey}
          onClose={() => setViewingId(null)}
          onAssign={openReassign}
          onDispose={() => {}}
          onChanged={load}
        />
      )}
      {options && (
        <AssetAssignModal
          asset={reassigning}
          options={options}
          onClose={() => setReassigning(null)}
          onSaved={() => { setReassigning(null); setViewingId(null); load(); }}
        />
      )}
    </div>
  );
}

// Pick an Active, unassigned asset (search by tag, name or serial) and give it
// to this employee.
function AssignToEmployeeModal({ open, employee, onClose, onSaved }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [choices, setChoices] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const search = async (text = "") => {
    setSearching(true);
    try {
      const { data } = await companyAssetApi.getAll({ search: text || null, status: "Active", assignment_type: "Unassigned", items_per_page: 20, page: 1 });
      setChoices(data.company_assets?.data || []);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setSearching(false);
    }
  };

  const handleAfterOpenChange = (isOpen) => {
    form.resetFields();
    setChoices([]);
    if (isOpen) search();
  };

  const handleSave = async () => {
    let v;
    try {
      v = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      await companyAssetApi.assign(v.asset_id, {
        assignment_type: "Employee", employee_id: employee.id, branch_id: null, department_id: null, location: null, remarks: v.remarks || null,
      });
      message.success("Asset has been assigned.");
      onSaved();
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setSaving(false);
    }
  };

  const name = [employee?.last_name, employee?.first_name].filter(Boolean).join(", ");

  return (
    <Modal
      keyboard={false}
      open={open}
      title={`Assign an asset to ${name}`}
      okText="Assign"
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={{ xs: "100%", sm: 600 }}
    >
      <Alert type="info" showIcon style={{ marginBottom: 16 }} title="Only Active assets that nobody holds are listed. To move an asset from someone else, open it on Company Assets and Reassign." />
      <Form form={form} layout="vertical" component={false}>
        <Form.Item name="asset_id" label="Asset" rules={[{ required: true, message: "Choose an asset" }]}>
          <Select
            showSearch
            filterOption={false}
            onSearch={search}
            notFoundContent={searching ? <Spin size="small" /> : "No unassigned active asset"}
            placeholder="Search tag, name or serial number"
            options={choices.map((a) => ({
              value: a.id,
              label: `${a.asset_tag} — ${a.name}${a.serial_number ? ` (S/N ${a.serial_number})` : ""}${a.asset_category?.name ? ` · ${a.asset_category.name}` : ""}`,
            }))}
          />
        </Form.Item>
        <Form.Item name="remarks" label="Remarks">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Card, Row, Col, Typography, Input, Select, Space, Button, Grid, Breadcrumb, Alert, Popconfirm, App,
} from "antd";
import { ReloadOutlined, SearchOutlined, ExportOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";

import employeeApi from "../../../services/employee/employeeApi";
import handleApiError from "../../../utils/handleApiError";
import downloadBlobResponse from "../../../utils/downloadBlobResponse";
import { EMPLOYEE_COLUMNS, DEFAULT_EMPLOYEE_COLUMNS } from "../components/employeeColumns";
import ColumnSelector from "../components/ColumnSelector";
import EmployeeTable from "../components/EmployeeTable";
import EmployeeCardMobile from "../components/EmployeeCardMobile";
import PaginationControls from "../components/PaginationControls";
import ExportEmployeesModal from "../components/ExportEmployeesModal";
import BranchFilter from "./BranchFilter";
import useListAccess from "./useListAccess";
import useEmployeeFormOptions from "../../../hooks/useEmployeeFormOptions";

const { useBreakpoint } = Grid;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200, 300, 500];

// Server-paginated list of one employee segment — the React counterpart of
// vueportal's EmployeeHiredThisMonth.vue / EmployeeForRegularization.vue
// (both clones of the main Employee Master Data list). Rows come from the
// backend's getEmployees() base query, so they carry every relation and
// View/Edit hand them to /employees/:id via router state like the main list.
//
// `fetchPage(payload, page)` loads one page. `exportConfig` is either
// { modal: { presetValues, extraPayload, title } } (opens the Employee List
// export pre-filled) or { request(payload), filename } (a dedicated export
// endpoint that takes the list's own filters), or omitted for no Export.
// `showCreate` adds the main list's Add button (→ /employees/create).
// `positionFilter` adds a Position filter (`search_position`, position
// name) — only for endpoints that accept it.
// `defaultColumns` overrides the picker's starting columns; `extraColumns`
// are always shown after the picked ones (not in the picker or its search).
export default function EmployeeSegmentList({
  title, fetchPage, exportConfig, positionFilter = false, showCreate = false,
  defaultColumns = DEFAULT_EMPLOYEE_COLUMNS, extraColumns = [],
}) {
  const navigate = useNavigate();
  // Passed to View/Edit/Add so their Back to List / Cancel return here.
  const { pathname: returnTo } = useLocation();
  const { message: messageApi } = App.useApp();
  const { can, canFilterByBranch } = useListAccess();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({ search: "", search_branch: "", search_position: "" });
  const { positionOptions, isLoading: positionsLoading } = useEmployeeFormOptions();
  const [selectedHeaders, setSelectedHeaders] = useState(defaultColumns);
  const shownColumns = [...selectedHeaders, ...extraColumns];
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const buildPayload = useCallback((pageSize) => ({
    items_per_page: pageSize,
    search: filters.search,
    search_branch: filters.search_branch,
    ...(positionFilter ? { search_position: filters.search_position } : {}),
    table_headers: selectedHeaders.map((h) => ({ text: h.title, value: h.value })),
    // vueportal's "Include Sales Specialist" toggle is commented out, so
    // these lists always exclude them.
    include_sales_specialist: false,
  }), [filters, selectedHeaders, positionFilter]);

  const loadPage = useCallback(async (page, pageSize) => {
    setLoading(true);
    try {
      const { data } = await fetchPage(buildPayload(pageSize), page);
      setEmployees(data.employees.data);
      setPagination({ current: data.employees.current_page, pageSize: Number(data.employees.per_page), total: data.employees.total });
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setLoading(false);
    }
  }, [fetchPage, buildPayload, messageApi]);

  // Filters and columns both change the query (columns drive the search
  // fields), so either one reloads page 1.
  useEffect(() => {
    const load = async () => { await loadPage(1, pagination.pageSize); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, selectedHeaders]);

  const refresh = () => loadPage(pagination.current, pagination.pageSize);
  const applySearch = () => setFilters((f) => ({ ...f, search: searchInput }));

  const viewData = (record) => navigate(`/employees/${record.id}`, { state: { employee: record, returnTo } });
  const editData = (record) => navigate(`/employees/${record.id}/edit`, { state: { employee: record, returnTo } });

  const deleteIds = async (ids) => {
    await employeeApi.delete(ids);
    setSelectedRowKeys((keys) => keys.filter((k) => !ids.includes(k)));
    await refresh();
  };

  const deleteData = async (id) => {
    try {
      await deleteIds([id]);
      messageApi.success("Employee deleted.");
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const count = selectedRowKeys.length;
      await deleteIds(selectedRowKeys);
      messageApi.success(`${count} employee(s) deleted.`);
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleExport = async () => {
    if (!pagination.total) {
      messageApi.warning("No record found.");
      return;
    }
    if (exportConfig.modal) {
      setExportOpen(true);
      return;
    }
    setExporting(true);
    try {
      const payload = buildPayload(pagination.pageSize);
      delete payload.items_per_page; // the export takes every matching row
      const response = await exportConfig.request(payload);
      if (await downloadBlobResponse(response, exportConfig.filename, messageApi)) {
        messageApi.success("Export downloaded.");
      }
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Breadcrumb
        style={{ margin: "16px 0", marginTop: 0 }}
        items={[
          { title: <Link to="/">Home</Link> },
          { title: <Link to="/employees">Employee Master Data</Link> },
          { title },
        ]}
      />
      <Card
        title={
          <Row justify="space-between" align="middle" gutter={[8, 8]} wrap>
            <Col flex="none">
              <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
            </Col>
            <Col flex="none">
              <Space wrap>
                <Button icon={<ReloadOutlined />} onClick={refresh} disabled={loading}>Refresh</Button>
                {showCreate && can("employee-master-data-create") && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/employees/create", { state: { returnTo } })}>Add Employee</Button>
                )}
                {exportConfig && can("employee-master-data-export") && (
                  <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>Export</Button>
                )}
              </Space>
            </Col>
          </Row>
        }
      >
        <Row justify="space-between" align="middle" gutter={[8, 8]} wrap style={{ marginBottom: 16 }}>
          <Col flex="none">
            <Space wrap>
              <Space.Compact style={{ minWidth: 260 }}>
                <Input
                  placeholder="Search..."
                  prefix={<SearchOutlined />}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onPressEnter={applySearch}
                  allowClear
                />
                <Button icon={<SearchOutlined />} onClick={applySearch}>Search</Button>
              </Space.Compact>
              {canFilterByBranch && (
                <BranchFilter
                  value={filters.search_branch}
                  onChange={(branch) => setFilters((f) => ({ ...f, search_branch: branch }))}
                />
              )}
              {positionFilter && (
                <Select
                  value={filters.search_position || undefined}
                  onChange={(position) => setFilters((f) => ({ ...f, search_position: position || "" }))}
                  placeholder="Position"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  loading={positionsLoading}
                  style={{ width: 220 }}
                  popupMatchSelectWidth={false}
                  options={positionOptions.map((p) => ({ label: p.label, value: p.label }))}
                />
              )}
            </Space>
          </Col>
          <Col flex="none">
            <ColumnSelector headers={EMPLOYEE_COLUMNS} selectedHeaders={selectedHeaders} onChange={setSelectedHeaders} />
          </Col>
        </Row>

        {selectedRowKeys.length > 0 && (
          <Alert
            style={{ marginBottom: 16 }}
            type="info"
            showIcon
            title={
              <Space wrap>
                <span>{selectedRowKeys.length} employee(s) selected</span>
                <Button size="small" onClick={() => setSelectedRowKeys([])}>Clear selection</Button>
                {can("employee-master-data-delete") && (
                  <Popconfirm title={`Delete ${selectedRowKeys.length} selected employee(s)?`} onConfirm={handleBulkDelete}>
                    <Button size="small" danger icon={<DeleteOutlined />} loading={bulkDeleting}>Delete Selected</Button>
                  </Popconfirm>
                )}
              </Space>
            }
          />
        )}

        {!isMobile ? (
          <EmployeeTable
            employees={employees}
            columns={shownColumns.map((h) => ({ title: h.title, dataIndex: h.dataIndex, render: h.render }))}
            loading={loading}
            pagination={{ ...pagination, showSizeChanger: true, pageSizeOptions: PAGE_SIZE_OPTIONS, showTotal: (total, [from, to]) => `${from}-${to} of ${total}` }}
            selectedRowKeys={selectedRowKeys}
            setSelectedRowKeys={setSelectedRowKeys}
            editData={editData}
            onView={viewData}
            onDelete={deleteData}
            onChangePagination={(page, pageSize) => loadPage(page, pageSize)}
          />
        ) : (
          <>
            <EmployeeCardMobile
              employees={employees}
              selectedHeaders={shownColumns}
              selectedRowKeys={selectedRowKeys}
              setSelectedRowKeys={setSelectedRowKeys}
              onDelete={deleteData}
              onView={viewData}
              editData={editData}
            />
            <PaginationControls
              pagination={pagination}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              isSmallScreen={!screens.sm}
              onChange={(page, pageSize) => loadPage(page, pageSize)}
            />
          </>
        )}
      </Card>

      {exportConfig?.modal && (
        <ExportEmployeesModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          {...exportConfig.modal}
        />
      )}
    </>
  );
}

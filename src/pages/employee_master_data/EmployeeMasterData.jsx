import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Typography,
  Input,
  Select,
  Space,
  Button,
  Grid,
  Form,
  Breadcrumb,
  Alert,
  Popconfirm,
  App,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined,
  ExportOutlined,
  DeleteOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";

import useBranches from "../../hooks/useBranches";
import useDepartments from "../../hooks/useDepartments";
import useEmployees from "../../hooks/useEmployees";
import useAuth from "../../hooks/useAuth";
import handleApiError from "../../utils/handleApiError";

import ColumnSelector from "./components/ColumnSelector";
import EmployeeTable from "./components/EmployeeTable";
import EmployeeCardMobile from "./components/EmployeeCardMobile";
import PaginationControls from "./components/PaginationControls";
import ImportDataModal from "./components/ImportDataModal";
import GenerateTemplateModal from "./components/GenerateTemplateModal";
import ExportEmployeesModal from "./components/ExportEmployeesModal";
import SubmitAcknowledgmentReportModal from "./components/SubmitAcknowledgmentReportModal";
import { EMPLOYEE_COLUMNS as headers, DEFAULT_EMPLOYEE_COLUMNS as defaultHeaders } from "./components/employeeColumns";

const { useBreakpoint } = Grid;

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200, 300, 500];

const byName = (a, b) => a.name.localeCompare(b.name);

// Picking a rank narrows the Position filter to that rank's positions.
const positionsForRank = ({ positions, ranks }, rankName) => {
  if (!rankName) return positions;
  const rankId = ranks.find((r) => r.name === rankName)?.id;
  return positions.filter((p) => p.rank_id === rankId);
};

export default function EmployeeMasterData() {
  const navigate = useNavigate();
  const { message: messageApi } = App.useApp();
  const { hasPermission } = useAuth();

  // Not consumed by the list — kept so branch/department reference data is
  // warm for the Employee Details tab, which does use these hooks. The
  // filter dropdowns use `filterOptions` from the list response instead:
  // /branch/index etc. need branch-list/position-list/rank-list, which most
  // list users (Branch/Department Managers, HR roles) don't have.
  useBranches();
  useDepartments();

  const { items: employees, pagination, filterOptions, isLoading, fetchItems, deleteEmployee } = useEmployees();

  const [searchForm] = Form.useForm();

  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isSmallScreen = !screens.sm;

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [search, setSearch] = useState("");
  // Matches EmployeeMasterDataController::index()'s search_status handling
  // exactly: it does `in_array($request->search_status, ['Active',
  // 'Inactive'])` — any other value (including omitted/undefined) means no
  // status filter, so "All" is sent as undefined rather than a literal
  // third value the backend doesn't know about.
  const [statusFilter, setStatusFilter] = useState("All");
  // null = no filter. Sent as undefined so the param is omitted entirely.
  const [branchFilter, setBranchFilter] = useState(null);
  const [positionFilter, setPositionFilter] = useState(null);
  const [rankFilter, setRankFilter] = useState(null);
  // Server-side column sort: { field: column value, order: 'ascend' | 'descend' }
  // or null (backend default order).
  const [sort, setSort] = useState(null);
  const [selectedHeaders, setSelectedHeaders] = useState(defaultHeaders);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [generateTemplateOpen, setGenerateTemplateOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [acknowledgmentReportOpen, setAcknowledgmentReportOpen] = useState(false);

  const currentTableHeaders = () => selectedHeaders.map((h) => ({ text: h.title, value: h.value }));

  // Single source of truth for the request payload (minus paging). Pass
  // `overrides` when a handler has a new filter value that state hasn't
  // caught up with yet (setState is async).
  const buildParams = (overrides = {}) => {
    const f = { search, statusFilter, branchFilter, positionFilter, rankFilter, sort, ...overrides };
    // A sort on a column the user has since hidden is dropped.
    const activeSort = f.sort && selectedHeaders.some((h) => h.value === f.sort.field) ? f.sort : null;
    return {
      search: f.search,
      search_status: f.statusFilter === "All" ? undefined : f.statusFilter,
      search_branch: f.branchFilter ?? undefined,
      search_position: f.positionFilter ?? undefined,
      search_rank: f.rankFilter ?? undefined,
      sort_field: activeSort?.field,
      sort_order: activeSort?.order,
      table_headers: currentTableHeaders(),
    };
  };

  const fetchEmployees = (page = 1, pageSize = pagination.pageSize, overrides = {}) => {
    fetchItems({
      page,
      items_per_page: pageSize,
      ...buildParams(overrides),
    });
  };

  // Re-fetch page 1 whenever the selected columns change (table_headers is
  // part of the request payload — the backend uses it to shape the response,
  // not just to hide columns client-side).
  useEffect(() => { fetchEmployees(1); }, [selectedHeaders]);

  const handleAdd = () => navigate('/employees/create');

  const searchData = async () => {
    const values = await searchForm.getFieldsValue();
    const searchValue = values.search || "";
    setSearch(searchValue);
    fetchEmployees(1, pagination.pageSize, { search: searchValue });
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    fetchEmployees(1, pagination.pageSize, { statusFilter: value });
  };

  // allowClear passes undefined on clear — normalise to null.
  const handleBranchFilterChange = (value) => {
    const next = value ?? null;
    setBranchFilter(next);
    fetchEmployees(1, pagination.pageSize, { branchFilter: next });
  };

  const handlePositionFilterChange = (value) => {
    const next = value ?? null;
    setPositionFilter(next);
    fetchEmployees(1, pagination.pageSize, { positionFilter: next });
  };

  const branchOptions = useMemo(
    () => [...filterOptions.branches].sort(byName).map((b) => ({ label: b.name, value: b.name })),
    [filterOptions.branches],
  );
  const rankOptions = useMemo(
    () => filterOptions.ranks.map((r) => ({ label: r.name, value: r.name })),
    [filterOptions.ranks],
  );
  const positionOptions = useMemo(
    () => [...positionsForRank(filterOptions, rankFilter)].sort(byName).map((p) => ({ label: p.name, value: p.name })),
    [filterOptions, rankFilter],
  );

  // New sort → back to page 1, same page size. Clearing the sort (third
  // click) returns to the backend's default order.
  const handleSortChange = (sorter) => {
    const next = sorter.order ? { field: sorter.columnKey, order: sorter.order } : null;
    setSort(next);
    fetchEmployees(1, pagination.pageSize, { sort: next });
  };

  // A selected position outside the new rank is cleared in the same request.
  const handleRankFilterChange = (value) => {
    const next = value ?? null;
    const keepPosition = positionFilter && positionsForRank(filterOptions, next).some((p) => p.name === positionFilter);
    const nextPosition = keepPosition ? positionFilter : null;
    setRankFilter(next);
    setPositionFilter(nextPosition);
    fetchEmployees(1, pagination.pageSize, { rankFilter: next, positionFilter: nextPosition });
  };

  const hasActiveFilters = Boolean(search) || statusFilter !== "All" || branchFilter !== null || rankFilter !== null || positionFilter !== null;

  // One request for all the resets, instead of one per filter.
  const clearFilters = () => {
    searchForm.resetFields();
    setSearch("");
    setStatusFilter("All");
    setBranchFilter(null);
    setPositionFilter(null);
    setRankFilter(null);
    fetchEmployees(1, pagination.pageSize, { search: "", statusFilter: "All", branchFilter: null, rankFilter: null, positionFilter: null });
  };

  // Router-state carries the row already loaded in this list — there is no
  // single-employee "show/{id}" endpoint on the backend to re-fetch from,
  // so View/Edit pages depend on being opened from here (see EmployeeForm.jsx
  // for the "opened directly / refreshed" fallback).
  const viewData = (record) => navigate(`/employees/${record.id}`, { state: { employee: record } });
  const editData = (record) => navigate(`/employees/${record.id}/edit`, { state: { employee: record } });

  const deleteData = async (id) => {
    try {
      await deleteEmployee(id, {
        page: pagination.current,
        items_per_page: pagination.pageSize,
        ...buildParams(),
      });
      messageApi.success('Employee deleted.');
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await deleteEmployee(selectedRowKeys, {
        page: pagination.current,
        items_per_page: pagination.pageSize,
        ...buildParams(),
      });
      messageApi.success(`${selectedRowKeys.length} employee(s) deleted.`);
      setSelectedRowKeys([]);
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <>
      <Breadcrumb
        style={{ margin: "16px 0", marginTop: 0 }}
        items={[
          { title: <Link to="/">Home</Link> },
          { title: "Employee Master Data" },
        ]}
      />
      <Card
        title={
          // Title left, primary page-level actions right — search and the
          // column picker moved out of the title row into their own toolbar
          // below (see body). Keeps the title row from needing to grow every
          // time a new primary action (Import, Add) is added, and matches
          // the common admin-list pattern of "title + CTAs" up top, "search
          // + view options" as a secondary toolbar.
          <Row justify="space-between" align="middle" gutter={[8, 8]} wrap>
            <Col flex="none">
              <Typography.Title level={4} style={{ margin: 0 }}>
                Employee Master Data
              </Typography.Title>
            </Col>

            <Col flex="none">
              <Space wrap>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => fetchEmployees(pagination.current)}
                >
                  Refresh
                </Button>

                {(hasPermission('employee-master-data-import') || hasPermission('employee-master-data-work-schedule-import')) && (
                  <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>
                    Import
                  </Button>
                )}

                {(hasPermission('employee-master-data-template-download') || hasPermission('employee-master-data-work-schedule-template-download')) && (
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => setGenerateTemplateOpen(true)}
                  >
                    Template
                  </Button>
                )}

                {hasPermission('employee-master-data-export') && (
                  <Button icon={<ExportOutlined />} onClick={() => setExportOpen(true)}>
                    Export
                  </Button>
                )}

                {hasPermission('employee-master-data-create') && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Add Employee
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        }
        styles={{
          header: isMobile
            ? { paddingTop: 10, paddingBottom: 10 }
            : {}
        }}
      >
        {/* One wrapping, left-aligned filter row (same layout as the
            recruitment applicant list): search, status, branch, rank, position,
            then the column picker. */}
        <Space wrap align="end" style={{ marginBottom: 16 }}>
          <Form form={searchForm}>
            <Space.Compact>
              <Form.Item name="search" style={{ marginBottom: 0 }}>
                <Input
                  allowClear
                  placeholder="Search..."
                  prefix={<SearchOutlined />}
                  style={{ width: 280 }}
                  onPressEnter={searchData}
                  onChange={(e) => {
                    // Clearing the box (x button or backspace) resets the list.
                    if (!e.target.value && search) {
                      setSearch("");
                      fetchEmployees(1, pagination.pageSize, { search: "" });
                    }
                  }}
                />
              </Form.Item>
              <Button icon={<SearchOutlined />} onClick={searchData}>
                Search
              </Button>
            </Space.Compact>
          </Form>

          <Select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            style={{ width: 140 }}
            options={[
              { label: "All Statuses", value: "All" },
              { label: "Active", value: "Active" },
              { label: "Inactive", value: "Inactive" },
            ]}
          />

          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Branch"
            style={{ width: 200 }}
            value={branchFilter}
            onChange={handleBranchFilterChange}
            options={branchOptions}
          />

          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Rank"
            style={{ width: 160 }}
            value={rankFilter}
            onChange={handleRankFilterChange}
            options={rankOptions}
          />

          {/* Values are names, not ids: the backend matches search_branch /
              search_rank / search_position on b.name / g.name / f.name (all
              unique). Options follow the Rank filter. Long position titles
              get a wider popup instead of being cut off. */}
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Position"
            style={{ width: 220 }}
            popupMatchSelectWidth={false}
            value={positionFilter}
            onChange={handlePositionFilterChange}
            options={positionOptions}
          />

          {hasActiveFilters && (
            <Button icon={<ClearOutlined />} onClick={clearFilters}>
              Clear filters
            </Button>
          )}

          <ColumnSelector headers={headers} selectedHeaders={selectedHeaders} onChange={setSelectedHeaders} />
        </Space>

        {selectedRowKeys.length > 0 && (
          <Alert
            style={{ marginBottom: 16 }}
            type="info"
            showIcon
            title={
              <Space wrap>
                <span>{selectedRowKeys.length} employee(s) selected</span>
                <Button size="small" onClick={() => setSelectedRowKeys([])}>
                  Clear selection
                </Button>
                {hasPermission('employee-acknowledgment-reports') && (
                  <Button size="small" icon={<UploadOutlined />} onClick={() => setAcknowledgmentReportOpen(true)}>
                    Submit Branch Report
                  </Button>
                )}
                {hasPermission('employee-master-data-delete') && (
                  <Popconfirm
                    title={`Delete ${selectedRowKeys.length} selected employee(s)?`}
                    onConfirm={handleBulkDelete}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} loading={bulkDeleting}>
                      Delete Selected
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            }
          />
        )}

        {!isMobile && (
          <EmployeeTable
            employees={employees}
            columns={selectedHeaders.map((h) => ({
              key: h.value,
              title: h.title,
              dataIndex: h.dataIndex,
              render: h.render,
              sorter: true,
              sortOrder: sort?.field === h.value ? sort.order : null,
            }))}
            loading={isLoading}
            pagination={pagination}
            selectedRowKeys={selectedRowKeys}
            setSelectedRowKeys={setSelectedRowKeys}
            editData={editData}
            onView={viewData}
            onDelete={deleteData}
            onChangePagination={(page, pageSize) => fetchEmployees(page, pageSize)}
            onSortChange={handleSortChange}
          />
        )}

        {isMobile && (
          <>
            <EmployeeCardMobile
              employees={employees}
              selectedHeaders={selectedHeaders}
              selectedRowKeys={selectedRowKeys}
              setSelectedRowKeys={setSelectedRowKeys}
              onDelete={deleteData}
              onView={viewData}
              editData={editData}
            />
            <PaginationControls
              pagination={pagination}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              isSmallScreen={isSmallScreen}
              onChange={(page, pageSize) => fetchEmployees(page, pageSize)}
            />
          </>
        )}
      </Card>

      <ImportDataModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => fetchEmployees(1)}
      />

      <GenerateTemplateModal
        open={generateTemplateOpen}
        onClose={() => setGenerateTemplateOpen(false)}
      />

      <ExportEmployeesModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />

      <SubmitAcknowledgmentReportModal
        open={acknowledgmentReportOpen}
        employees={employees.filter((e) => selectedRowKeys.includes(e.id))}
        onClose={() => setAcknowledgmentReportOpen(false)}
        onSubmitted={() => setSelectedRowKeys([])}
      />
    </>
  );
}

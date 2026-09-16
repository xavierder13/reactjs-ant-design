import { useEffect, useState } from "react";
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
  DeleteOutlined,
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
import ImportEmployeesModal from "./components/ImportEmployeesModal";
import SubmitAcknowledgmentReportModal from "./components/SubmitAcknowledgmentReportModal";

const { useBreakpoint } = Grid;

const headers = [
  {
    title: "Branch",
    dataIndex: "branch",
    value: "branch.name",
    sorter: true,
    render: (branch) => branch?.name || "-"
  },
  {
    title: "Company",
    dataIndex: "branch",
    value: "branch.company.name",
    sorter: true,
    render: (branch) => branch?.company?.name || "-"
  },
  { title: "Emp. Code", dataIndex: "employee_code", value: "employee_code" },
  { title: "Job Title Code", dataIndex: "job_title_code", value: "job_title_code" },
  { title: "Lastname", dataIndex: "last_name", value: "last_name" },
  { title: "Firstname", dataIndex: "first_name", value: "first_name" },
  { title: "Middlename", dataIndex: "middle_name", value: "middle_name" },
  { title: "Birthday", dataIndex: "dob", value: "dob" },
  { title: "Address", dataIndex: "address", value: "address" },
  { title: "Contact #", dataIndex: "contact", value: "contact" },
  { title: "Email", dataIndex: "email", value: "email" },
  { title: "Job Description", dataIndex: "position.name", value: "position.name" },
  {
    title: "Promodizer Brand",
    dataIndex: "promodizer_brand",
    value: "promodizer_brand.brand",
    // Was previously a broken column: dataIndex was the literal dotted
    // string "promodizer_brand.brand" (AntD Table does not split a string
    // dataIndex on "." — only an array form nests), so it never resolved
    // to real data. Fixed to match every other nested-relation column in
    // this list (Branch/Company/Department/Division): dataIndex is the
    // top-level relation key, render drills into it. Real bug found and
    // fixed 2026-09-15.
    render: (promodizerBrand) => promodizerBrand?.brand || "-"
  },
  { title: "Rank", dataIndex: "position.rank.name", value: "position.rank.name" },
  {
    title: "Department",
    dataIndex: "department",
    value: "department.name",
    render: (department) => department?.name || "-"
  },
  {
    title: "Division",
    dataIndex: "department",
    value: "department.division.name",
    render: (department) => department?.division?.name || "-"
  },
  { title: "Date Employed", dataIndex: "date_employed", value: "date_employed" },
  { title: "Gender", dataIndex: "gender", value: "gender" },
  { title: "Civil Status", dataIndex: "civil_status", value: "civil_status" },
  { title: "TIN #", dataIndex: "tin_no", value: "tin_no" },
  { title: "Pag-IBIG #", dataIndex: "pagibig_no", value: "pagibig_no" },
  { title: "PhilHealth #", dataIndex: "philhealth_no", value: "philhealth_no" },
  { title: "SSS #", dataIndex: "sss_no", value: "sss_no" },
  { title: "Educ. Attainment", dataIndex: "educ_attain", value: "educ_attain" },
  { title: "School Attended", dataIndex: "school_attended", value: "school_attended" },
  { title: "Course", dataIndex: "course", value: "course" },
  // "Length of Service" (Vue's next column here) is deliberately NOT
  // included — it's a computed SQL alias on the backend
  // (TIMESTAMPDIFF(...) AS length_of_service in getEmployees()), not a
  // real column, and isn't in EmployeeMasterDataController's $table_fields
  // search whitelist. Selecting it would throw the same "Unknown column"
  // error Promodizer Brand did before that fix — needs a backend whitelist
  // entry mapping it to a valid SQL reference before it's safe to add
  // here. See the employee-master-data skill's Roadmap.
  { title: "Employment Type", dataIndex: "employment_type", value: "employment_type" },
  {
    title: "Status",
    dataIndex: "active",
    value: "active",
    render: (active) => (active ? "Active" : "Inactive"),
  },
];
const defaultHeaders = headers.slice(0, 8);
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200, 300, 500];

export default function EmployeeMasterData() {
  const navigate = useNavigate();
  const { message: messageApi } = App.useApp();
  const { hasPermission } = useAuth();

  // Not consumed by the list yet (no lookup filter UI in this pass) —
  // kept so branch/department reference data is warm for the Employee
  // Details tab, which does use these hooks.
  useBranches();
  useDepartments();

  const { items: employees, pagination, isLoading, fetchItems, deleteEmployee } = useEmployees();

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
  const [selectedHeaders, setSelectedHeaders] = useState(defaultHeaders);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [acknowledgmentReportOpen, setAcknowledgmentReportOpen] = useState(false);

  const currentTableHeaders = () => selectedHeaders.map((h) => ({ text: h.title, value: h.value }));

  const fetchEmployees = (page = 1, pageSize = pagination.pageSize, searchValue = search, statusValue = statusFilter) => {
    fetchItems({
      page,
      items_per_page: pageSize,
      search: searchValue,
      search_status: statusValue === "All" ? undefined : statusValue,
      table_headers: currentTableHeaders(),
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
    fetchEmployees(1, pagination.pageSize, searchValue);
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    fetchEmployees(1, pagination.pageSize, search, value);
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
        search,
        search_status: statusFilter === "All" ? undefined : statusFilter,
        table_headers: currentTableHeaders(),
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
        search,
        search_status: statusFilter === "All" ? undefined : statusFilter,
        table_headers: currentTableHeaders(),
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

                {hasPermission('employee-master-data-import') && (
                  <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>
                    Import
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
        <Row justify="space-between" align="middle" gutter={[8, 8]} wrap style={{ marginBottom: 16 }}>
          <Col flex="none" style={{ minWidth: 260 }}>
            <Form form={searchForm}>
              <Space.Compact style={{ width: "100%" }}>
                <Form.Item name="search" style={{ marginBottom: 0, flex: 1 }}>
                  <Input
                    placeholder="Search..."
                    prefix={<SearchOutlined />}
                    onPressEnter={searchData}
                  />
                </Form.Item>
                <Button icon={<SearchOutlined />} onClick={searchData}>
                  Search
                </Button>
              </Space.Compact>
            </Form>
          </Col>

          <Col flex="none">
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
          </Col>

          <Col flex="none">
            <ColumnSelector headers={headers} selectedHeaders={selectedHeaders} onChange={setSelectedHeaders} />
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
                <Button size="small" onClick={() => setSelectedRowKeys([])}>
                  Clear selection
                </Button>
                {hasPermission('employee-acknowledgment-reports') && (
                  <Button size="small" icon={<UploadOutlined />} onClick={() => setAcknowledgmentReportOpen(true)}>
                    Submit Acknowledgment Report
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
            columns={selectedHeaders.map((h) => ({ title: h.title, dataIndex: h.dataIndex, render: h.render }))}
            loading={isLoading}
            pagination={pagination}
            selectedRowKeys={selectedRowKeys}
            setSelectedRowKeys={setSelectedRowKeys}
            editData={editData}
            onView={viewData}
            onDelete={deleteData}
            onChangePagination={(page, pageSize) => fetchEmployees(page, pageSize)}
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

      <ImportEmployeesModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => fetchEmployees(1)}
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

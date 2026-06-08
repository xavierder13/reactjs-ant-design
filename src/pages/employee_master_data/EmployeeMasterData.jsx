import { useEffect, useState } from "react";
import axios from "../../api/axiosInstance";
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Input, 
  Space, 
  Button, 
  Grid, 
  Divider, 
  Form,
  Breadcrumb,
} from "antd";
import { 
  ReloadOutlined,
  SearchOutlined,
  PlusOutlined, 
} from "@ant-design/icons";
import { Link } from "react-router-dom";

import useBranches from "../../hooks/useBranches";
import useDepartments from "../../hooks/useDepartments";

// import ColumnSelector from "./components/ColumnSelector";
import EmployeeTable from "./components/EmployeeTable";
// import EmployeeCardMobile from "./components/EmployeeCardMobile";
// import PaginationControls from "./components/PaginationControls";
// import Modal from "./components/EmployeeModal";
// import EmployeeTabs from "./components/EmployeeTabs";

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
  { title: "Lastname", dataIndex: "last_name", value: "last_name" },
  { title: "Firstname", dataIndex: "first_name", value: "first_name" },
  { title: "Middlename", dataIndex: "middle_name", value: "middle_name" },
  { title: "Birthday", dataIndex: "dob", value: "dob" },
  { title: "Address", dataIndex: "address", value: "address" },
  { title: "Contact #", dataIndex: "contact", value: "contact" },
  { title: "Email", dataIndex: "email", value: "email" },
  { title: "Job Description", dataIndex: "position.name", value: "position.name" },
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
  { title: "SSS #", dataIndex: "sss_no", value: "sss_no" }
];
const defaultHeaders = headers.slice(0, 8);
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200, 300, 500];

export default function EmployeeListPage() {
  const { branches, branchOptions } = useBranches();
  const { departments, departmentOptions } = useDepartments();

  console.log(branches);
  console.log(departments);
  
  

  const [searchForm] = Form.useForm();

  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isSmallScreen = !screens.sm;

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [search, setSearch] = useState("");
  const [selectedHeaders, setSelectedHeaders] = useState(defaultHeaders);
  const [modal, setModal] = useState(false);
  const [editedIndex, setEditedIndex] = useState(-1);
  const [modalTitle, setModalTitle] = useState("New Employee");

  const fetchEmployees = async (page = 1, pageSize = 10, searchValue = "") => {
    setLoading(true);
    try {
      const data = {
        page,
        items_per_page: pageSize,
        search: searchValue,
        table_headers: selectedHeaders.map((h) => ({ text: h.title, value: h.value }))
      };
      const res = await axios.post("/employee_master_data/index", data);
      setEmployees(res.data.employees.data);
      setPagination({
        current: res.data.employees.current_page,
        pageSize: res.data.employees.per_page,
        total: res.data.employees.total
      });
    } finally { setLoading(false); }
  };

  const handleAdd = () => {
    setEditedIndex(-1);
    setModalTitle("Add Employee");
    setModal(true);
  }

  const searchData = async () => {
    const values = await searchForm.getFieldsValue();
     const searchValue = values.search || "";
    setSearch(searchValue); // optional (for UI state)
    fetchEmployees(1, pagination.pageSize, searchValue); // ✅ pass directly
  }
 
  const saveData = () => {
    console.log('saved data')
  }

  const editData = async (data) => {
    const index = employees.indexOf(data);
    setEditedIndex(index);
    setModalTitle("Edit Employee");
    setModal(true);
  }

  const deleteData = () => {
    fetchEmployees();
  }

  const closeModal = () => {
    setModal(false);
  }

  useEffect(() => { fetchEmployees(); }, [selectedHeaders]);

  return (
    <>
      <Breadcrumb
        style={{ margin: "16px 0", marginTop: 0 }}
        items={[
          {
            title: <Link href="/">Home</Link>, // <-- clickable
          },
          {
            title: "Employee Master Data",
          },
        ]}
      />
      <Card
        title={
          <Row gutter={[8, 8]} align="middle">
          {/* TITLE */}
          <Col xs={24} md={6}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Employee Master Data
            </Typography.Title>
          </Col>

          {/* SEARCH INPUT */}
          <Col xs={24} md={8}>
            <Form form={searchForm}>
              <Form.Item name="search" style={{ marginBottom: 0 }}>
                <Input
                  placeholder="Search..."
                  prefix={<SearchOutlined />}
                  onPressEnter={searchData}
                />
              </Form.Item>
            </Form>
          </Col>

          {/* EXISTING BUTTONS (UNCHANGED POSITION) */}
          <Col xs={24} md={6}>
            <Space wrap>
              <Button
                color="primary"
                variant="outlined"
                icon={<SearchOutlined />}
                onClick={searchData}
              >
                Search
              </Button>

              <Button
                icon={<ReloadOutlined />}
                onClick={fetchEmployees}
              >
                Refresh
              </Button>
            </Space>
          </Col>

          {/* NEW ADD BUTTON (FAR RIGHT) */}
          <Col xs={24} md={4} style={{ textAlign: "right" }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              block={false}
            >
              Add Employee
            </Button>
          </Col>
        </Row>
        }
        styles={{
          header: isMobile
            ? { paddingTop: 10, paddingBottom: 10 }
            : {}
        }}
      >
        <Space style={{ marginBottom: 16 }}>
          {/* <ColumnSelector headers={headers} selectedHeaders={selectedHeaders} onChange={setSelectedHeaders} /> */}
        </Space>

        {!isMobile && (
          <EmployeeTable
            employees={employees}
            columns={selectedHeaders.map((h) => ({ title: h.title, dataIndex: h.dataIndex, render: h.render }))}
            loading={loading}
            pagination={pagination}
            selectedRowKeys={selectedRowKeys}
            setSelectedRowKeys={setSelectedRowKeys}
            editData={editData}
            onDelete={deleteData}  // can add delete logic
            onChangePagination={(page, pageSize) => fetchEmployees(page, pageSize)}
          />
        )}

        {/* {isMobile && (
          <>
            <EmployeeCardMobile
              employees={employees}
              selectedHeaders={selectedHeaders}
              selectedRowKeys={selectedRowKeys}
              setSelectedRowKeys={setSelectedRowKeys}
              onDelete={deleteData}  // can add delete logic
              editData={editData}
            />
            <PaginationControls
              pagination={pagination}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              isSmallScreen={isSmallScreen}
              onChange={(page, pageSize) => fetchEmployees(page, pageSize)}
            />
          </>
        )} */}
      </Card>
      {/* <Modal
        visible={modal}
        title={modalTitle}
        onCancel={closeModal}
        onSave={saveData}
      >
        <EmployeeTabs/>
      </Modal> */}
    </>
  );
}
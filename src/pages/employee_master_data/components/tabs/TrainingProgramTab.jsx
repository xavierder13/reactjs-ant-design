import { DatePicker, Empty, Form, Input, InputNumber, Select } from "antd";

import PerformanceRecordTab from "./performance/PerformanceRecordTab";
import trainingProgramApi from "../../../../services/employee/trainingProgramApi";
import useEmployeeFormOptions from "../../../../hooks/useEmployeeFormOptions";
import { DISPLAY_DATE_FORMAT, formatDate, toDayjs } from "../../../../utils/formatDate";

// Fixed lists — must match EmployeeTrainingProgram::TRAINING_TYPES /
// PROVIDERS / DELIVERY_METHODS (the backend validates with Rule::in).
const TYPE_OTHERS = "Others";
const TRAINING_TYPES = ["Onboarding", "Technical", "Soft Skills", "Leadership", "Compliance", TYPE_OTHERS];
const PROVIDERS = ["Internal", "External"];
const DELIVERY_METHODS = ["Online", "In-Person"];
const toOptions = (values) => values.map((value) => ({ label: value, value }));

const formatFee = (value) => (value === null || value === undefined || value === ""
  ? "-"
  : `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

const columns = [
  { title: "Training Program Title", dataIndex: "title", key: "title" },
  {
    title: "Training Type",
    dataIndex: "training_type",
    key: "training_type",
    render: (type, r) => (type === TYPE_OTHERS && r.training_type_other ? `Others — ${r.training_type_other}` : type),
  },
  {
    title: "Provider",
    key: "provider",
    render: (_, r) => (r.provider === "Internal"
      ? `Internal — ${r.department?.name || "-"}`
      : `External — ${r.provider_name || "-"}`),
  },
  { title: "Delivery Method", dataIndex: "delivery_method", key: "delivery_method" },
  { title: "Date", dataIndex: "training_date", key: "training_date", render: (v) => formatDate(v) },
  { title: "Location", dataIndex: "location", key: "location", render: (v) => v || "-" },
  { title: "Training Fee", dataIndex: "training_fee", key: "training_fee", render: formatFee },
];

// The backend answers validation failures with HTTP 422 + a field bag;
// PerformanceRecordTab maps `{ success: false, errors }` onto the form.
const saveResult = async (request) => {
  try {
    const { data } = await request;
    return { success: true, records: data.training_programs };
  } catch (error) {
    if (error.response?.status === 422 && !error.response.data?.message) {
      return { success: false, errors: error.response.data };
    }
    throw error;
  }
};

const toPayload = (values) => ({
  ...values,
  training_type_other: values.training_type === TYPE_OTHERS ? values.training_type_other?.trim() : null,
  training_date: values.training_date?.format("YYYY-MM-DD"),
  department_id: values.provider === "Internal" ? values.department_id : null,
  provider_name: values.provider === "External" ? values.provider_name : null,
  training_fee: values.provider === "External" ? values.training_fee ?? null : null,
  location: values.location || null,
});

// Training tab (HR-encoded training programs), placed before Offboarding.
// Training Type "Others" asks HR to specify it (training_type_other).
// Internal trainings name the department that ran them; external ones the
// provider and an optional fee. Location is required for In-Person.
// Records need a saved employee, like Offboarding.
export default function TrainingProgramTab({ mode, initialData }) {
  // only the add / edit form needs the list (view mode has no form)
  const { departmentOptions } = useEmployeeFormOptions({ enabled: mode !== "view" });

  if (mode === "create") {
    return <Empty description="Save the employee first before adding records here." style={{ padding: "24px 0" }} />;
  }

  return (
    <PerformanceRecordTab
      title="Training"
      mode={mode}
      initialRecords={initialData?.training_programs}
      permissionPrefix="employee-master-data-training-program"
      columns={columns}
      getInitialFormValues={(record) => ({
        title: record?.title ?? "",
        training_type: record?.training_type,
        training_type_other: record?.training_type_other ?? "",
        provider: record?.provider,
        department_id: record?.department_id ?? undefined,
        provider_name: record?.provider_name ?? "",
        delivery_method: record?.delivery_method,
        training_date: toDayjs(record?.training_date),
        location: record?.location ?? "",
        training_fee: record?.training_fee !== null && record?.training_fee !== undefined ? Number(record.training_fee) : null,
      })}
      renderFields={() => (
        <>
          <Form.Item
            name="title"
            label="Training Program Title"
            rules={[{ required: true, whitespace: true, message: "Please enter the training program title." }]}
          >
            <Input placeholder="e.g. New Employees' Orientation (NEO), Train the Trainers" maxLength={255} />
          </Form.Item>
          <Form.Item name="training_type" label="Training Type" rules={[{ required: true, message: "Please select the training type." }]}>
            <Select options={toOptions(TRAINING_TYPES)} placeholder="Select training type" />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, next) => prev.training_type !== next.training_type}>
            {({ getFieldValue }) => getFieldValue("training_type") === TYPE_OTHERS && (
              <Form.Item
                name="training_type_other"
                label="Please specify"
                rules={[{ required: true, whitespace: true, message: "Please specify the training type." }]}
              >
                <Input placeholder="Training type" maxLength={255} />
              </Form.Item>
            )}
          </Form.Item>
          <Form.Item name="provider" label="Provider" rules={[{ required: true, message: "Please select the provider." }]}>
            <Select options={toOptions(PROVIDERS)} placeholder="Internal or External" />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, next) => prev.provider !== next.provider}>
            {({ getFieldValue }) => {
              const provider = getFieldValue("provider");
              if (provider === "Internal") {
                return (
                  <Form.Item name="department_id" label="Department" rules={[{ required: true, message: "Please select the department." }]}>
                    <Select
                      options={departmentOptions}
                      placeholder="Department that conducted the training"
                      showSearch
                      optionFilterProp="label"
                    />
                  </Form.Item>
                );
              }
              if (provider === "External") {
                return (
                  <>
                    <Form.Item
                      name="provider_name"
                      label="Training Provider"
                      rules={[{ required: true, whitespace: true, message: "Please enter the training provider." }]}
                    >
                      <Input placeholder="Name of the training provider" maxLength={255} />
                    </Form.Item>
                    <Form.Item name="training_fee" label="Training Fee">
                      <InputNumber style={{ width: "100%" }} min={0} max={9999999999.99} precision={2} prefix="₱" />
                    </Form.Item>
                  </>
                );
              }
              return null;
            }}
          </Form.Item>
          <Form.Item name="delivery_method" label="Delivery Method" rules={[{ required: true, message: "Please select the delivery method." }]}>
            <Select options={toOptions(DELIVERY_METHODS)} placeholder="Online or In-Person" />
          </Form.Item>
          <Form.Item name="training_date" label="Date" rules={[{ required: true, message: "Please select the date." }]}>
            <DatePicker style={{ width: "100%" }} format={DISPLAY_DATE_FORMAT} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, next) => prev.delivery_method !== next.delivery_method}>
            {({ getFieldValue }) => {
              const inPerson = getFieldValue("delivery_method") === "In-Person";
              return (
                <Form.Item
                  name="location"
                  label="Location"
                  rules={inPerson ? [{ required: true, whitespace: true, message: "Please enter the location." }] : []}
                >
                  <Input placeholder={inPerson ? "Venue" : "Optional (e.g. Zoom, MS Teams)"} maxLength={255} />
                </Form.Item>
              );
            }}
          </Form.Item>
        </>
      )}
      onCreate={(values) => saveResult(trainingProgramApi.create({ employee_id: initialData.id, ...toPayload(values) }))}
      onUpdate={(record, values) => saveResult(trainingProgramApi.update(record.id, toPayload(values)))}
      onDelete={async (record) => {
        const { data } = await trainingProgramApi.remove(record.id);
        return data.training_programs;
      }}
    />
  );
}

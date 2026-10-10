import { useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Table, Tabs, Transfer, App } from 'antd';
import positionApi from '../../../services/record_management/positionApi';
import saveRecord from '../saveRecord';

// Fixed list, same as vueportal's PositionIndex.vue.
const COST_CENTERS = ['HQ-Management', 'BR-Officer', 'BR-Rank & File'];

// Branch quantities live under `quantities.b<branchId>` — a string key, so
// the form keeps an object rather than a sparse array indexed by id.
const qtyField = (branchId) => ['quantities', `b${branchId}`];

// Create/edit a position. `position` = null for create, else the list row
// (carries required_employees and subordinates, so no extra fetch).
// `positions`/`ranks`/`branches`/`departments` come from /position/index.
const PositionFormModal = ({ open, position, positions, ranks, branches, departments, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [branchSearch, setBranchSearch] = useState('');

  // Reset first on every open: the form store outlives destroyOnHidden
  // content (see UserFormModal.jsx). Every branch gets a quantity — the
  // saved one, else 0.
  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    setActiveTab('details');
    setBranchSearch('');

    const quantities = Object.fromEntries(branches.map((b) => [
      `b${b.id}`,
      position?.required_employees.find((r) => r.branch_id === b.id)?.quantity ?? 0,
    ]));
    // Legacy rows hold rank_id 0 / missing departments — load those empty so
    // the required rule asks for a real value instead of showing a bare id.
    const known = (list, id) => (list.some((x) => x.id === id) ? id : undefined);
    form.setFieldsValue({
      name:                  position?.name,
      rank_id:               known(ranks, position?.rank_id),
      cost_center:           position?.cost_center ?? undefined,
      department_id:         known(departments, position?.department_id),
      quantities,
      position_subordinates: position ? position.subordinates.map((s) => s.position_sub_id) : [],
    });
  };

  const handleSave = async () => {
    try {
      await form.validateFields();
    } catch (errorInfo) {
      // Jump to the tab holding the first error.
      setActiveTab(errorInfo.errorFields?.[0]?.name[0] === 'quantities' ? 'branches' : 'details');
      return;
    }

    // getFieldsValue(true): validateFields() only returns mounted fields, and
    // branch rows hidden by the search box are unmounted.
    const values = form.getFieldsValue(true);
    const branchRequirement = branches.map((b) => ({ branch_id: b.id, quantity: values.quantities[`b${b.id}`] }));
    const payload = {
      name:                  values.name,
      rank_id:               values.rank_id,
      cost_center:           values.cost_center,
      department_id:         values.department_id,
      branchRequirement,
      position_subordinates: values.position_subordinates || [],
    };

    setSaving(true);
    await saveRecord({
      request: () => (position ? positionApi.update(position.id, payload) : positionApi.create(payload)),
      form,
      message,
      onSaved,
      // `branchRequirement.<index>.quantity` → that branch's quantity cell.
      fieldFor: (key) => {
        const [root, index] = key.split('.');
        return root === 'branchRequirement' ? qtyField(branchRequirement[index]?.branch_id) : key;
      },
    });
    setSaving(false);
  };

  const search = branchSearch.toLowerCase();
  const visibleBranches = branches.filter((b) => !search || b.name.toLowerCase().includes(search));

  // A position can't be its own subordinate.
  const subordinateItems = positions
    .filter((p) => p.id !== position?.id)
    .map((p) => ({ key: p.id, title: p.name }));

  const tabItems = [
    {
      key: 'details',
      label: 'Details',
      forceRender: true,
      children: (
        <>
          <Form.Item name='name' label='Position' rules={[{ required: true, whitespace: true, message: 'Position is required' }]}>
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name='rank_id' label='Rank' rules={[{ required: true, message: 'Rank is required' }]}>
            <Select
              showSearch={{ optionFilterProp: 'label' }}
              placeholder='Select rank'
              options={ranks.map((r) => ({ label: r.name, value: r.id }))}
            />
          </Form.Item>
          <Form.Item name='cost_center' label='Cost Center' rules={[{ required: true, message: 'Cost center is required' }]}>
            <Select placeholder='Select cost center' options={COST_CENTERS.map((c) => ({ label: c, value: c }))} />
          </Form.Item>
          <Form.Item name='department_id' label='Department' rules={[{ required: true, message: 'Department is required' }]}>
            <Select
              showSearch={{ optionFilterProp: 'label' }}
              placeholder='Select department'
              options={departments.map((d) => ({ label: d.name, value: d.id }))}
            />
          </Form.Item>
        </>
      ),
    },
    {
      key: 'branches',
      label: 'Required Employees per Branch',
      forceRender: true,
      children: (
        <>
          <Input.Search
            placeholder='Search branch'
            allowClear
            onChange={(e) => setBranchSearch(e.target.value)}
            style={{ width: 280, marginBottom: 12 }}
          />
          <Table
            rowKey='id'
            size='small'
            dataSource={visibleBranches}
            pagination={false}
            scroll={{ y: 360 }}
            columns={[
              { title: 'Branch', dataIndex: 'name' },
              {
                title: 'Quantity',
                width: 160,
                render: (_, b) => (
                  <Form.Item name={qtyField(b.id)} style={{ marginBottom: 0 }} rules={[{ required: true, message: 'Required' }]}>
                    <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                  </Form.Item>
                ),
              },
            ]}
          />
        </>
      ),
    },
    {
      key: 'subordinates',
      label: 'Subordinates',
      forceRender: true,
      children: (
        <Form.Item
          name='position_subordinates'
          valuePropName='targetKeys'
          extra='Positions that report to this one.'
        >
          <Transfer
            dataSource={subordinateItems}
            titles={['Positions', 'Subordinates']}
            showSearch
            filterOption={(input, item) => item.title.toLowerCase().includes(input.toLowerCase())}
            render={(item) => item.title}
            styles={{ section: { width: 'calc(50% - 20px)', height: 400 } }}
          />
        </Form.Item>
      ),
    },
  ];

  return (
    <Modal
      keyboard={false}
      open={open}
      title={position ? 'Edit Position' : 'Create Position'}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={860}
    >
      <Form form={form} layout='vertical'>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Form>
    </Modal>
  );
};

export default PositionFormModal;

import { useMemo, useState } from 'react';
import { Modal, Form, Select, Switch, Transfer, Row, Col, Spin, Alert, App } from 'antd';
import jobVacancyApi from '../../../../services/recruitment/jobVacancyApi';
import saveRecord from '../../../record_management/saveRecord';
import { errorMessage } from '../../applicants/requirements';
import { showGatewayError } from '../setupHelpers';

// Portal JobVacanciesIndex.vue options.
const EDUC_ATTAIN_OPTIONS = [
  'College Graduate', 'College Undergraduate', 'Senior Highschool Graduate', 'Highschool Graduate', 'Vocational/TESDA Graduate',
].map((v) => ({ label: v, value: v }));

const BRANCH_TYPE_OPTIONS = [
  { label: 'For Branch Only', value: 0 },
  { label: 'For Admin Only', value: 1 },
];

// Create a job vacancy, or edit one (`vacancyId`). As in the portal, an
// existing vacancy's position / educational attainment / branch type are
// fixed — its update only changes the status and the hiring branches
// (replace-all). Position, educational attainment and branch type are
// required (portal JobVacancyController); hiring branches are optional.
const JobVacancyFormModal = ({ open, vacancyId, positions, branches, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const isEdit = !!vacancyId;

  const positionOptions = useMemo(
    () => positions.map((p) => ({ label: Number(p.status) === 1 ? p.name : `${p.name} (inactive)`, value: p.id })),
    [positions],
  );
  const branchItems = useMemo(
    () => branches.map((b) => ({ key: b.id, title: b.code ? `${b.name} (${b.code})` : b.name })),
    [branches],
  );

  const handleAfterOpenChange = async (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    setLoadError(null);
    if (!vacancyId) return;

    setLoading(true);
    try {
      const { data } = await jobVacancyApi.getById(vacancyId);
      const vacancy = data.resp;
      if (!vacancy) {
        setLoadError('This job vacancy no longer exists.');
        return;
      }
      form.setFieldsValue({
        position_id:     vacancy.position_id,
        educ_attain:     vacancy.educ_attain,
        branch_type:     Number(vacancy.branch_type),
        status:          Number(vacancy.status) === 1,
        hiring_branches: (vacancy.hiring_branches || []).map((hb) => hb.branch_id),
      });
    } catch (err) {
      setLoadError(errorMessage(err, 'Failed to load the job vacancy.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // AntD shows inline field errors
    }

    const status = values.status ? 1 : 0;
    const hiringBranches = values.hiring_branches || [];

    setSaving(true);
    await saveRecord({
      request: () => (isEdit
        ? jobVacancyApi.update({ job_vac_id: vacancyId, status, hiring_branches: hiringBranches })
        : jobVacancyApi.create({
          position_id:     values.position_id,
          educ_attain:     values.educ_attain,
          branch_type:     values.branch_type,
          status,
          hiring_branches: hiringBranches,
        })),
      form,
      message,
      onSaved,
      onError: showGatewayError,
    });
    setSaving(false);
  };

  return (
    <Modal
      keyboard={false}
      open={open}
      title={isEdit ? 'Edit Job Vacancy Status' : 'Create Job Vacancy'}
      okText='Save'
      onOk={handleSave}
      okButtonProps={{ disabled: loading || !!loadError }}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={900}
    >
      {loadError && <Alert type='error' showIcon title={loadError} style={{ marginBottom: 16 }} />}
      <Spin spinning={loading}>
        <Form form={form} layout='vertical' initialValues={{ status: true, hiring_branches: [] }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name='position_id' label='Position' rules={[{ required: true, message: 'Position is required.' }]}>
                <Select
                  showSearch={{ optionFilterProp: 'label' }}
                  placeholder='Select position'
                  options={positionOptions}
                  disabled={isEdit}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name='educ_attain' label='Educational Attainment' rules={[{ required: true, message: 'Educational attainment is required.' }]}>
                <Select placeholder='Select educational attainment' options={EDUC_ATTAIN_OPTIONS} disabled={isEdit} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name='branch_type' label='Branch Type' rules={[{ required: true, message: 'Branch type is required.' }]}>
                <Select placeholder='Select branch type' options={BRANCH_TYPE_OPTIONS} disabled={isEdit} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name='status' label='Status' valuePropName='checked'>
                <Switch checkedChildren='Active' unCheckedChildren='Inactive' />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name='hiring_branches' label='Hiring Branches' valuePropName='targetKeys'>
            <Transfer
              dataSource={branchItems}
              titles={['Available', 'Hiring']}
              showSearch
              filterOption={(input, item) => item.title.toLowerCase().includes(input.toLowerCase())}
              render={(item) => item.title}
              styles={{ section: { width: 'calc(50% - 20px)', height: 340 } }}
            />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default JobVacancyFormModal;

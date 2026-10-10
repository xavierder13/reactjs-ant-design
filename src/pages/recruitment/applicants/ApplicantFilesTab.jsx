import { useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Tooltip, Space, Popconfirm, Empty, Modal, Form, Select, Input, Upload,
  Typography, App,
} from 'antd';
import {
  DownloadOutlined, DeleteOutlined, PlusOutlined, UploadOutlined, CheckCircleFilled, ExclamationCircleFilled,
} from '@ant-design/icons';

import recruitmentApi from '../../../services/recruitment/recruitmentApi';
import downloadBlobResponse from '../../../utils/downloadBlobResponse';
import { formatDate } from '../../../utils/formatDate';
import {
  DOC_TYPES, UPLOAD_EXTENSIONS, UPLOAD_MAX_MB, finalRequiredFiles, missingFiles, gatewayMessage, errorMessage,
} from './requirements';

// Applicant files (Phase 5) — recruitment-portal ApplicantFiles.vue: the
// file list (download / delete), "Add" upload dialog and the Final
// Requirements checklist. Files can't be deleted once the Final Interview
// is passed, and the applicant's own Resume never (the gateway enforces both).
// `onChanged` reloads the applicant so the status gates see the new files.
export default function ApplicantFilesTab({ applicant, files, maps, can, onChanged }) {
  const { message } = App.useApp();
  const [uploadOpen, setUploadOpen] = useState(false);

  const canDelete = (file) => can('careers-file-delete')
    && Number(applicant.final_interview_status) !== 1
    && file.title !== 'Resume';

  const download = async (file) => {
    try {
      const response = await recruitmentApi.downloadFile(file.id);
      await downloadBlobResponse(response, `${file.title || 'file'}.${file.file_type || ''}`.replace(/\.$/, ''), message);
    } catch (err) {
      message.error(errorMessage(err, 'The file could not be downloaded.'));
    }
  };

  const remove = async (file) => {
    try {
      const { data } = await recruitmentApi.deleteFile(file.id);
      if (!data?.success) {
        message.error(gatewayMessage(data, 'The file could not be deleted.'));
        return;
      }
      message.success(data.success);
      onChanged();
    } catch (err) {
      message.error(errorMessage(err, 'The file could not be deleted.'));
    }
  };

  const required = finalRequiredFiles(maps.positions[String(applicant.employment_position)]);
  const missing = new Set(missingFiles(required, files));

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={14}>
        <Card
          size="small"
          title="Applicant's Files"
          extra={can('careers-file-upload') && (
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setUploadOpen(true)}>Add</Button>
          )}
        >
          {files.length ? (
            <Table
              rowKey="id" size="small" pagination={false} dataSource={files}
              columns={[
                { title: 'Document', dataIndex: 'title', render: (v) => <Tag>{v || '-'}</Tag> },
                { title: 'Type', dataIndex: 'file_type', render: (v) => (v ? String(v).toUpperCase() : '-') },
                { title: 'Uploaded', dataIndex: 'created_at', render: (v) => formatDate(v) },
                {
                  title: 'Actions', key: 'actions', width: 90,
                  render: (_, file) => (
                    <Space size={4}>
                      {can('careers-file-download') && (
                        <Tooltip title="Download">
                          <Button color="purple" variant="outlined" size="small" icon={<DownloadOutlined />} onClick={() => download(file)} />
                        </Tooltip>
                      )}
                      {canDelete(file) && (
                        <Popconfirm
                          title="Delete this file?" description="This can't be undone."
                          okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => remove(file)}
                        >
                          <Tooltip title="Delete">
                            <Button danger size="small" icon={<DeleteOutlined />} />
                          </Tooltip>
                        </Popconfirm>
                      )}
                    </Space>
                  ),
                },
              ]}
            />
          ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No files uploaded." />}
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Card size="small" title="Final Requirements">
          <Table
            rowKey="name" size="small" pagination={false} showHeader={false}
            dataSource={required.map((name) => ({ name, ok: !missing.has(name) }))}
            columns={[
              {
                dataIndex: 'name',
                render: (name, { ok }) => (
                  <Space>
                    {ok ? <CheckCircleFilled style={{ color: '#52c41a' }} /> : <ExclamationCircleFilled style={{ color: '#ff4d4f' }} />}
                    <Typography.Text type={ok ? undefined : 'danger'} strong={!ok}>{name}</Typography.Text>
                  </Space>
                ),
              },
              { dataIndex: 'ok', align: 'right', render: (ok) => <Tag color={ok ? 'success' : 'error'}>{ok ? 'Uploaded' : 'Missing'}</Tag> },
            ]}
          />
        </Card>
      </Col>

      <UploadModal
        open={uploadOpen}
        applicantId={applicant.id}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => { setUploadOpen(false); onChanged(); }}
      />
    </Row>
  );
}

function UploadModal({ open, applicantId, onClose, onUploaded }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const docType = Form.useWatch('document_type', form);

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const documentType = values.document_type === 'Others' ? values.other_type.trim() : values.document_type;
    setUploading(true);
    try {
      const { data } = await recruitmentApi.uploadFile(applicantId, documentType, values.file[0].originFileObj);
      if (!data?.success) {
        message.error(gatewayMessage(data, 'The file could not be uploaded.'));
        return;
      }
      message.success(data.success);
      onUploaded();
    } catch (err) {
      message.error(errorMessage(err, 'The file could not be uploaded.'));
    } finally {
      setUploading(false);
    }
  };

  // Same limits as vueportal / the portal validate: extension list, 20 MB.
  const checkFile = (_, fileList) => {
    const file = fileList?.[0];
    if (!file) return Promise.reject(new Error('File is required.'));
    const ext = String(file.name).split('.').pop().toLowerCase();
    if (!UPLOAD_EXTENSIONS.includes(ext)) return Promise.reject(new Error(`File type must be ${UPLOAD_EXTENSIONS.join(', ')}.`));
    if (file.size > UPLOAD_MAX_MB * 1024 * 1024) return Promise.reject(new Error(`File size maximum is ${UPLOAD_MAX_MB}MB.`));
    return Promise.resolve();
  };

  return (
    <Modal
      keyboard={false}
      open={open}
      title="Attach Applicant's File"
      destroyOnHidden
      afterOpenChange={(isOpen) => { if (isOpen) form.resetFields(); }}
      onCancel={onClose}
      onOk={handleSave}
      okText="Upload"
      confirmLoading={uploading}
      mask={{ closable: false }}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="document_type" label="Document Type" rules={[{ required: true, message: 'Please select document type.' }]}>
          <Select options={DOC_TYPES.map((t) => ({ value: t, label: t }))} showSearch={{ optionFilterProp: 'label' }} placeholder="Select document type" />
        </Form.Item>
        {docType === 'Others' && (
          <Form.Item
            name="other_type" label="Specify Document Type"
            rules={[{ required: true, whitespace: true, message: 'Please specify document type.' }]}
          >
            <Input maxLength={100} />
          </Form.Item>
        )}
        <Form.Item
          name="file" label="File" valuePropName="fileList"
          getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
          rules={[{ validator: checkFile }]}
          extra={`${UPLOAD_EXTENSIONS.join(', ')} — up to ${UPLOAD_MAX_MB}MB`}
        >
          <Upload beforeUpload={() => false} maxCount={1} accept={UPLOAD_EXTENSIONS.map((e) => `.${e}`).join(',')}>
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  App, Button, Card, Col, DatePicker, Empty, Flex, Form, Radio,
  Row, Select, Spin, Statistic, Table, Typography,
} from 'antd';
import { BarChartOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import branchManpowerApi from '../../../services/employee/branchManpowerApi';
import handleApiError from '../../../utils/handleApiError';
import downloadBlobResponse from '../../../utils/downloadBlobResponse';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import PositionColumnsPicker from './PositionColumnsPicker';
import { buildColumns, buildRows, formatRate } from './reportTable';

const { Text } = Typography;

// A blob request's 422 body arrives as a Blob — parse it so handleApiError
// can show the validation message.
const handleBlobError = async (error, message) => {
  if (error.response?.data instanceof Blob) {
    try {
      error.response.data = JSON.parse(await error.response.data.text());
    } catch {
      // not JSON — fall through with the generic message
    }
  }
  handleApiError(error, message);
};

const GROUP_BY_OPTIONS = [
  { label: 'Per Area', value: 'area' },
  { label: 'Per Branch', value: 'branch' },
  { label: 'Per HR Head Personnel', value: 'hr_head' },
];

// Multi-select label / empty-state text per Generate by mode.
const SELECTION_TEXT = {
  area:    { label: 'Areas', placeholder: 'All areas' },
  branch:  { label: 'Branches', placeholder: 'All branches' },
  hr_head: { label: 'HR Head Personnel', placeholder: 'All HR head personnel' },
};

// Branch manpower fill rate (R-5): Req / Exst / Vac per position for each
// branch with fill-in and vacancy rates, generated per area, per branch or
// per area HR head (multi-select; nothing selected = all).
// Position columns start as the legacy report's default set and can be
// freely added, removed and reordered. The numbers match vueportal's legacy 'Branch Manpower Report'
// export (Exst = its Ending column); see BranchManpowerReportService.
export default function BranchManpowerReport() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const groupBy = Form.useWatch('group_by', form);

  const [options, setOptions]           = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [report, setReport]             = useState(null);
  const [generating, setGenerating]     = useState(false);
  const [exporting, setExporting]       = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await branchManpowerApi.getOptions();
        setOptions(data);
        form.setFieldsValue({ positions: data.default_positions });
      } catch (error) {
        handleApiError(error, message);
      } finally {
        setLoadingOptions(false);
      }
    };
    load();
  }, [form, message]);

  // Choices for the selected Generate by mode.
  const selectionOptions = useMemo(() => {
    if (!options) return [];
    if (groupBy === 'branch') {
      return options.branches.map((branch) => ({
        label: branch.area_name ? `${branch.name} (${branch.area_name})` : branch.name, value: branch.id,
      }));
    }
    if (groupBy === 'hr_head') {
      return options.hr_heads.map((head) => ({ label: `${head.full_name} (${head.areas.join(', ')})`, value: head.employee_id }));
    }
    return options.areas.map((area) => ({ label: `${area.code} - ${area.name}`, value: area.id }));
  }, [options, groupBy]);

  const selectionText = SELECTION_TEXT[groupBy] || SELECTION_TEXT.area;

  const columns = useMemo(() => (report ? buildColumns(report) : []), [report]);
  const rows = useMemo(() => (report ? buildRows(report) : []), [report]);

  const buildPayload = async () => {
    const values = await form.validateFields();
    return {
      as_of:     values.as_of.format('YYYY-MM-DD'),
      group_by:  values.group_by,
      ids:       values.ids || [],
      positions: values.positions,
    };
  };

  const handleGenerate = async () => {
    try {
      const payload = await buildPayload();
      setGenerating(true);
      const { data } = await branchManpowerApi.getReport(payload);
      setReport(data.report);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async () => {
    try {
      const payload = await buildPayload();
      setExporting(true);
      const response = await branchManpowerApi.export(payload);
      const scope = `${GROUP_BY_OPTIONS.find((option) => option.value === payload.group_by).label}${payload.ids.length ? '' : ' - All'}`;
      const downloaded = await downloadBlobResponse(
        response, `Branch Manpower Fill Rate - ${scope} (${payload.as_of}).xlsx`, message,
      );
      if (downloaded) message.success('Export downloaded.');
    } catch (error) {
      await handleBlobError(error, message);
    } finally {
      setExporting(false);
    }
  };

  if (loadingOptions) {
    return <Flex justify='center' style={{ padding: 48 }}><Spin /></Flex>;
  }

  const grand = report?.grand_total.total;

  return (
    <>
      <Card title='Branch Manpower Fill Rate' style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout='vertical'
          initialValues={{ as_of: dayjs(), group_by: 'area', ids: [], positions: [] }}
          onValuesChange={(changed) => {
            // ids belong to the previous mode's list (area vs branch vs employee ids).
            if ('group_by' in changed) form.setFieldsValue({ ids: [] });
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item name='as_of' label='As of' rules={[{ required: true, message: 'Please select a date.' }]}>
                <DatePicker style={{ width: '100%' }} format={DISPLAY_DATE_FORMAT} allowClear={false} />
              </Form.Item>
            </Col>
            <Col xs={24} md={18}>
              <Form.Item name='group_by' label='Generate by'>
                <Radio.Group optionType='button' options={GROUP_BY_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item
                name='ids'
                label={`${selectionText.label} (leave empty for all)`}
                extra={groupBy === 'hr_head' && options?.hr_heads.length === 0
                  ? 'No HR heads are assigned yet — assign them on the Area Assignment page.'
                  : null}
              >
                <Select
                  mode='multiple'
                  allowClear
                  placeholder={selectionText.placeholder}
                  options={selectionOptions}
                  showSearch
                  filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
                  maxTagCount='responsive'
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name='positions'
            label='Position columns (drag to reorder)'
            rules={[{ type: 'array', min: 1, message: 'Select at least one position.' }]}
          >
            <PositionColumnsPicker positions={options?.positions || []} defaultPositions={options?.default_positions || []} />
          </Form.Item>

          <Flex gap={8}>
            <Button type='primary' icon={<BarChartOutlined />} loading={generating} onClick={handleGenerate}>
              Generate
            </Button>
            <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
              Export Excel
            </Button>
          </Flex>
        </Form>
      </Card>

      {report ? (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={12} md={4}><Card><Statistic title='Required' value={grand.required} /></Card></Col>
            <Col xs={12} md={4}><Card><Statistic title='Existing' value={grand.existing} /></Card></Col>
            <Col xs={12} md={4}><Card><Statistic title='Vacant' value={grand.vacant} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title='Fill-in Rate' value={formatRate(grand.fill_rate)} /></Card></Col>
            <Col xs={24} md={6}><Card><Statistic title='Vacancy Rate' value={formatRate(grand.vacancy_rate)} /></Card></Col>
          </Row>

          <Card
            title={`As of ${dayjs(report.as_of).format(DISPLAY_DATE_FORMAT)}`}
            extra={(
              <Text type='secondary'>
                Exst = existing on {dayjs(report.previous_end).format(DISPLAY_DATE_FORMAT)} + deployed − resigned − promoted/re-assigned
                from {dayjs(report.first_of_month).format(DISPLAY_DATE_FORMAT)}
              </Text>
            )}
          >
            <Table
              rowKey='key'
              size='small'
              bordered
              columns={columns}
              dataSource={rows}
              pagination={false}
              scroll={{ x: 'max-content', y: 600 }}
            />
          </Card>
        </>
      ) : (
        <Card><Empty description='Choose the filters and click Generate.' /></Card>
      )}
    </>
  );
}

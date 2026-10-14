import dayjs from 'dayjs';
import { Form, Radio, Select, DatePicker, Row, Col } from 'antd';
import { DISPLAY_DATE_FORMAT } from '../../utils/formatDate';
import { cutoffOptions } from '../payroll/payrollHelpers';

// A shifting's period, by Dates or by Cut-offs (like the payroll reports'
// range filter). Cut-offs fill the `dates` field with the first cut-off's
// start to the last one's end — the API still takes date_from / date_to.
// Fields: coverage, cutoff_from, cutoff_to (not sent), dates.
const ShiftPeriodFields = ({ form, cutoffs = [], label = 'Period' }) => {
  const coverage = Form.useWatch('coverage', form) || 'dates';

  const sync = (fromId, toId) => {
    const a = cutoffs.find((c) => c.id === fromId);
    const b = cutoffs.find((c) => c.id === toId);
    form.setFieldValue('dates', a && b ? [dayjs(a.date_from), dayjs(b.date_to)] : undefined);
  };
  const onFrom = (v) => {
    const from = cutoffs.find((c) => c.id === v);
    const to = cutoffs.find((c) => c.id === form.getFieldValue('cutoff_to'));
    // To follows From: one cut-off = that payroll period
    const toId = !to || (from && to.date_from < from.date_from) ? v : to.id;
    form.setFieldValue('cutoff_to', toId);
    sync(v, toId);
  };
  const onTo = (v) => sync(form.getFieldValue('cutoff_from'), v);
  const options = cutoffOptions(cutoffs);
  const fromCutoff = cutoffs.find((c) => c.id === form.getFieldValue('cutoff_from'));

  return (
    <>
      <Form.Item name='coverage' label='Coverage' initialValue='dates'>
        <Radio.Group
          optionType='button' buttonStyle='solid'
          options={[{ value: 'dates', label: 'Dates' }, { value: 'cutoffs', label: 'Cut-offs' }]}
          onChange={() => form.setFieldsValue({ cutoff_from: undefined, cutoff_to: undefined })}
        />
      </Form.Item>
      {coverage === 'cutoffs' && (
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name='cutoff_from' label='From Cut-off' rules={[{ required: true, message: 'Start cut-off is required' }]}>
              <Select options={options} showSearch={{ optionFilterProp: 'label' }} placeholder='Select the cut-off' onChange={onFrom} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='cutoff_to' label='To Cut-off' rules={[{ required: true, message: 'End cut-off is required' }]}>
              <Select
                options={options.map((o) => ({ ...o, disabled: !!fromCutoff && cutoffs.find((c) => c.id === o.value).date_from < fromCutoff.date_from }))}
                showSearch={{ optionFilterProp: 'label' }}
                placeholder='Same as From'
                onChange={onTo}
              />
            </Form.Item>
          </Col>
        </Row>
      )}
      <Form.Item
        name='dates'
        label={label}
        extra={coverage === 'cutoffs' ? 'Set from the cut-offs: the first one’s start to the last one’s end.' : null}
        rules={[{ required: true, message: `${label} is required` }]}
      >
        <DatePicker.RangePicker format={DISPLAY_DATE_FORMAT} disabled={coverage === 'cutoffs'} />
      </Form.Item>
    </>
  );
};

export default ShiftPeriodFields;

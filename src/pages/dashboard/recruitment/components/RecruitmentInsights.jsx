import { Card, Alert } from 'antd';
import {
  CheckCircleOutlined, InfoCircleOutlined, WarningOutlined, BankOutlined,
  FieldTimeOutlined, ClockCircleOutlined, ExclamationCircleOutlined, FileExclamationOutlined,
} from '@ant-design/icons';

// vueportal's mdi icon names → AntD icons
const ICONS = {
  'check-circle': <CheckCircleOutlined />,
  'information': <InfoCircleOutlined />,
  'alert': <WarningOutlined />,
  'office-building': <BankOutlined />,
  'timer-outline': <FieldTimeOutlined />,
  'account-clock': <ClockCircleOutlined />,
  'alert-circle': <ExclamationCircleOutlined />,
  'file-clock': <FileExclamationOutlined />,
};

// vueportal RecruitmentInsights.vue
export default function RecruitmentInsights({ recruitmentInsights }) {
  return (
    <Card size='small' title='Recruitment Insights' style={{ borderRadius: 8, marginBottom: 32 }}>
      {recruitmentInsights.map((insight, i) => (
        <Alert key={i} type={insight.type} icon={ICONS[insight.icon]} title={insight.text} showIcon style={{ marginBottom: 12, borderRadius: 8 }} />
      ))}
    </Card>
  );
}

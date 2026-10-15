import { useState } from 'react';
import { Button, Drawer, Grid, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import PayrollAssistantPanel from './PayrollAssistantPanel';

// Top-bar "?" — opens the Payroll Assistant in a side panel on any page
// (payroll-assistant or payroll-assistant-manage; Administrator).
const PayrollAssistantButton = () => {
  const { hasPermission, hasRole } = useAuth();
  const screens = Grid.useBreakpoint();
  const [open, setOpen] = useState(false);
  if (!(hasRole('Administrator') || hasPermission('payroll-assistant') || hasPermission('payroll-assistant-manage'))) return null;

  return (
    <>
      <Tooltip title='Payroll Assistant'>
        <Button className='app-navbar__icon-btn' type='text' aria-label='Payroll Assistant' icon={<QuestionCircleOutlined />} onClick={() => setOpen(true)} />
      </Tooltip>
      <Drawer
        keyboard={false}
        title='Payroll Assistant'
        open={open}
        onClose={() => setOpen(false)}
        size={screens.md ? 520 : '100%'}
        destroyOnHidden
      >
        <PayrollAssistantPanel onNavigate={() => setOpen(false)} />
      </Drawer>
    </>
  );
};

export default PayrollAssistantButton;

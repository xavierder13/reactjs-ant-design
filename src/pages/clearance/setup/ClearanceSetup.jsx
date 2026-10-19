import { Tabs } from 'antd';
import { useSearchParams } from 'react-router-dom';
import ClearanceTemplatesTab from './ClearanceTemplatesTab';
import ClearanceCategoriesTab from './ClearanceCategoriesTab';

// Clearance Setup (/clearances/setup, clearance-setup): the templates (each
// a clearance process for some branches) and the checklist categories
// their lines are grouped under. Changes never touch clearances already
// started — they keep their own copy.
const ClearanceSetup = () => {
  const [params, setParams] = useSearchParams();

  return (
    <Tabs
      activeKey={params.get('tab') === 'categories' ? 'categories' : 'templates'}
      onChange={(key) => setParams(key === 'templates' ? {} : { tab: key })}
      items={[
        { key: 'templates', label: 'Templates', children: <ClearanceTemplatesTab /> },
        { key: 'categories', label: 'Categories', children: <ClearanceCategoriesTab onChanged={() => {}} /> },
      ]}
    />
  );
};

export default ClearanceSetup;

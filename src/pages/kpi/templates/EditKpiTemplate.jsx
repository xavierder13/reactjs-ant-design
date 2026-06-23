import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spin } from 'antd';
import kpiTemplateApi from '../../../services/kpi/kpiTemplateApi';
import KpiTemplateForm from './KpiTemplateForm';

const EditKpiTemplate = () => {
  const { id }                      = useParams();
  const [template, setTemplate]     = useState(null);
  const [loading,  setLoading]      = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await kpiTemplateApi.getById(id);
        setTemplate(data.template);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <Spin size='large' />
    </div>
  );

  return <KpiTemplateForm mode='edit' template={template} />;
};

export default EditKpiTemplate;
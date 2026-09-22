import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import roleApi from '../../services/role/roleApi';
import RoleForm from './RoleForm';

const CreateRole = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await roleApi.getCreateMeta();
        setPermissions(data.permissions);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <Spin size='large' />
    </div>
  );

  return <RoleForm mode='create' permissions={permissions} />;
};

export default CreateRole;

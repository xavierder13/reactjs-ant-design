import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spin } from 'antd';
import roleApi from '../../services/role/roleApi';
import RoleForm from './RoleForm';

const EditRole = () => {
  const { id } = useParams();
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await roleApi.getById(id);
        setRole(data.role);
        setPermissions(data.permissions);
        setRolePermissions(data.rolePermissions);
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

  return (
    <RoleForm
      mode='edit'
      role={role}
      permissions={permissions}
      rolePermissions={rolePermissions}
    />
  );
};

export default EditRole;

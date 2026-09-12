import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';
import { useEffect, useState } from 'react';
import ManpowerRequestForm from './ManpowerRequestForm';
import useManpowerRequestStore from '../../../store/manpowerRequestStore';
import useAuth from '../../../hooks/useAuth';

const EditManpowerRequest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole, user } = useAuth();
  const fetchById = useManpowerRequestStore((state) => state.fetchById);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notEditable, setNotEditable] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await fetchById(id);
      if (result) {
        const record = result.manpower_request;
        // Same Administrator-or-owner rule as canEdit on the Index/View
        // pages — this route was previously reachable (loading data and
        // rendering the form) for anyone with edit access, regardless of
        // ownership, since only the status was checked here.
        const isOwnerOrAdmin = hasRole('Administrator') || record.user_id === user.id;
        if (!isOwnerOrAdmin || !['Draft', 'Disapproved', 'Cancelled'].includes(record.status)) {
          setNotEditable(true);
        } else {
          setData(record);
        }
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  if (notEditable) {
    return (
      <Result
        status="warning"
        title="This request can no longer be edited"
        extra={<Button type="primary" onClick={() => navigate(`/manpower-requests/${id}`)}>View Request</Button>}
      />
    );
  }

  return <ManpowerRequestForm mode="edit" initialData={data} />;
};

export default EditManpowerRequest;
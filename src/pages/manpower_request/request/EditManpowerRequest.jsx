import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';
import { useEffect, useState } from 'react';
import ManpowerRequestForm from './ManpowerRequestForm';
import useManpowerRequestStore from '../../../store/manpowerRequestStore';

const EditManpowerRequest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fetchById = useManpowerRequestStore((state) => state.fetchById);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notEditable, setNotEditable] = useState(false);

  useEffect(() => {
    (async () => {
      const record = await fetchById(id);
      if (record) {
        if (!['Draft', 'Returned'].includes(record.status)) {
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
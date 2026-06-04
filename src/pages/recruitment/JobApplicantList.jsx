import { useParams } from "react-router-dom";
import DataTable from './components/DataTable';

const ApplicantIndexPage = () => {
  const { url } = useParams();
  return <DataTable url={url} />;
}

export default ApplicantIndexPage;
const ApplicantListDataTable = ({ url = null }) => {
  const listType = url.split('-').join(' ');
  console.log(listType.toUpperCase());
  
  return `This is Applicant List Data Table (${listType.toUpperCase()})`;
}

export default ApplicantListDataTable;
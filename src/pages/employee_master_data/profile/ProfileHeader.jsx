import { useState } from "react";
import { Card, Avatar, Typography, Tag, Space, Upload, Button, Tooltip, Row, Col, Spin, App } from "antd";
import { CameraOutlined, MailOutlined, PhoneOutlined, ShopOutlined, IdcardOutlined, ShareAltOutlined, CopyOutlined } from "@ant-design/icons";

import employeeApi from "../../../services/employee/employeeApi";
import handleApiError from "../../../utils/handleApiError";
import { formatDate } from "../../../utils/formatDate";
import { isActiveValue } from "../../../utils/employeeStatus";
import { employeePhotoUrl, initials } from "../../../utils/employeePhoto";
import { buildReferralLink, copyText } from "../../../utils/referralLink";
import reportingManager from "./reportingManager";

const PHOTO_TYPES = ["jpg", "jpeg", "png"];
// Same limit EmployeeProfile2.vue enforces client-side (25MB); the backend
// file_validator caps uploads at ~10MB, so that's the real ceiling.
const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

const Fact = ({ label, children }) => (
  <div>
    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{label}</Typography.Text>
    <div style={{ fontWeight: 500 }}>{children || "-"}</div>
  </div>
);

const ContactLine = ({ icon, children }) => (children ? (
  <Space size={6} style={{ color: "rgba(0, 0, 0, 0.65)" }}>
    {icon}
    <span>{children}</span>
  </Space>
) : null);

// Identity card at the top of the profile: photo (uploadable when
// `canUploadPhoto`), name, status, position/department, contact, and key
// employment facts incl. who they report to. `extra` renders top-right
// (e.g. the Edit button).
export default function ProfileHeader({ employee, canUploadPhoto, onEmployeeChange, extra }) {
  const { message: messageApi } = App.useApp();
  const [uploading, setUploading] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(null);

  const active = isActiveValue(employee.active);
  const manager = reportingManager(employee);
  const photoUrl = employeePhotoUrl(employee, photoVersion);
  const managerPhotoUrl = employeePhotoUrl(manager);
  const referral = employee.referral;

  const copyReferralLink = () => {
    copyText(buildReferralLink(referral.referral_code))
      .then(() => messageApi.success("Referral link copied!"))
      .catch(() => messageApi.error("Could not copy link."));
  };

  const handlePhoto = async (file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (!PHOTO_TYPES.includes(ext)) {
      messageApi.error("Photo must be a JPG or PNG image.");
      return false;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      messageApi.error("Photo must be 10MB or smaller.");
      return false;
    }

    setUploading(true);
    try {
      const { data } = await employeeApi.profilePictureUpload(employee.id, file);
      if (data?.error || !data?.profile_picture) {
        const error = data?.error;
        messageApi.error(typeof error === "string" ? error : [].concat(Object.values(error || {})[0])[0] || "Failed to upload photo.");
        return false;
      }
      setPhotoVersion(Date.now());
      onEmployeeChange?.(data.profile_picture);
      messageApi.success("Profile photo updated.");
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setUploading(false);
    }
    return false;
  };

  const avatar = (
    <Avatar
      size={112}
      src={photoUrl}
      style={{ backgroundColor: "#389e0d", fontSize: 40, flexShrink: 0 }}
    >
      {initials(employee.name || `${employee.first_name || ""} ${employee.last_name || ""}`)}
    </Avatar>
  );

  return (
    <Card>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <Spin spinning={uploading}>
          <div style={{ position: "relative", width: 112 }}>
            {avatar}
            {canUploadPhoto && (
              <Upload accept=".jpg,.jpeg,.png" showUploadList={false} beforeUpload={handlePhoto}>
                <Tooltip title="Change photo">
                  <Button
                    shape="circle"
                    icon={<CameraOutlined />}
                    size="small"
                    style={{ position: "absolute", right: 4, bottom: 4 }}
                  />
                </Tooltip>
              </Upload>
            )}
          </div>
        </Spin>

        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <Space size={8} wrap align="center">
                <Typography.Title level={3} style={{ margin: 0 }}>
                  {employee.name || `${employee.first_name || ""} ${employee.last_name || ""}`}
                </Typography.Title>
                <Tag color={active ? "success" : "default"}>{active ? "Active" : "Inactive"}</Tag>
                {employee.employment_type && <Tag color="blue">{employee.employment_type}</Tag>}
              </Space>
              <div style={{ marginTop: 4 }}>
                <Typography.Text strong style={{ color: "#389e0d" }}>{employee.position?.name || "No position"}</Typography.Text>
                {employee.department?.name && <Typography.Text type="secondary"> · {employee.department.name}</Typography.Text>}
              </div>
            </div>
            {extra}
          </div>

          <Space size={[20, 6]} wrap style={{ marginTop: 12 }}>
            <ContactLine icon={<IdcardOutlined />}>{employee.employee_code}</ContactLine>
            <ContactLine icon={<ShopOutlined />}>
              {employee.branch?.name}{employee.branch?.company?.name ? ` (${employee.branch.company.name})` : ""}
            </ContactLine>
            <ContactLine icon={<MailOutlined />}>
              {employee.email && <a href={`mailto:${employee.email}`}>{employee.email}</a>}
            </ContactLine>
            <ContactLine icon={<PhoneOutlined />}>{employee.contact}</ContactLine>
          </Space>

          {referral?.referral_code && (
            <Space size={8} wrap align="center" style={{ marginTop: 10 }}>
              <ShareAltOutlined style={{ color: "rgba(0, 0, 0, 0.65)" }} />
              <Typography.Text type="secondary">Referral Code:</Typography.Text>
              <Typography.Text strong copyable={{ text: referral.referral_code, tooltips: ["Copy code", "Copied"] }}>
                {referral.referral_code}
              </Typography.Text>
              {!referral.is_active && (
                <Tooltip title="The careers portal won't accept this code until it is reactivated.">
                  <Tag color="warning" style={{ marginInlineEnd: 0 }}>Inactive</Tag>
                </Tooltip>
              )}
              <Button size="small" icon={<CopyOutlined />} onClick={copyReferralLink}>Copy referral link</Button>
            </Space>
          )}
        </div>
      </div>

      <Row gutter={[24, 16]} style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(5, 5, 5, 0.06)" }}>
        <Col xs={12} md={6}><Fact label="Hire Date">{formatDate(employee.date_employed, "")}</Fact></Col>
        <Col xs={12} md={6}><Fact label="Length of Service">{employee.length_of_service}</Fact></Col>
        <Col xs={12} md={6}>
          <Fact label={active ? "Regularization Date" : "Date Resigned"}>
            {formatDate(active ? employee.regularization_date : employee.date_resigned, "")}
          </Fact>
        </Col>
        <Col xs={12} md={6}>
          <Fact label="Reports To">
            {manager && (
              <Space size={8}>
                <Avatar size="small" src={managerPhotoUrl}>{initials(manager.name)}</Avatar>
                <span>{manager.name}</span>
              </Space>
            )}
          </Fact>
        </Col>
      </Row>
    </Card>
  );
}

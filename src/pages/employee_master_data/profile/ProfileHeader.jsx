import { useState } from "react";
import { Card, Avatar, Typography, Tag, Space, Upload, Button, Tooltip, Row, Col, Spin, App, theme } from "antd";
import {
  CameraOutlined, UserOutlined, MailOutlined, PhoneOutlined, ShopOutlined, IdcardOutlined, ShareAltOutlined, CopyOutlined,
  CalendarOutlined, FieldTimeOutlined, SafetyCertificateOutlined, LogoutOutlined, TeamOutlined,
} from "@ant-design/icons";

import employeeApi from "../../../services/employee/employeeApi";
import handleApiError from "../../../utils/handleApiError";
import { formatDate } from "../../../utils/formatDate";
import { isActiveValue } from "../../../utils/employeeStatus";
import { employeePhotoUrl, initials } from "../../../utils/employeePhoto";
import { buildReferralLink, copyText } from "../../../utils/referralLink";
import reportingManager from "./reportingManager";
import { IconBadge } from "./profileUi";

const PHOTO_TYPES = ["jpg", "jpeg", "png"];
// Same limit EmployeeProfile2.vue enforces client-side (25MB); the backend
// file_validator caps uploads at ~10MB, so that's the real ceiling.
const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

// One key fact as a soft tile: icon badge, small muted label, value.
const Fact = ({ icon, label, children }) => {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: "100%",
        padding: "10px 14px",
        borderRadius: 12,
        background: token.colorFillQuaternary,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <IconBadge icon={icon} size={34} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{label}</Typography.Text>
        <div style={{ fontWeight: 600 }}>{children || "-"}</div>
      </div>
    </div>
  );
};

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
  const { token } = theme.useToken();
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

  const fullName = employee.name || `${employee.first_name || ""} ${employee.last_name || ""}`;

  return (
    <Card style={{ borderRadius: 12, overflow: "hidden" }} styles={{ body: { padding: 0 } }}>
      {/* Cover band in the theme green */}
      <div
        style={{
          height: 84,
          background: `linear-gradient(120deg, ${token.colorPrimary} 0%, ${token.colorPrimaryBorderHover} 100%)`,
        }}
      />

      <div style={{ padding: "0 24px 24px" }}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
          <Spin spinning={uploading}>
            <div style={{ position: "relative", width: 120, marginTop: -52 }}>
              <Avatar
                size={120}
                src={photoUrl}
                style={{
                  backgroundColor: token.colorPrimary,
                  fontSize: 42,
                  border: `4px solid ${token.colorBgContainer}`,
                  boxShadow: token.boxShadowTertiary,
                  flexShrink: 0,
                }}
              >
                {initials(fullName)}
              </Avatar>
              {canUploadPhoto && (
                <Upload accept=".jpg,.jpeg,.png" showUploadList={false} beforeUpload={handlePhoto}>
                  <Tooltip title="Change photo">
                    <Button
                      shape="circle"
                      icon={<CameraOutlined />}
                      size="small"
                      style={{ position: "absolute", right: 6, bottom: 6, boxShadow: token.boxShadowTertiary }}
                    />
                  </Tooltip>
                </Upload>
              )}
            </div>
          </Spin>

          <div style={{ flex: 1, minWidth: 240, paddingTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div>
                <Space size={8} wrap align="center">
                  <Typography.Title level={3} style={{ margin: 0 }}>{fullName}</Typography.Title>
                  <Tag color={active ? "success" : "default"} style={{ borderRadius: 999 }}>{active ? "Active" : "Inactive"}</Tag>
                  {employee.employment_type && <Tag color="blue" style={{ borderRadius: 999 }}>{employee.employment_type}</Tag>}
                </Space>
                <div style={{ marginTop: 2 }}>
                  <Typography.Text strong style={{ color: token.colorPrimary }}>{employee.position?.name || "No position"}</Typography.Text>
                  {employee.department?.name && <Typography.Text type="secondary"> · {employee.department.name}</Typography.Text>}
                </div>
              </div>
              {extra}
            </div>
          </div>
        </div>

        <Space size={[24, 6]} wrap style={{ marginTop: 12 }}>
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
            <ShareAltOutlined style={{ color: token.colorTextSecondary }} />
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

        <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Fact icon={<CalendarOutlined />} label="Hire Date">{formatDate(employee.date_employed, "")}</Fact>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Fact icon={<FieldTimeOutlined />} label="Length of Service">{employee.length_of_service}</Fact>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Fact
              icon={active ? <SafetyCertificateOutlined /> : <LogoutOutlined />}
              label={active ? "Regularization Date" : "Date Resigned"}
            >
              {formatDate(active ? employee.regularization_date : employee.date_resigned, "")}
            </Fact>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Fact icon={<TeamOutlined />} label="Reports To">
              {manager && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <Avatar
                    size={28}
                    src={managerPhotoUrl}
                    icon={<UserOutlined />}
                    style={{
                      flexShrink: 0,
                      backgroundColor: token.colorBgContainer,
                      color: token.colorPrimary,
                      border: `2px solid ${token.colorPrimary}`,
                    }}
                  />
                  <div style={{ minWidth: 0, lineHeight: 1.25 }}>
                    <Typography.Text strong ellipsis={{ tooltip: manager.displayName }} style={{ display: "block" }}>
                      {manager.displayName}
                    </Typography.Text>
                    <Typography.Text style={{ fontSize: 12, fontWeight: 400, color: token.colorPrimaryText }}>
                      {manager.role}
                    </Typography.Text>
                  </div>
                </div>
              )}
            </Fact>
          </Col>
        </Row>
      </div>
    </Card>
  );
}

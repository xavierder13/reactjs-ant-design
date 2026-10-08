import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Table, Tag, Alert, Calendar, Segmented, Select, Input, Button, Space, Tooltip, Typography, Card, App,
} from 'antd';
import { CalendarOutlined, UnorderedListOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import useAuth from '../../../hooks/useAuth';
import useHolidayCalendars from '../../../hooks/useHolidayCalendars';
import holidayCalendarApi from '../../../services/record_management/holidayCalendarApi';
import handleApiError from '../../../utils/handleApiError';
import { formatDate } from '../../../utils/formatDate';
import RecordRowActions from '../RecordRowActions';
import HolidayCalendarFormModal from './HolidayCalendarFormModal';
import { HOLIDAY_TYPES, holidayType } from './holidayTypes';
import { tablePagination } from '../../../utils/tablePagination';

// Holiday Calendar — replaces vueportal's calendar/HolidayCalendar.vue.
// Calendar view (month grid; click a day to add, a holiday to edit) and a
// List view of the selected year, sharing the type / branch / status
// filters. Every holiday names the branches that observe it (all branches
// for national holidays, some for a local one).
const HolidayCalendarIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const { items, branches, isLoading, error, refetch } = useHolidayCalendars();

  const [view, setView]             = useState('calendar');
  const [month, setMonth]           = useState(dayjs());
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState(null);
  const [branchFilter, setBranchFilter] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [defaultDate, setDefaultDate] = useState(null);

  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('holiday-calendar-create');
  const canEdit   = isAdmin || hasPermission('holiday-calendar-edit');
  const canDelete = isAdmin || hasPermission('holiday-calendar-delete');

  const branchName = useMemo(() => Object.fromEntries(branches.map((b) => [b.id, b.name])), [branches]);
  // unique: holidays edited before the backend fix have duplicate rows
  const branchIdsOf = (holiday) => [...new Set(holiday.holiday_calendar_branches.map((b) => b.branch_id))];
  const isAllBranches = (holiday) => branches.length > 0 && branches.every((b) => branchIdsOf(holiday).includes(b.id));

  // Type / branch / status / search apply to both views; the list is
  // further limited to the year shown.
  const filtered = useMemo(() => {
    const search = searchText.toLowerCase();
    return items.filter((h) => (showInactive || Number(h.status) === 1)
      && (!typeFilter || h.holiday_type === typeFilter)
      && (!branchFilter || h.holiday_calendar_branches.some((b) => b.branch_id === branchFilter))
      && (!search || h.title.toLowerCase().includes(search)));
  }, [items, searchText, typeFilter, branchFilter, showInactive]);

  const byDate = useMemo(() => {
    const map = {};
    filtered.forEach((h) => { (map[h.date] = map[h.date] || []).push(h); });
    return map;
  }, [filtered]);

  const yearRows = useMemo(() => filtered.filter((h) => dayjs(h.date).year() === month.year()), [filtered, month]);

  const openCreate = (date = null) => { setEditing(null); setDefaultDate(date); setModalOpen(true); };
  const openEdit   = (record) => { setEditing(record); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); setDefaultDate(null); };
  const handleSaved = () => { closeModal(); refetch(); };

  const handleDelete = async (id) => {
    try {
      const { data } = await holidayCalendarApi.delete(id);
      message.success(data.success || 'Record has been deleted');
      refetch();
    } catch (err) {
      handleApiError(err, message);
    }
  };

  const branchSummary = (holiday) => {
    if (isAllBranches(holiday)) return <Tag color='green'>All branches</Tag>;
    const names = branchIdsOf(holiday).map((id) => branchName[id] || `#${id}`).sort((a, b) => a.localeCompare(b));
    return (
      <Tooltip title={names.join(', ')}>
        <Space size={[0, 4]} wrap>
          {names.slice(0, 3).map((n) => <Tag key={n}>{n}</Tag>)}
          {names.length > 3 && <Tag>+{names.length - 3} more</Tag>}
        </Space>
      </Tooltip>
    );
  };

  const holidayTag = (holiday) => {
    const type = holidayType(holiday.holiday_type);
    const inactive = Number(holiday.status) !== 1;
    return (
      <Tooltip
        key={holiday.id}
        title={`${type.label}${inactive ? ' (inactive)' : ''} — ${isAllBranches(holiday) ? 'all branches' : `${branchIdsOf(holiday).length} branch(es)`}`}
      >
        <Tag
          color={inactive ? 'default' : type.color}
          style={{ display: 'block', marginBottom: 2, whiteSpace: 'normal', cursor: canEdit ? 'pointer' : 'default', textDecoration: inactive ? 'line-through' : 'none' }}
          onClick={(e) => { e.stopPropagation(); if (canEdit) openEdit(holiday); }}
        >
          {holiday.title}
        </Tag>
      </Tooltip>
    );
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      width: 150,
      render: (date) => `${formatDate(date)} (${dayjs(date).format('ddd')})`,
      sorter: (a, b) => a.date.localeCompare(b.date),
      defaultSortOrder: 'ascend',
    },
    { title: 'Title', dataIndex: 'title', sorter: (a, b) => a.title.localeCompare(b.title) },
    {
      title: 'Type',
      dataIndex: 'holiday_type',
      width: 190,
      render: (value) => <Tag color={holidayType(value).color}>{holidayType(value).label}</Tag>,
    },
    { title: 'Branches', key: 'branches', render: (_, record) => branchSummary(record) },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (value) => (Number(value) === 1 ? <Tag color='green'>Active</Tag> : <Tag>Inactive</Tag>),
    },
    {
      title: 'Actions',
      width: 100,
      render: (_, record) => (
        <RecordRowActions
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={() => openEdit(record)}
          onDelete={() => handleDelete(record.id)}
          deleteTitle='Delete this holiday?'
          deleteDescription='It is removed for every branch. Set it Inactive instead to keep the record.'
        />
      ),
    },
  ];

  const years = useMemo(() => {
    const set = new Set(items.map((h) => dayjs(h.date).year()));
    [-1, 0, 1].forEach((d) => set.add(dayjs().year() + d));
    return [...set].sort((a, b) => b - a).map((y) => ({ value: y, label: y }));
  }, [items]);

  return (
    <div>
      {error && <Alert type='error' showIcon title={error} style={{ marginBottom: 16 }} />}
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'calendar', label: 'Calendar', icon: <CalendarOutlined /> },
              { value: 'list', label: 'List', icon: <UnorderedListOutlined /> },
            ]}
          />
          {/* the Calendar header has its own year / month pickers */}
          {view === 'list' && (
            <Select
              value={month.year()}
              options={years}
              onChange={(y) => setMonth(month.year(y))}
              style={{ width: 100 }}
            />
          )}
          <Select
            allowClear
            placeholder='All types'
            value={typeFilter}
            onChange={(v) => setTypeFilter(v ?? null)}
            options={HOLIDAY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            style={{ width: 200 }}
          />
          <Select
            allowClear
            placeholder='All branches'
            value={branchFilter}
            onChange={(v) => setBranchFilter(v ?? null)}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: 220 }}
          />
          <Input.Search placeholder='Search title' allowClear onChange={(e) => setSearchText(e.target.value)} style={{ width: 200 }} />
          <Segmented
            value={showInactive ? 'all' : 'active'}
            onChange={(v) => setShowInactive(v === 'all')}
            options={[{ value: 'active', label: 'Active' }, { value: 'all', label: 'Incl. inactive' }]}
          />
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={refetch} loading={isLoading}>Refresh</Button>
          {canCreate && <Button type='primary' icon={<PlusOutlined />} onClick={() => openCreate()}>Create Holiday</Button>}
        </Space>
      </Space>

      {view === 'calendar' ? (
        <Card size='small' loading={isLoading && !items.length}>
          <Space size={[8, 4]} wrap style={{ marginBottom: 8 }}>
            {HOLIDAY_TYPES.map((t) => <Tag key={t.value} color={t.color}>{t.label}</Tag>)}
            {canCreate && <Typography.Text type='secondary'>Click a day to add a holiday there.</Typography.Text>}
          </Space>
          <Calendar
            value={month}
            onPanelChange={(date) => setMonth(date)}
            onSelect={(date, { source }) => {
              setMonth(date);
              if (source === 'date' && canCreate) openCreate(date);
            }}
            cellRender={(date, info) => {
              if (info.type === 'date') return (byDate[date.format('YYYY-MM-DD')] || []).map(holidayTag);
              if (info.type === 'month') {
                const count = filtered.filter((h) => dayjs(h.date).isSame(date, 'month')).length;
                return count ? <Tag color='red'>{count} holiday{count === 1 ? '' : 's'}</Tag> : null;
              }
              return info.originNode;
            }}
          />
        </Card>
      ) : (
        <Table
          rowKey='id'
          size='small'
          columns={columns}
          dataSource={yearRows}
          loading={isLoading}
          pagination={tablePagination(20)}
          title={() => `${month.year()}: ${yearRows.length} holiday${yearRows.length === 1 ? '' : 's'}`}
        />
      )}

      <HolidayCalendarFormModal
        open={modalOpen}
        holiday={editing}
        defaultDate={defaultDate}
        branches={branches}
        onClose={closeModal}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default HolidayCalendarIndex;

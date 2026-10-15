import { useEffect, useMemo, useState } from 'react';
import { Empty, Input, List, Spin, Tag, Typography, App } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import payrollAssistantApi from '../../services/payroll/payrollAssistantApi';
import handleApiError from '../../utils/handleApiError';
import AssistantTopicView from './AssistantTopicView';

// The Payroll Assistant (no AI): type the concern in your own words (English
// or Taglish) or browse the topics by category; a topic opens as a short
// question → answer walk-through. Shared by the top-bar panel and the
// Payroll Assistant page. `onNavigate` = a step's page link was opened.
const PayrollAssistantPanel = ({ onNavigate }) => {
  const { message } = App.useApp();
  const [options, setOptions] = useState({ categories: [], topics: [], cutoffs: [], checks: [] });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null); // null = browsing
  const [searching, setSearching] = useState(false);
  const [topicId, setTopicId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await payrollAssistantApi.options();
        setOptions(data);
      } catch (error) {
        handleApiError(error, message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [message]);

  const search = async (q) => {
    const text = q.trim();
    if (!text) { setResults(null); return; }
    setSearching(true);
    try {
      const { data } = await payrollAssistantApi.search(text);
      setResults(data.topics);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setSearching(false);
    }
  };

  const byCategory = useMemo(() => (options.categories || [])
    .map((c) => ({ category: c, topics: (options.topics || []).filter((t) => t.category === c) }))
    .filter((g) => g.topics.length), [options]);

  if (topicId) {
    return <AssistantTopicView topicId={topicId} options={options} onBack={() => setTopicId(null)} onNavigate={onNavigate} />;
  }

  const topicItem = (t) => (
    <List.Item style={{ cursor: 'pointer', padding: '8px 4px' }} onClick={() => setTopicId(t.id)}>
      <List.Item.Meta
        title={<span>{t.title} {t.check && <Tag color='blue' style={{ marginLeft: 4 }}>Check my case</Tag>}</span>}
        description={t.summary}
      />
    </List.Item>
  );

  return (
    <div>
      <Typography.Paragraph type='secondary' style={{ marginTop: 0 }}>
        <BulbOutlined /> Describe the concern in your own words — e.g. &quot;loan deducted twice&quot;, &quot;nagbayad cash sa loan&quot;, &quot;employee not in payroll&quot;.
      </Typography.Paragraph>
      <Input.Search
        allowClear
        enterButton='Ask'
        placeholder='What do you need to do?'
        value={query}
        onChange={(e) => { setQuery(e.target.value); if (!e.target.value) setResults(null); }}
        onSearch={search}
        loading={searching}
        style={{ marginBottom: 12 }}
      />
      {loading ? <div style={{ textAlign: 'center', padding: 30 }}><Spin /></div> : results ? (
        results.length ? (
          <List size='small' header={<Typography.Text strong>Best matches</Typography.Text>} dataSource={results} renderItem={topicItem} />
        ) : (
          <Empty description='No topic matches yet — try other words, or browse below. The payroll manager sees what was asked.' image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <a onClick={() => { setResults(null); setQuery(''); }}>Browse all topics</a>
          </Empty>
        )
      ) : (
        byCategory.map((g) => (
          <List key={g.category} size='small' header={<Typography.Text strong>{g.category}</Typography.Text>} dataSource={g.topics} renderItem={topicItem} style={{ marginBottom: 8 }} />
        ))
      )}
    </div>
  );
};

export default PayrollAssistantPanel;

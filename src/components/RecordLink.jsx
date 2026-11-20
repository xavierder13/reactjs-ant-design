import { Link } from 'react-router-dom';
import { Tooltip } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import './RecordLink.css';

// A record's identifier in a list (name, document no.) that opens that
// record: the theme's green with a dotted underline and a small chevron that
// slides on hover. `to` (+ `state`, e.g. { returnTo }) opens a page,
// `onClick` a drawer / modal; with neither it is plain text (the user can't
// open that record). Clicks don't bubble, so it can sit in a clickable row
// (rows use rowClassName "record-row--clickable" for the matching hover).
export default function RecordLink({ to, state, onClick, title = 'Open record', children }) {
  if (!to && !onClick) return children ?? null;

  const content = (
    <>
      <span className="record-link__text">{children}</span>
      <RightOutlined className="record-link__chevron" />
    </>
  );
  const stop = (e) => e.stopPropagation();

  return (
    <Tooltip title={title} mouseEnterDelay={0.5}>
      {to ? (
        <Link to={to} state={state} onClick={stop} className="record-link">{content}</Link>
      ) : (
        <span
          role="button"
          tabIndex={0}
          className="record-link"
          onClick={(e) => { stop(e); onClick(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stop(e); onClick(); } }}
        >
          {content}
        </span>
      )}
    </Tooltip>
  );
}

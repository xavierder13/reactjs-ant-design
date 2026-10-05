import { Button, Tooltip, theme } from 'antd';
import { RightOutlined } from '@ant-design/icons';

// Row expand toggle for AntD tables: a circled chevron that points right
// when collapsed and turns down (animated) when expanded — grey ring while
// closed, primary ring with a light fill while open. Rows that can't expand
// keep an empty slot of the same width so the column stays aligned.
// Use as `expandable={{ expandIcon: (props) => <ExpandIcon {...props} />, ... }}`.
const ExpandIcon = ({ expanded, onExpand, record, expandable = true }) => {
  const { token } = theme.useToken();

  if (!expandable) return <span style={{ display: 'inline-block', width: 24 }} />;

  return (
    <Tooltip title={expanded ? 'Hide details' : 'Show details'} mouseEnterDelay={0.4}>
      <Button
        size='small'
        shape='circle'
        color={expanded ? 'primary' : 'default'}
        variant={expanded ? 'filled' : 'outlined'}
        aria-expanded={expanded}
        aria-label={expanded ? 'Hide details' : 'Show details'}
        onClick={(e) => { e.stopPropagation(); onExpand(record, e); }}
        style={expanded ? { borderColor: token.colorPrimary } : { color: token.colorTextSecondary }}
        icon={(
          <RightOutlined
            style={{ fontSize: 12, transition: `transform ${token.motionDurationMid}`, transform: expanded ? 'rotate(90deg)' : 'none' }}
          />
        )}
      />
    </Tooltip>
  );
};

export default ExpandIcon;
